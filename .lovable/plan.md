

# Plan: Activar Notificaciones Automáticas WhatsApp

## Estado actual
- La UI muestra 4 reglas con badge "Próximamente" y switches deshabilitados
- Ya existe `twilio-notify-team` edge function con templates para cada tipo
- Ya existe `check-notifications` edge function que crea notificaciones in-app
- Ya existe tabla `notification_preferences` con columnas `task_reminders`, `deal_updates`, `new_contacts`
- Los team_members tienen campo `whatsapp` para el número de cada asesor
- **Falta**: tabla para guardar qué reglas WhatsApp están activas por organización, lógica para enviar WhatsApp (no solo notificaciones in-app), y UI funcional con switches

## Cambios

### 1. Migración SQL — Tabla `whatsapp_notification_rules`
Nueva tabla para persistir el estado on/off de cada regla por organización:
- `id`, `organization_id`, `rule_id` (text: overdue_alert, deal_stale, new_lead, task_due), `is_active` (boolean), `created_at`, `updated_at`
- Unique constraint en `(organization_id, rule_id)`
- RLS: miembros de la org pueden leer, admins pueden modificar

### 2. Actualizar `check-notifications` edge function
Agregar lógica después de crear cada notificación in-app:
- Consultar `whatsapp_notification_rules` para ver si la regla está activa
- Si está activa, obtener el `whatsapp` del team_member correspondiente
- Llamar a `twilio-notify-team` con el tipo de notificación y datos relevantes
- Esto conecta el sistema de notificaciones existente con el envío WhatsApp

### 3. Actualizar `NotificationsTab.tsx`
- Quitar badges "Próximamente" y switches `disabled`
- Cargar estado de reglas desde `whatsapp_notification_rules`
- Toggle switches para activar/desactivar cada regla (upsert en la tabla)
- Mostrar estado "Activo" / "Inactivo" en vez de "Próximamente"

### 4. Actualizar `useTwilio.ts`
Agregar:
- Query para `whatsapp_notification_rules` filtrando por org del usuario
- Mutation `toggleNotificationRule` para upsert de regla activa/inactiva

### Archivos
| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Crear tabla `whatsapp_notification_rules` |
| `src/hooks/useTwilio.ts` | Agregar query y mutation de reglas |
| `src/components/messaging/NotificationsTab.tsx` | Switches funcionales |
| `supabase/functions/check-notifications/index.ts` | Enviar WhatsApp cuando regla activa |

