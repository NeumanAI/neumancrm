

# Plan: Arquitectura Base de Verticales para NeumanCRM

Este prompt implementa la infraestructura para soportar 3 verticales de negocio (StarterCRM, BitanAI, Openmedic) sin modificar funcionalidad existente.

---

## Cambios a implementar

### 1. Migración SQL
- Agregar columna `industry_vertical` (TEXT, default `'general'`) a la tabla `organizations` con CHECK constraint
- Crear índice sobre `industry_vertical`
- Marcar organizaciones existentes con módulo `real_estate` activo como `industry_vertical = 'real_estate'`

### 2. Crear `src/config/verticals.ts`
- Archivo central con tipos `VerticalId`, `VerticalConfig`, `VerticalVocabulary`
- Configuración completa de las 3 verticales: `general` (StarterCRM), `real_estate` (BitanAI), `health` (Openmedic)
- Funciones helper: `getVerticalConfig()`, `getVerticalModules()`, `getAvailableVerticals()`

### 3. Crear `src/hooks/useVertical.ts`
- Hook que lee `industry_vertical` de la organización actual via `useTeam()`
- Retorna config de la vertical, vocabulario, brand name, flags (`isRealEstate`, `isHealth`, `isGeneral`)

### 4. Actualizar `src/hooks/useTeam.ts`
- Agregar `industry_vertical` a la interfaz `Organization` (línea ~37, entre `approved_by` y `settings`)

### 5. Actualizar `src/components/layout/AppLayout.tsx`
- Importar `useVertical`, obtener `verticalId`
- Pasar `verticalId` como prop al componente `Sidebar`

### 6. Actualizar `src/components/layout/Sidebar.tsx`
- Agregar `verticalId` a `SidebarProps`
- Mostrar badge de vertical en el footer del sidebar cuando no es `general`

### 7. Reemplazar `src/components/admin/ModulesDialog.tsx`
- Agregar selector visual de vertical (3 tarjetas: StarterCRM, BitanAI, Openmedic)
- Al cambiar vertical, auto-activar módulos correspondientes
- Guardar `industry_vertical` junto con `enabled_modules`
- Nueva prop `currentVertical`

### 8. Actualizar `src/pages/Admin.tsx`
- Agregar `vertical` al estado `modulesOrg` (línea 293)
- En `handleOpenModules`, leer `industry_vertical` de la org (línea 302-304)
- Pasar `currentVertical` al `ModulesDialog` (línea 644-651)

### 9. Actualizar `supabase/functions/process-onboarding-step/index.ts`
- En el bloque de actualización de organización (línea 292-302), agregar `industry_vertical`
- Después del update, si la vertical es `real_estate`, auto-activar módulos inmobiliarios

---

## Archivos afectados

| Archivo | Acción |
|---------|--------|
| Migración SQL | Crear (via herramienta de migración) |
| `src/config/verticals.ts` | **Crear** |
| `src/hooks/useVertical.ts` | **Crear** |
| `src/hooks/useTeam.ts` | Editar (agregar campo a interfaz) |
| `src/components/layout/AppLayout.tsx` | Editar (import + prop) |
| `src/components/layout/Sidebar.tsx` | Editar (prop + footer badge) |
| `src/components/admin/ModulesDialog.tsx` | Reemplazar completo |
| `src/pages/Admin.tsx` | Editar (3 puntos) |
| `supabase/functions/process-onboarding-step/index.ts` | Editar (2 puntos) |

---

## Nota importante
Este prompt solo crea la infraestructura. No cambia ninguna pantalla visible del usuario final. Los prompts 2 y 3 usarán esta base para personalizar cada vertical.

