

# Plan: Acceso Directo a Cuentas de Clientes (Nuevo Metodo)

El enlace magico actual falla porque depende de redirecciones del servidor de autenticacion que no siempre apuntan al dominio correcto. La solucion es eliminar esa dependencia y verificar el token directamente en el frontend.

---

## Problema actual

La edge function genera un `action_link` que apunta al servidor de autenticacion. Ese enlace, al hacer clic, verifica el token y redirige al usuario. Pero la redireccion apunta al dominio base del proyecto de backend, no al dominio real de la app (neumancrm.lovable.app o iacrm.neumanai.com), por lo que el login no se completa correctamente.

---

## Solucion

En lugar de abrir un enlace externo, el sistema:

1. La edge function retorna el `token_hash` y el `email` (en vez de la URL)
2. El frontend abre una nueva pestana apuntando a una ruta interna: `/impersonate?token_hash=XXX&email=YYY`
3. Esa pagina llama a `supabase.auth.verifyOtp({ token_hash, type: 'magiclink', email })` directamente
4. Si la verificacion es exitosa, redirige al `/dashboard` ya autenticado como el admin del cliente

Esto elimina completamente la dependencia de URLs de redireccion externas.

---

## Archivos a modificar/crear

### 1. Modificar: `supabase/functions/impersonate-user/index.ts`

- En vez de retornar `properties.action_link`, retornar `properties.hashed_token` y el `email` del target
- Eliminar la construccion de la URL

### 2. Crear: `src/pages/Impersonate.tsx`

- Pagina que lee `token_hash` y `email` de los parametros de URL
- Llama a `supabase.auth.verifyOtp({ token_hash, type: 'magiclink', email })`
- Si tiene exito: redirige a `/dashboard`
- Si falla: muestra mensaje de error con boton para cerrar la pestana
- Muestra un spinner mientras verifica

### 3. Modificar: `src/hooks/useSuperAdmin.ts`

- Cambiar `impersonateOrg` para que abra `/impersonate?token_hash=XXX&email=YYY` en nueva pestana en vez de abrir `data.url`

### 4. Modificar: `src/App.tsx`

- Agregar ruta `/impersonate` apuntando a la nueva pagina

---

## Flujo completo

1. Super Admin hace clic en "Acceder" en el panel admin
2. Edge function genera token, lo retorna al frontend
3. Frontend abre nueva pestana: `/impersonate?token_hash=abc123&email=admin@cliente.com`
4. La pagina Impersonate verifica el token con la API de auth
5. Session queda establecida en esa pestana, redirige a `/dashboard`
6. Super Admin opera como el admin del cliente en esa pestana

