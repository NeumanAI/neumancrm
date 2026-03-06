

# Plan: Selector de Vertical / Organización para desarrollo paralelo

## Contexto
Actualmente tu usuario (`jogedu@gmail.com`) pertenece a una sola organización con vertical `real_estate`. Para desarrollar las 3 verticales en paralelo necesitas 3 organizaciones independientes (una por vertical) y un selector para cambiar entre ellas sin cerrar sesión.

## Cambios

### 1. Crear organizaciones y membresías (backend)
Ejecutar una migración que:
- Cree 2 nuevas organizaciones: **StarterCRM Dev** (`general`) y **Openmedic Dev** (`health`)
- Cree registros `team_members` vinculando tu `user_id` a cada nueva org como `admin`
- Renombre la org existente a **BitanAI Dev** para claridad

### 2. Actualizar `useTeam` para soportar múltiples organizaciones
- Cambiar la query de `current_team_member` para traer **todas** las membresías activas del usuario (no solo `.maybeSingle()`)
- Agregar estado `activeOrgId` persistido en `localStorage`
- Exponer función `switchOrganization(orgId)` que cambia el `activeOrgId` e invalida todos los queries
- Mantener compatibilidad: si solo hay 1 org, se usa automáticamente

### 3. Agregar Selector de Organización en Sidebar
- Nuevo componente `OrgSwitcher` en la parte superior del Sidebar (debajo del logo)
- Muestra el icono de la vertical + nombre de la org activa
- Al hacer clic, despliega dropdown con las otras organizaciones disponibles
- Al seleccionar otra, llama a `switchOrganization()` y recarga toda la data

### 4. Archivos afectados
- `src/hooks/useTeam.ts` — soporte multi-org
- `src/components/layout/Sidebar.tsx` — insertar `OrgSwitcher`
- `src/components/layout/OrgSwitcher.tsx` — nuevo componente
- Migración SQL — crear orgs y membresías

### Detalles técnicos
- El `localStorage` key será `active_organization_id`
- Al cambiar org, se invalidan queries: `current_team_member`, `organization`, `team_members`, y todos los queries de datos (contacts, opportunities, etc.)
- La función `get_user_organization_id()` de RLS seguirá funcionando porque devuelve la primera org activa; pero para el frontend, el filtro se hará por el `organization_id` del `currentMember` seleccionado
- **Importante**: `get_user_organization_id()` en RLS usa `LIMIT 1` — esto puede causar que el backend siempre devuelva datos de la misma org. Se necesitará evaluar si las queries del frontend filtran explícitamente por `organization_id` o dependen de la función RLS. Si dependen de RLS, se deberá ajustar la función para aceptar un parámetro o usar un claim.

### Consideración RLS
La función `get_user_organization_id()` hace `LIMIT 1` sin orden determinístico. Esto significa que las tablas que dependen de esta función en RLS podrían devolver datos de cualquiera de las 3 orgs. Para resolverlo:
- Opción A: Agregar una tabla `user_active_organization` que almacene la org activa del usuario, y que `get_user_organization_id()` la consulte
- Opción B: Usar `set_config` / `current_setting` para pasar el org_id como variable de sesión en cada request

**Opción A es más estable** — se crea una tabla pequeña y se actualiza la función RLS.

