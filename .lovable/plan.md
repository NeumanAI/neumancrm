

# Plan: Integración Twilio WhatsApp para NeumanCRM

## Resumen
Implementar mensajería WhatsApp vía Twilio con 3 capacidades: envío individual, campañas masivas (broadcast), y notificaciones automáticas al equipo. Incluye UI completa con página `/messaging` y configuración de credenciales.

## Cambios a realizar (12 pasos)

### 1. Migración SQL — Nuevas tablas
Crear 3 tablas con RLS + función auxiliar:
- `broadcast_campaigns` — campañas masivas con estado, contadores, filtros
- `broadcast_messages` — mensajes individuales por campaña con tracking de Twilio SID
- `whatsapp_templates` — templates aprobados por Meta/Twilio
- Función `increment_campaign_sent(campaign_id_param UUID)` para contadores atómicos
- RLS basada en `organization_id` vía `team_members`

**Nota**: Se usarán triggers de validación en vez de CHECK constraints para los campos `status`, `target_type` y `category`, evitando problemas de restauración.

### 2. Edge Function: `twilio-send-message`
Envío individual de WhatsApp vía API REST de Twilio. Obtiene credenciales de la tabla `integrations` (metadata con `account_sid_hash`, `auth_token_hash`, `whatsapp_number`). Registra en `conversation_messages` si hay `contact_id`.

### 3. Edge Function: `twilio-broadcast`
Procesa una campaña: itera `broadcast_messages` pendientes, envía secuencialmente con delay de 1s, actualiza contadores. Marca campaña como `completed` al terminar.

### 4. Edge Function: `twilio-notify-team`
Envía notificaciones WhatsApp a asesores. Soporta tipos: `overdue_alert`, `deal_stale`, `quota_warning`, `new_lead`, `task_due`, `custom`. Templates de mensaje hardcodeados en la función.

### 5. Modificar `save-integration-secret`
- Agregar `'twilio'` a `validProviders`
- Lógica especial para Twilio: parsear JSON con `account_sid`, `auth_token`, `whatsapp_number` y guardar cada campo codificado en base64 en metadata

### 6. Hook `useTwilio`
React hook con:
- Query de integración Twilio (estado, número)
- Query de campañas y templates
- Mutations: `configureTwilio`, `sendMessage`, `createCampaign`, `launchCampaign`

### 7. Página `Messaging`
Nueva página `/messaging` con 3 tabs:
- **Campañas masivas** — crear y lanzar broadcasts
- **Notificaciones automáticas** — configurar reglas (UI estática por ahora)
- **Configuración** — formulario de credenciales Twilio

### 8-10. Componentes UI
- `TwilioSettingsTab` — formulario Account SID / Auth Token / WhatsApp Number
- `BroadcastTab` — crear campañas con selección de contactos por tags, tabla de historial
- `NotificationsTab` — 4 reglas de notificación con switches (overdue, deal stale, new lead, task due)

### 11. Ruta y navegación
- Agregar ruta `/messaging` en `App.tsx`
- Agregar item "Mensajería" en `Sidebar.tsx` (después de Conversaciones, con icono `MessageSquare`)

### Archivos nuevos
| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/twilio-send-message/index.ts` | Envío individual |
| `supabase/functions/twilio-broadcast/index.ts` | Campañas masivas |
| `supabase/functions/twilio-notify-team/index.ts` | Notificaciones al equipo |
| `src/hooks/useTwilio.ts` | Hook de React |
| `src/pages/Messaging.tsx` | Página principal |
| `src/components/messaging/TwilioSettingsTab.tsx` | Config UI |
| `src/components/messaging/BroadcastTab.tsx` | Campañas UI |
| `src/components/messaging/NotificationsTab.tsx` | Notificaciones UI |

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `supabase/functions/save-integration-secret/index.ts` | Agregar soporte Twilio |
| `src/App.tsx` | Agregar ruta `/messaging` |
| `src/components/layout/Sidebar.tsx` | Agregar nav item "Mensajería" |

