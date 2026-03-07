

# Plan: Portal de Clientes v2

Implementar un portal white-label donde los clientes finales de cada organización pueden ver su cartera, citas y documentos. El admin activa el portal desde Settings.

---

## Fase 1: Migración SQL

Crear tabla `client_portal_users` y 4 funciones SQL:
- **Tabla** `client_portal_users` con `user_id`, `contact_id`, `organization_id`, `is_blocked`, `last_login_at`, etc. Con RLS (usuario ve solo su registro, miembros del equipo ven/gestionan los de su org).
- **`verify_portal_email(p_org_slug, p_email)`** — verifica que el email existe en contacts de una org con portal activo, retorna si ya está registrado y si está bloqueado.
- **`get_portal_session(p_user_id)`** — retorna datos del contacto + branding de la org para el usuario logueado.
- **`register_portal_user(p_user_id, p_contact_id, p_organization_id)`** — vincula usuario Auth con contacto.
- **`update_portal_last_login(p_user_id)`** — actualiza timestamp de último acceso.

## Fase 2: Edge Function `portal-register`

Crear `supabase/functions/portal-register/index.ts`:
- Endpoint público (sin auth del CRM).
- Recibe `org_slug`, `email`, `password`.
- Verifica email vía `verify_portal_email`, crea usuario en Auth con `admin.createUser` (email_confirm: true), vincula con `register_portal_user`.
- Maneja caso de re-registro y usuario ya existente en Auth.

## Fase 3: Hook `useClientPortal`

Crear `src/hooks/useClientPortal.ts` con:
- **Cliente**: `usePortalSession()`, `usePortalContracts()`, `usePortalAppointments()`, `usePortalDocuments()`
- **Admin**: `usePortalSettings()` (toggle portal en `organizations.settings`), `usePortalUsers()` (lista + bloquear/desbloquear)

## Fase 4: Páginas del Portal (4 archivos nuevos)

| Archivo | Descripción |
|---------|-------------|
| `src/pages/portal/PortalLayout.tsx` | Layout con header (logo org), nav tabs (Cartera/Citas/Docs), footer. Aplica colores de la org. Maneja bloqueo y sesión no encontrada. |
| `src/pages/portal/PortalLogin.tsx` | Flujo: email → verificar → crear contraseña (primera vez) o login (ya registrado). Usa branding por slug. |
| `src/pages/portal/PortalCartera.tsx` | Contratos con resumen financiero, barra de progreso, plan de pagos detallado, alertas de mora. |
| `src/pages/portal/PortalCitas.tsx` | Próximas citas con fecha, hora, ubicación y link de reunión virtual. |
| `src/pages/portal/PortalDocumentos.tsx` | Documentos compartidos (`is_shared = true`) con botón para ver/descargar via `share_token`. |

## Fase 5: Panel de Settings

Crear `src/components/settings/PortalSettingsPanel.tsx`:
- Toggle activar/desactivar portal (guarda en `organizations.settings.portal_enabled`)
- URL del portal copiable
- Tabla de clientes registrados con botón bloquear/restaurar

## Fase 6: Integrar en Settings.tsx

- Agregar tab "Portal" con icono `Globe` en la lista de tabs
- Agregar `TabsContent` con `<PortalSettingsPanel />`

## Fase 7: Rutas en App.tsx

Agregar antes del catch-all:
- `/portal/login` → `PortalLogin` (sin layout)
- `/portal` → `PortalLayout` con rutas hijas: `cartera`, `citas`, `documentos`

---

## Archivos nuevos (7)

| Archivo | Tipo |
|---------|------|
| Migración SQL | Tabla + funciones |
| `supabase/functions/portal-register/index.ts` | Edge Function |
| `src/hooks/useClientPortal.ts` | Hook |
| `src/pages/portal/PortalLayout.tsx` | Página |
| `src/pages/portal/PortalLogin.tsx` | Página |
| `src/pages/portal/PortalCartera.tsx` | Página |
| `src/pages/portal/PortalCitas.tsx` | Página |
| `src/pages/portal/PortalDocumentos.tsx` | Página |
| `src/components/settings/PortalSettingsPanel.tsx` | Componente |

## Archivos modificados (2)

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar rutas del portal |
| `src/pages/Settings.tsx` | Agregar tab "Portal" |

