

# Plan: Sistema de Tipos de Contacto (Prospecto vs Comprador)

Diferenciar Prospectos de Compradores en todo el CRM. 4 fases basadas en los 4 prompts del documento.

---

## Fase 1 -- Migracion SQL

Una migracion que:

1. Agrega columna `contact_type TEXT NOT NULL DEFAULT 'prospecto'` a `contacts` con validacion via trigger (no CHECK constraint) para valores: prospecto, comprador, empresa, inactivo
2. Indice en `(organization_id, contact_type)`
3. Migracion automatica: marcar como `comprador` los contactos que ya tienen unidad asignada (`buyer_contact_id` en `real_estate_unit_types` con status Separado/Vendido)
4. **Nota:** Se omite la migracion de `portfolio_contracts` porque esa tabla no existe en la base de datos
5. Tabla `contact_type_history` con RLS (lectura para miembros org, escritura para roles activos)
6. Politicas RLS restrictivas en `contact_type_history`

---

## Fase 2 -- Hook, Tipos y UI del Listado (Prompt 2)

### Archivo nuevo: `src/lib/contactTypes.ts`
- Exportar `ContactType`, `CONTACT_TYPE_LABELS`, `CONTACT_TYPE_DESCRIPTIONS`, `CONTACT_TYPE_COLORS`, `CONTACT_TYPE_ICONS`

### Archivo: `src/types/crm.ts`
- Agregar `contact_type` al interface `Contact`

### Archivo: `src/hooks/useContacts.ts`
- Agregar filtro opcional `contactType` en `UseContactsOptions`
- Agregar `contact_type` al select query
- Agregar mutacion `convertContactType` que actualiza el tipo y registra en `contact_type_history`
- Actualizar `queryKey` para incluir tipo

### Archivo: `src/pages/Contacts.tsx`
- Agregar tabs de filtro por tipo (Todos / Prospecto / Comprador / Empresa / Inactivo) con conteos
- Badge de tipo junto al nombre en cada fila (solo si no es prospecto)

### Archivo: `src/pages/ContactDetail.tsx`
- Select editable inline junto al nombre para cambiar tipo
- Banner contextual para compradores (teal) e inactivos (gris con boton Reactivar)

---

## Fase 3 -- Conversion automatica en flujos (Prompt 3)

### Archivo: `src/pages/RealEstateProjectDetail.tsx`
- Despues de guardar unidad con `buyer_contact_id` y status != Disponible: verificar si el contacto es prospecto y mostrar toast con accion "Convertir a Comprador"

### Archivo: `src/pages/Pipeline.tsx`
- Cuando un deal se mueve a etapa "Ganado" (`is_closed_won`): verificar contacto y sugerir conversion via toast
- Agregar toggle para mostrar/ocultar deals de compradores convertidos
- Badge visual en cards de deals cuyo contacto es comprador

### Archivo: `src/hooks/useOpportunities.ts`
- Agregar `contact_type` al select de contactos en la query de oportunidades

### Archivo: `src/components/realestate/BuyerContactSearch.tsx`
- Excluir inactivos del search
- Mostrar badge de tipo en resultados
- Agregar `contact_type` al select

---

## Fase 4 -- AI Assistant actualizado (Prompt 4)

### Archivo: `supabase/functions/chat/index.ts`

**fetchCRMContext:**
- Agregar query de conteo por `contact_type`
- Incluir `contactSummary` en el retorno

**buildSystemPrompt:**
- Agregar seccion que explica la diferencia entre prospectos y compradores
- Reglas semanticas: "leads" = prospectos, "clientes" = compradores

**Tool `search_contacts`:**
- Agregar parametro `contact_type` a la definicion
- En `searchContactsAdvanced`: filtrar por tipo, excluir inactivos por defecto, mostrar tipo en resultados

**Nuevo tool `convert_contact_type`:**
- Definicion con parametros: contact_name_or_email, new_type, reason
- Handler que busca contacto, actualiza tipo, registra en historial

---

## Resumen de archivos

| Archivo | Accion |
|---------|--------|
| Migracion SQL | Crear |
| `src/lib/contactTypes.ts` | Crear |
| `src/types/crm.ts` | Modificar (agregar contact_type a Contact) |
| `src/hooks/useContacts.ts` | Modificar (filtro + mutacion convertContactType) |
| `src/pages/Contacts.tsx` | Modificar (tabs de tipo + badges) |
| `src/pages/ContactDetail.tsx` | Modificar (selector inline + banners) |
| `src/pages/RealEstateProjectDetail.tsx` | Modificar (toast conversion al asignar unidad) |
| `src/pages/Pipeline.tsx` | Modificar (toggle compradores + toast al ganar) |
| `src/hooks/useOpportunities.ts` | Modificar (agregar contact_type al select) |
| `src/components/realestate/BuyerContactSearch.tsx` | Modificar (excluir inactivos + badge tipo) |
| `supabase/functions/chat/index.ts` | Modificar (contexto + tool search + nuevo tool convert) |

No se requieren dependencias nuevas.

