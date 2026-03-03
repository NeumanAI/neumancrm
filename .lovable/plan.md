

# Diagnóstico: Módulos no visibles después de activarlos

## El problema

Cuando guardas cambios en el diálogo de Módulos desde la página de Administración, solo se refresca la lista de organizaciones del panel Admin (`refetchOrgs`), pero **no se invalida la query `['organization']`** que usa `useTeam()`. El Sidebar, Dashboard y demás componentes leen de `useTeam()`, así que no ven los cambios hasta que recargues la página.

Además, los items "Openmedic" y "Nueva Consulta" en el Sidebar dependen de `isHealth` (que verifica `industry_vertical === 'health'`), no del módulo `clinical_notes`. Si solo activaste el toggle del módulo sin seleccionar la **vertical Openmedic** en la parte superior del diálogo, tampoco aparecerán.

## Solución

### Cambio 1: `ModulesDialog.tsx` — Invalidar queries de `useTeam`
- Importar `useQueryClient` de `@tanstack/react-query`
- En `handleSave`, después de guardar exitosamente, invalidar `['organization']` y `['current_team_member']` para que el Sidebar y toda la app reflejen los cambios sin recargar

### Cambio 2: `Sidebar.tsx` — Mostrar "Nueva Consulta" también por módulo
- Además de `isHealth`, mostrar los items de Openmedic/Consulta si `useHasModule('clinical_notes')` está activo, independientemente de la vertical seleccionada

### Cambio 3: `ContactDetail.tsx` — Misma lógica dual
- Ya usa `useHasModule('clinical_notes')` — verificar que funcione correctamente (probablemente ya está bien)

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/ModulesDialog.tsx` | Invalidar queries de useTeam tras guardar |
| `src/components/layout/Sidebar.tsx` | Mostrar items clínicos por módulo O por vertical |

