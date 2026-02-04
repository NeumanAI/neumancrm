
# Plan: Auto-Captura + Notificaciones + Tools Avanzados

## Resumen Ejecutivo

Implementar tres sistemas complementarios para el CRM:
1. **Parte A**: Auto-Captura de Emails y WhatsApp mediante integraciones en Settings
2. **Parte B**: Sistema de Notificaciones Inteligentes con centro de notificaciones
3. **Parte C**: 7 Tools adicionales para el Chat IA

Todo sin modificar el codigo existente (chat, paginas, layout, hooks).

---

## Fase 1: Base de Datos (Nuevas Tablas)

### Tablas Requeridas

| Tabla | Proposito |
|-------|-----------|
| `integrations` | Estado de conexiones Gmail/WhatsApp |
| `email_sync_logs` | Historial de emails procesados |
| `notifications` | Centro de notificaciones del usuario |
| `notification_preferences` | Configuracion de alertas |

### Estructura SQL

```sql
-- Integraciones externas
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'gmail', 'whatsapp'
  is_active BOOLEAN DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  last_synced_at TIMESTAMP,
  sync_status TEXT, -- 'idle', 'syncing', 'error'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Notificaciones
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'task_due', 'deal_update', 'new_contact', 'email_sync'
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT, -- 'contact', 'company', 'opportunity', 'task'
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Preferencias de notificaciones
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  task_reminders BOOLEAN DEFAULT true,
  deal_updates BOOLEAN DEFAULT true,
  new_contacts BOOLEAN DEFAULT true,
  email_sync BOOLEAN DEFAULT true,
  browser_notifications BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT false,
  reminder_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Fase 2: Estructura de Archivos Nuevos

```text
src/
├── components/
│   ├── settings/
│   │   └── IntegrationsTab.tsx        # NUEVA - Tab de integraciones
│   └── notifications/
│       ├── NotificationCenter.tsx      # NUEVA - Panel de notificaciones
│       ├── NotificationBell.tsx        # NUEVA - Icono campana con badge
│       ├── NotificationItem.tsx        # NUEVA - Item individual
│       └── NotificationPreferences.tsx # NUEVA - Config de notificaciones
├── hooks/
│   ├── useIntegrations.ts              # NUEVO - Hook para integraciones
│   ├── useNotifications.ts             # NUEVO - Hook para notificaciones
│   └── useNotificationPreferences.ts   # NUEVO - Hook para preferencias
├── types/
│   └── integrations.ts                 # NUEVO - Tipos de integraciones
supabase/functions/
├── gmail-auth/index.ts                 # NUEVO - OAuth con Gmail
├── gmail-callback/index.ts             # NUEVO - Callback OAuth
├── process-emails/index.ts             # NUEVO - Procesa emails con IA
├── ingest-whatsapp-conversation/       # NUEVO - Webhook WhatsApp
├── check-notifications/index.ts        # NUEVO - Genera notificaciones
└── chat/index.ts                       # MODIFICAR - Anadir 7 tools
```

---

## Fase 3: Parte A - Integraciones en Settings

### IntegrationsTab.tsx

Componente para gestionar conexiones:

```text
+----------------------------------------------------------+
| GMAIL                                    [No conectado]   |
| Captura automatica de emails cada 5 minutos              |
|                                                           |
| Al conectar Gmail:                                        |
| * Extrae contactos y empresas mencionadas                |
| * Detecta oportunidades de venta                         |
| * Identifica tareas y compromisos                        |
|                                                           |
| [Conectar Gmail]                                          |
+----------------------------------------------------------+
| WHATSAPP                                 [No conectado]   |
| Captura de conversaciones desde tu plataforma            |
|                                                           |
| Webhook URL: .../functions/v1/ingest-whatsapp            |
| Metodo: POST                                              |
|                                                           |
| [Habilitar WhatsApp]                                      |
+----------------------------------------------------------+
```

### Edge Functions para Gmail

**gmail-auth**: Genera URL de OAuth de Google
- Usa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
- Scopes: gmail.readonly, gmail.labels

**gmail-callback**: Recibe tokens de Google
- Guarda access_token y refresh_token en `integrations`
- Activa sincronizacion

**process-emails**: Ejecuta cada 5 min (cron) o manual
- Lee emails nuevos via Gmail API
- Usa IA para extraer: contactos, empresas, tareas, oportunidades
- Crea registros en CRM
- Registra en timeline

### Webhook WhatsApp

**ingest-whatsapp-conversation**:
- Recibe conversaciones via POST
- Valida API key en header
- Procesa con IA para extraer datos
- Crea/actualiza contactos

---

## Fase 4: Parte B - Sistema de Notificaciones

### Componentes UI

**NotificationBell.tsx** (para Header):
```text
[Campana con badge rojo: 3]
```

**NotificationCenter.tsx** (Dropdown):
```text
+----------------------------------+
| Notificaciones            [Mark all]|
+----------------------------------+
| * Tarea vence hoy                |
|   "Llamar a Juan Perez"          |
|   Hace 2 horas                   |
+----------------------------------+
| * Nuevo contacto desde email     |
|   Ana Garcia se agrego           |
|   Hace 5 horas                   |
+----------------------------------+
| Ver todas ->                     |
+----------------------------------+
```

**NotificationPreferences.tsx** (en Settings):
```text
+------------------------------------------+
| Preferencias de Notificaciones           |
+------------------------------------------+
| [x] Recordatorios de tareas              |
| [x] Actualizaciones de oportunidades     |
| [x] Nuevos contactos importados          |
| [x] Sincronizacion de emails             |
+------------------------------------------+
| Recordar tareas con: [24] horas antes    |
+------------------------------------------+
```

### Hook useNotifications

```typescript
// Funcionalidades:
- Listar notificaciones no leidas
- Marcar como leida
- Marcar todas como leidas
- Contador para badge
- Suscripcion realtime para actualizaciones
```

### Edge Function check-notifications

Ejecuta cada 15 minutos (cron):
1. Busca tareas que vencen pronto
2. Busca oportunidades actualizadas
3. Crea notificaciones en tabla
4. (Opcional) Envia push/email

---

## Fase 5: Parte C - 7 Tools Adicionales para Chat

### Tools a Agregar en chat/index.ts

| Tool | Descripcion |
|------|-------------|
| `create_opportunity` | Crear nueva oportunidad de venta |
| `update_opportunity_stage` | Mover deal a otra etapa |
| `search_contacts` | Buscar contactos por nombre/email |
| `search_companies` | Buscar empresas por nombre/dominio |
| `get_pipeline_summary` | Resumen del pipeline actual |
| `schedule_meeting` | Crear reunion/tarea tipo meeting |
| `add_note` | Agregar nota a contacto/empresa |

### Definiciones de Tools

```typescript
// create_opportunity
{
  name: "create_opportunity",
  description: "Crea una nueva oportunidad de venta",
  parameters: {
    title: { type: "string", required: true },
    value: { type: "number" },
    company_name: { type: "string" },
    contact_email: { type: "string" },
    expected_close_date: { type: "string" }
  }
}

