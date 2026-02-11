
# Login AI-Native + Onboarding Conversacional + White-Label Mejorado

## Contexto

El proyecto ya cuenta con una base solida de autenticacion (Auth.tsx con login/signup/magic link/forgot password), branding white-label (BrandingContext + useBranding), y tabla `organizations` con campos de branding. El documento propone crear una tabla `tenants` paralela, pero esto duplicaria lo que ya existe en `organizations`. La estrategia sera **adaptar e integrar** sobre la arquitectura existente en lugar de crear sistemas paralelos.

## Alcance

1. **Redisenar la pagina de Login** con layout split (branding a la izquierda, formulario a la derecha) y soporte visual white-label dinamico
2. **Onboarding conversacional con IA** para nuevos usuarios (5 pasos guiados)
3. **Tabla `onboarding_progress`** para tracking del progreso
4. **Edge function `process-onboarding-step`** que usa Lovable AI para procesar cada paso
5. **Pagina de Onboarding** con interfaz de chat conversacional
6. **Integracion en el flujo de la app** - redirigir a onboarding si no esta completado

## Lo que NO se hara (ya existe o es redundante)

- No se creara tabla `tenants` (se usa `organizations` existente con sus campos de branding)
- No se creara tabla `magic_links` (Supabase Auth ya maneja magic links nativamente via `signInWithOtp`)
- No se creara tabla `domain_verifications` (ya existe `organization_domains`)
- No se creara `TenantContext` (ya existe `BrandingContext` que cumple la misma funcion)
- No se crearan edge functions `send-magic-link` ni `verify-magic-link` (magic links ya funcionan con Supabase Auth nativo)

---

## Detalles Tecnicos

### 1. Migracion SQL

Crear tabla `onboarding_progress`:

```text
onboarding_progress
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- organization_id (uuid, nullable)
- current_step (integer, default 0)
- total_steps (integer, default 5)
- completed (boolean, default false)
- collected_data (jsonb, default '{}')
- conversation_history (jsonb, default '[]')
- started_at (timestamptz, default now())
- completed_at (timestamptz, nullable)
- last_interaction_at (timestamptz, default now())
```

Con RLS: usuarios solo acceden a sus propios registros.

### 2. Edge Function: `process-onboarding-step`

- Recibe `session_id`, `user_input`, `current_step`
- Usa Lovable AI (`google/gemini-2.5-flash`) para procesar respuestas del usuario
- Flujo de 5 pasos: nombre preferido, empresa, tamano de equipo, industria, datos de ejemplo
- Actualiza `onboarding_progress` en cada paso
- Al completar, marca `onboarding_completed` en user metadata

### 3. Pagina de Login rediseñada (`src/pages/Auth.tsx`)

- Layout split: panel izquierdo con gradiente de marca y features, panel derecho con formulario
- Branding dinamico via `useBrandingContext()` existente
- Mantiene funcionalidad actual: email/password, magic link, forgot password, dev login
- Responsive: en movil se muestra solo el formulario con logo

### 4. Pagina de Onboarding (`src/pages/Onboarding.tsx`)

- Interfaz de chat conversacional
- Barra de progreso visual (paso X de 5)
- Chips de sugerencia rapida para respuestas comunes
- Animaciones con framer-motion
- Al completar, redirige al dashboard

### 5. Hook `useOnboarding`

- Carga/crea progreso de onboarding
- Envia mensajes al edge function
- Gestiona estado de carga y conversacion

### 6. Integracion en AppLayout

- Verificar si el usuario ha completado onboarding
- Si no, redirigir a `/onboarding`
- Usar `user.user_metadata.onboarding_completed` como flag

### 7. Ruta en App.tsx

- Agregar ruta `/onboarding` protegida (requiere auth, sin AppLayout)

### Archivos a crear
1. `supabase/functions/process-onboarding-step/index.ts`
2. `src/pages/Onboarding.tsx`
3. `src/hooks/useOnboarding.ts`

### Archivos a modificar
1. `src/pages/Auth.tsx` - Rediseno visual con layout split
2. `src/App.tsx` - Agregar ruta `/onboarding`
3. `src/components/layout/AppLayout.tsx` - Verificar onboarding completado
