

# Plan: Acceso Directo a Cuentas de Clientes (Impersonacion para Super Admin)

Permitir que los Super Admins accedan directamente a cualquier cuenta de cliente desde el panel de administracion, sin necesidad de pedir credenciales.

---

## Como funciona

1. En el panel Admin, cada organizacion tendra un boton "Acceder como admin"
2. Al hacer clic, se llama a una edge function que genera un enlace de acceso temporal
3. El enlace abre una nueva pestana del navegador donde el Super Admin queda autenticado como el admin de esa organizacion
4. Se registra la accion en el audit log para trazabilidad

---

## Componentes a crear/modificar

### 1. Edge Function: `supabase/functions/impersonate-user/index.ts`

- Recibe `organization_id` en el body
- Verifica que el caller sea Super Admin (consulta tabla `super_admins`)
- Busca el admin activo de la organizacion objetivo en `team_members`
- Usa `supabase.auth.admin.generateLink({ type: 'magiclink', email })` para generar un enlace de acceso
- Registra la impersonacion en `audit_log`
- Retorna la URL de acceso

### 2. Modificar: `src/pages/Admin.tsx`

- Agregar boton "Acceder" (icono LogIn) en cada fila de organizacion, junto a los botones existentes de editar/modulos
- Al hacer clic: llamar a la edge function, abrir el link en nueva pestana
- Mostrar toast de confirmacion

### 3. Modificar: `src/hooks/useSuperAdmin.ts`

- Agregar mutacion `impersonateOrg` que invoca la edge function `impersonate-user`

### 4. Configuracion: `supabase/config.toml`

- Agregar entrada para `impersonate-user` con `verify_jwt = false` (la verificacion se hace manualmente en el codigo)

---

## Seguridad

- Solo Super Admins pueden usar esta funcion (verificado server-side via tabla `super_admins`)
- Cada uso queda registrado en `audit_log` con tipo `impersonate`
- El enlace generado es de un solo uso (comportamiento por defecto de magic links)
- No se almacenan credenciales ni tokens persistentes

---

## Resumen de archivos

| Archivo | Accion |
|---------|--------|
| `supabase/functions/impersonate-user/index.ts` | Crear |
| `src/hooks/useSuperAdmin.ts` | Modificar (agregar mutacion impersonateOrg) |
| `src/pages/Admin.tsx` | Modificar (agregar boton "Acceder" en cada fila) |