// update_opportunity_stage
{
  name: "update_opportunity_stage",
  description: "Mueve una oportunidad a otra etapa del pipeline",
  parameters: {
    opportunity_title: { type: "string" },
    new_stage: { type: "string" } // "Contacto", "Propuesta", etc.
  }
}

// search_contacts
{
  name: "search_contacts",
  description: "Busca contactos por nombre o email",
  parameters: {
    query: { type: "string", required: true }
  }
}

// search_companies
{
  name: "search_companies", 
  description: "Busca empresas por nombre o dominio",
  parameters: {
    query: { type: "string", required: true }
  }
}

// get_pipeline_summary
{
  name: "get_pipeline_summary",
  description: "Obtiene resumen del pipeline con valor por etapa",
  parameters: {}
}

// schedule_meeting
{
  name: "schedule_meeting",
  description: "Programa una reunion con un contacto",
  parameters: {
    title: { type: "string", required: true },
    contact_email: { type: "string" },
    date: { type: "string" },
    time: { type: "string" },
    description: { type: "string" }
  }
}

// add_note
{
  name: "add_note",
  description: "Agrega una nota a un contacto o empresa",
  parameters: {
    entity_type: { type: "string" }, // "contact" o "company"
    entity_identifier: { type: "string" }, // email o nombre
    note_content: { type: "string", required: true }
  }
}
```

---

## Fase 6: Modificaciones Minimas a Archivos Existentes

### Settings.tsx
- Reemplazar tab "Integraciones" estatico con `<IntegrationsTab />`

### Header.tsx  
- Agregar `<NotificationBell />` antes del menu de usuario

### config.toml
- Agregar nuevas edge functions

---

## Orden de Implementacion

| Paso | Tarea |
|------|-------|
| 1 | Crear migracion SQL para tablas nuevas |
| 2 | Crear tipos TypeScript en `src/types/integrations.ts` |
| 3 | Crear hooks: `useIntegrations`, `useNotifications`, `useNotificationPreferences` |
| 4 | Crear componente `IntegrationsTab.tsx` |
| 5 | Crear componentes de notificaciones |
| 6 | Crear edge functions de Gmail |
| 7 | Crear edge function de WhatsApp |
| 8 | Crear edge function de notificaciones |
| 9 | Modificar `chat/index.ts` para agregar 7 tools |
| 10 | Integrar componentes en Settings y Header |

---

## Secrets Necesarios

Para Gmail OAuth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## Consideraciones Tecnicas

1. **RLS** en todas las tablas nuevas - usuarios solo ven sus datos
2. **Realtime** habilitado en `notifications` para actualizaciones en vivo
3. **Cron jobs** para process-emails (cada 5 min) y check-notifications (cada 15 min)
4. **Error handling** robusto en edge functions
5. **Validacion** de webhook WhatsApp con API key
6. **Token refresh** automatico para Gmail
