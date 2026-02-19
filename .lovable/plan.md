
# Sistema de Pricing & Control de Consumos — NeumanCRM

## Qué se va a construir

Un sistema completo de planes y facturación manual (sin Stripe) que permite al super admin activar planes para organizaciones, a los resellers fijar precios libres a sus sub-clientes, y a cada organización ver su consumo real de IA en tiempo real.

## Alcance total

### Base de datos (1 migración)
5 tablas nuevas + 3 funciones SQL + datos iniciales de 6 planes + RLS:

- **`plan_catalog`** — Catálogo maestro de planes (editable por super admin). 6 planes preconfigurados: CRM Base, Agente Starter, Agente Professional, Essential, Growth (destacado), Complete.
- **`organization_subscriptions`** — Una suscripción activa por organización. Estados: `trial`, `active`, `suspended`, `cancelled`, `expired`.
- **`organization_pricing`** — Precios y límites custom por organización (para white-label markup libre).
- **`usage_records`** — Snapshot mensual de consumo (IA, usuarios, contactos, storage).
- **`usage_events`** — Log granular append-only de cada evento.

**Funciones SQL:**
- `get_effective_plan_limits(org_id)` → devuelve límites reales (custom si existe, catálogo si no)
- `get_current_usage(org_id)` → consumo real del mes en curso + flag `can_use_ai`
- `increment_ai_usage(org_id)` → verifica y registra cada uso de IA, retorna `false` si el límite fue alcanzado

### Archivos nuevos (6)

| Archivo | Descripción |
|---|---|
| `src/hooks/usePricing.ts` | Hook maestro: tipos, lecturas, mutaciones |
| `src/components/billing/BillingTab.tsx` | Tab "Plan & Consumo" en Settings |
| `src/components/billing/index.ts` | Barrel export |
| `src/components/admin/PricingAdminPanel.tsx` | Panel super admin: suscripciones + catálogo |
| `src/components/reseller/ResellerPricingPanel.tsx` | Panel reseller: activar planes + precio libre |
| `supabase/migrations/[timestamp]_pricing_system.sql` | Migración completa |

### Archivos modificados (5)

| Archivo | Cambio |
|---|---|
| `src/pages/Admin.tsx` | +tab "Pricing & Billing" (import `DollarSign` + `PricingAdminPanel`) |
| `src/pages/Settings.tsx` | +tab "Plan & Consumo" (import `CreditCard` + `BillingTab`) |
| `src/pages/ResellerAdmin.tsx` | +tab "Planes de clientes" (import `DollarSign` + `ResellerPricingPanel`) |
| `supabase/functions/chat/index.ts` | Verificación de límites antes de llamar a la IA (lines 3120-3121) |
| `src/contexts/ChatContext.tsx` | Manejo del error 429 con toast descriptivo |

## Flujo de control de IA

Cada vez que un usuario envía un mensaje al asistente IA:

1. La edge function obtiene el `organization_id` del `user_id`
2. Llama a `get_current_usage(org_id)` → obtiene `can_use_ai`
3. Si `can_use_ai = false` → retorna HTTP 429 con mensaje claro
4. Si puede usar → llama a `increment_ai_usage(org_id)` de forma no bloqueante (async)
5. El frontend detecta 429 y muestra toast de error en lugar de crashear

## Planes iniciales (precios en USD)

| Plan | Tipo | Precio/mes | Usuarios | Conv. IA/mes |
|---|---|---|---|---|
| CRM Base | Individual | $79 | 5 | 0 (sin IA) |
| Agente Starter | Individual | $79 | 1 | 1,000 |
| Agente Professional | Individual | $199 | 1 | 5,000 |
| Essential | Bundle | $134 | 5 | 1,000 |
| **Growth** | **Bundle** | **$228** | **10** | **5,000** |
| Complete | Bundle | $286 | 20 | 5,000 |

## Puntos clave del diseño

- **Sin Stripe**: toda activación es manual por super admin o reseller
- **Markup libre para resellers**: `organization_pricing` permite cualquier precio sobre el catálogo
- **El CRM nunca se bloquea**: solo el chat de IA se limita; contactos, pipeline, tareas siempre disponibles
- **Refresco automático**: `useCurrentUsage` se auto-actualiza cada 60 segundos
- **Precios custom**: si existe `organization_pricing` para la org, sobreescribe el catálogo completamente
- **Accounts sin suscripción**: la función SQL devuelve defaults de prueba (3 usuarios, 100 conv. IA, 14 días trial) sin crashear

## Ubicación de los cambios en Admin.tsx

El tab "Pricing & Billing" se agrega después del tab "Dominios" existente en la `<TabsList>`, y su `<TabsContent>` después del último `<TabsContent>` existente.

## Ubicación del corte en chat/index.ts

En la línea 3120-3121 del archivo actual:
```typescript
console.log("Chat request - user:", userId, ...);
const crmContext = await fetchCRMContext(supabase, userId); // ← ENTRE estas dos líneas
```
El bloque de verificación de límites se inserta exactamente ahí.
