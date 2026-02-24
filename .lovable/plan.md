

# Plan: Crear miembros del equipo directamente con contraseña

## Resumen

Crear una edge function `create-team-member` que use la Admin API para crear usuarios con email + contraseña directamente, sin necesidad de enviar invitación por correo. Se añadirá un nuevo diálogo `CreateMemberDialog` que reemplazará/complementará el flujo actual de invitación.

## Arquitectura

```text
Admin (UI) → CreateMemberDialog (email, nombre, contraseña, rol)
  → Edge Function: create-team-member
    → supabase.auth.admin.createUser(email, password, email_confirm: true)
    → INSERT team_members (user_id, org_id, role, email, full_name, is_active: true)
    → Response: { success, user_id }
```

## Implementación

### Paso 1: Edge Function `create-team-member`

Archivo: `supabase/functions/create-team-member/index.ts`

- Verifica que el caller sea admin de su organización (via JWT + query a team_members)
- Recibe: `{ email, password, fullName, role }`
- Usa `adminClient.auth.admin.createUser()` con `email_confirm: true` para crear el usuario sin enviar email
- Inserta en `team_members` con `is_active: true`, `user_id` del usuario creado, y la `organization_id` del caller
- Maneja el caso donde el email ya existe: vincula el usuario existente al equipo
- Valida que no se exceda `max_users` de la organización

Config en `supabase/config.toml`:
```toml
[functions.create-team-member]
verify_jwt = false
```

### Paso 2: Componente `CreateMemberDialog`

Archivo: `src/components/team/CreateMemberDialog.tsx`

- Formulario con: Email, Nombre completo, Contraseña, Confirmar contraseña, Rol (select)
- Validación de contraseña mínima (6 caracteres) y que coincidan
- Llama a la edge function via `supabase.functions.invoke('create-team-member', ...)`
- Invalida queries de `team_members` al completar

### Paso 3: Actualizar página Team

En `src/pages/Team.tsx`:
- Importar `CreateMemberDialog`
- Añadir estado para el nuevo diálogo
- Cambiar el botón "Invitar Miembro" por un dropdown con dos opciones:
  - "Crear Miembro" (nuevo flujo directo)
  - "Invitar por Email" (flujo existente)

### Archivos a crear/modificar

1. **Crear**: `supabase/functions/create-team-member/index.ts`
2. **Crear**: `src/components/team/CreateMemberDialog.tsx`
3. **Modificar**: `src/pages/Team.tsx` — añadir dropdown y nuevo diálogo
4. **Modificar**: `supabase/config.toml` — añadir config de la nueva función

### Sección técnica

La edge function usa `supabase.auth.admin.createUser` con `email_confirm: true` para que el usuario pueda iniciar sesión inmediatamente sin verificación por correo. El trigger existente `handle_new_user_organization` podría interferir creando una organización duplicada, así que la edge function primero crea el usuario con la Admin API, luego elimina cualquier organización/team_member auto-creado por el trigger, y finalmente inserta el team_member correcto vinculado a la organización del admin que lo invita.

Alternativa más limpia: crear el `team_member` con `pending_email` ANTES de crear el usuario auth — así el trigger `link_team_member_on_registration` lo vincula automáticamente y `handle_new_user_organization` detecta que ya tiene team_member y no crea org duplicada. Sin embargo, `handle_new_user_organization` no hace esa verificación actualmente — siempre crea una org nueva si no hay `pending_admin_email`. Por lo tanto, la edge function deberá:

1. Insertar `team_member` con `pending_email` y sin `user_id`
2. Crear usuario auth con `admin.createUser`
3. El trigger `link_team_member_on_registration` vincula el team_member
4. El trigger `handle_new_user_organization` crea una org extra → la edge function la elimina después
5. O mejor: la edge function borra la org auto-creada y el team_member auto-creado, dejando solo el correcto

Para evitar complejidad, el approach más seguro es:
1. Crear usuario auth
2. Esperar a que los triggers se ejecuten
3. Limpiar: borrar el team_member y org auto-creados
4. Insertar el team_member correcto

