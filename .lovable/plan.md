

# Plan: Modulo de Conversaciones Omnicanal

## Vision General

Implementar un centro de comunicaciones unificado que permita a los usuarios ver, interactuar y gestionar conversaciones de multiples canales (Webchat, WhatsApp/ManyChat, Instagram) desde una sola interfaz dentro del CRM.

---

## Arquitectura del Sistema

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           CANALES DE ENTRADA                                    │
├───────────────┬───────────────┬───────────────┬───────────────┬───────────────┤
│   WEBCHAT     │   WHATSAPP    │   INSTAGRAM   │     EMAIL     │    FUTURO     │
│  (Widget)     │  (ManyChat)   │  (ManyChat)   │   (Gmail)     │   (SMS, etc)  │
└───────┬───────┴───────┬───────┴───────┬───────┴───────┬───────┴───────────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                        EDGE FUNCTIONS (WEBHOOKS)                                │
├───────────────┬───────────────┬───────────────┬───────────────────────────────┤
│  n8n-chat     │manychat-webhook│ instagram-    │    process-emails             │
│  (nuevo)      │   (nuevo)     │ webhook       │    (existente)                │
│               │               │  (nuevo)      │                               │
└───────┬───────┴───────┬───────┴───────┬───────┴───────┬───────────────────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                        TABLAS DE CONVERSACIONES                                 │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────────────────┐     ┌─────────────────────────────────────────┐  │
│  │   conversations         │     │   conversation_messages                  │  │
│  │                         │     │                                          │  │
│  │  - id                   │     │  - id                                    │  │
│  │  - user_id              │◄────│  - conversation_id                       │  │
│  │  - contact_id (FK)      │     │  - content                               │  │
│  │  - channel              │     │  - is_from_contact                       │  │
│  │  - external_id          │     │  - message_type (text/image/file)        │  │
│  │  - status               │     │  - metadata                              │  │
│  │  - assigned_to          │     │  - created_at                            │  │
│  │  - unread_count         │     │                                          │  │
│  │  - last_message_at      │     └─────────────────────────────────────────┘  │
│  │  - metadata             │                                                   │
│  └─────────────────────────┘                                                   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                           │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                     /conversations                                        │ │
│  │  ┌────────────────┬───────────────────────────────────────────────────┐  │ │
│  │  │  SIDEBAR       │              CHAT VIEW                             │  │ │
│  │  │                │                                                    │  │ │
│  │  │ ┌────────────┐ │  ┌──────────────────────────────────────────────┐ │  │ │
│  │  │ │ Filtros    │ │  │  Header: Contacto + Canal + Asignar         │ │  │ │
│  │  │ │ - Canal    │ │  ├──────────────────────────────────────────────┤ │  │ │
│  │  │ │ - Estado   │ │  │                                              │ │  │ │
│  │  │ │ - Asignado │ │  │     Mensajes en burbujas                     │ │  │ │
│  │  │ └────────────┘ │  │     (con timestamps y estado)                │ │  │ │
│  │  │                │  │                                              │ │  │ │
│  │  │ ┌────────────┐ │  │                                              │ │  │ │
│  │  │ │ Conv 1     │ │  ├──────────────────────────────────────────────┤ │  │ │
│  │  │ │ WA - Juan  │ │  │  Input: Responder / Notas internas          │ │  │ │
│  │  │ ├────────────┤ │  │  + Adjuntar + Templates                     │ │  │ │
│  │  │ │ Conv 2     │ │  └──────────────────────────────────────────────┘ │  │ │
│  │  │ │ Web - Ana  │ │                                                    │  │ │
│  │  │ └────────────┘ │  ┌──────────────────────────────────────────────┐ │  │ │
│  │  │                │  │  Panel lateral: Info contacto + Acciones     │ │  │ │
│  │  └────────────────┴──┴──────────────────────────────────────────────┘ │  │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Esquema de Base de Datos

### Nuevas Tablas

| Tabla | Descripcion |
|-------|-------------|
| `conversations` | Sesiones de conversacion por canal y contacto |
| `conversation_messages` | Mensajes individuales dentro de cada conversacion |

### Estructura de conversations

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | Identificador unico |
| user_id | uuid | Propietario del CRM |
| organization_id | uuid | Organizacion (multi-tenant) |
| contact_id | uuid | Contacto vinculado (opcional, se puede vincular despues) |
| channel | text | 'webchat', 'whatsapp', 'instagram', 'email', 'messenger' |
| external_id | text | ID externo (session_id, subscriber_id, etc.) |
| external_name | text | Nombre del visitante/suscriptor |
| external_email | text | Email si disponible |
| external_phone | text | Telefono si disponible |
| external_avatar | text | URL del avatar |
| status | text | 'open', 'pending', 'resolved', 'archived' |
| assigned_to | uuid | Miembro del equipo asignado |
| unread_count | int | Mensajes no leidos |
| last_message_at | timestamptz | Ultimo mensaje |
| last_message_preview | text | Preview del ultimo mensaje |
| metadata | jsonb | Datos adicionales del canal |
| created_at | timestamptz | Fecha creacion |
| updated_at | timestamptz | Fecha actualizacion |

### Estructura de conversation_messages

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | Identificador unico |
| conversation_id | uuid | FK a conversations |
| content | text | Contenido del mensaje |
| is_from_contact | boolean | true = cliente, false = agente/bot |
| sender_name | text | Nombre del remitente |
| message_type | text | 'text', 'image', 'file', 'audio', 'video' |
| attachment_url | text | URL del archivo adjunto si aplica |
| is_bot | boolean | Si fue respuesta automatica |
| is_internal_note | boolean | Notas internas (no visibles al cliente) |
| read_at | timestamptz | Cuando fue leido |
| metadata | jsonb | Datos adicionales |
| created_at | timestamptz | Fecha creacion |

### Politicas RLS

- Filtrar por `user_id` o `organization_id` segun arquitectura multi-tenant
- Permitir a miembros del equipo ver conversaciones de su organizacion

---

## Parte 2: Edge Functions

### 2.1 n8n-chat (Webchat)

Procesa mensajes del widget de chat flotante y los almacena en el modelo unificado.

**Flujo:**
1. Recibe mensaje del widget
2. Busca o crea conversacion por session_id
3. Guarda mensaje del usuario
4. Llama a n8n para obtener respuesta
5. Guarda respuesta del bot
6. Retorna respuesta al widget

### 2.2 manychat-webhook (WhatsApp/Instagram/Messenger)

Recibe webhooks de ManyChat y sincroniza conversaciones.

**Flujo:**
1. Recibe payload de ManyChat (subscriber + message)
2. Busca o crea conversacion por subscriber_id
3. Detecta canal (whatsapp, instagram, messenger)
4. Guarda mensaje entrante
5. Actualiza datos del suscriptor
6. Opcionalmente vincula a contacto existente por telefono/email

### 2.3 send-conversation-reply (Nuevo)

Permite enviar respuestas desde el dashboard a traves de ManyChat API.

**Flujo:**
1. Recibe mensaje a enviar + conversation_id
2. Obtiene subscriber_id del canal
3. Llama a ManyChat API para enviar mensaje
4. Guarda el mensaje enviado en la DB

---

## Parte 3: Componentes Frontend

### 3.1 Nueva Pagina: /conversations

**Archivo:** `src/pages/Conversations.tsx`

Layout de 3 columnas:
1. **Sidebar izquierdo**: Lista de conversaciones con filtros
2. **Centro**: Vista de chat con mensajes
3. **Derecho (opcional)**: Panel de info del contacto

### 3.2 Componentes Principales

| Componente | Funcion |
|------------|---------|
| `ConversationList` | Lista filtrable de conversaciones |
| `ConversationItem` | Tarjeta individual con preview |
| `ConversationView` | Visor de mensajes con input |
| `MessageBubble` | Burbuja de mensaje estilizada |
| `ConversationFilters` | Filtros por canal, estado, asignado |
| `ContactInfoPanel` | Panel lateral con datos del contacto |
| `AssignConversation` | Dropdown para asignar a miembro |
| `ConversationActions` | Marcar resuelto, archivar, vincular contacto |

### 3.3 Hook: useConversations

Maneja CRUD de conversaciones con React Query y suscripcion Realtime.

```typescript
// Funcionalidades
- fetchConversations(filters)
- fetchMessages(conversationId)
- sendMessage(conversationId, content)
- markAsRead(conversationId)
- updateStatus(conversationId, status)
- assignConversation(conversationId, userId)
- linkToContact(conversationId, contactId)
```

### 3.4 Widget de Chat (Opcional)

**Archivo:** `src/components/conversations/ChatWidget.tsx`

Widget flotante para embeber en sitios web externos del usuario.

---

## Parte 4: Integracion con IA del CRM

Extender el asistente de chat para gestionar conversaciones:

### Nuevas Tools

| Tool | Descripcion |
|------|-------------|
| `get_conversations` | Lista conversaciones con filtros |
| `get_conversation_messages` | Obtiene mensajes de una conversacion |
| `send_reply` | Responde a una conversacion |
| `assign_conversation` | Asigna conversacion a un miembro |
| `resolve_conversation` | Marca como resuelta |
| `link_conversation_to_contact` | Vincula con contacto existente |

### Ejemplos de Uso

- "Muestrame las conversaciones abiertas de WhatsApp"
- "Responde a la conversacion de Juan diciendo que le enviaremos la propuesta manana"
- "Asigna las conversaciones pendientes a Maria"
- "Cuantas conversaciones sin responder tenemos hoy?"

---

## Parte 5: Realtime y Notificaciones

### Suscripcion Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
```

### Notificaciones

- Nueva conversacion entrante
- Mensaje nuevo en conversacion asignada
- Conversacion sin responder por X tiempo

---

## Orden de Implementacion

### Fase 1: Base de Datos (Migracion SQL)
1. Crear tabla `conversations`
2. Crear tabla `conversation_messages`
3. Configurar RLS con soporte multi-tenant
4. Habilitar Realtime

### Fase 2: Edge Functions
1. Crear `n8n-chat` para webchat
2. Crear `manychat-webhook` para WhatsApp/Instagram
3. Crear `send-conversation-reply` para respuestas salientes

### Fase 3: Frontend - Estructura Base
1. Crear hook `useConversations.ts`
2. Crear pagina `/conversations`
3. Agregar ruta en `App.tsx`
4. Agregar item en Sidebar

### Fase 4: Frontend - Componentes
1. `ConversationList` con filtros
2. `ConversationView` con mensajes
3. `MessageBubble` con estilos por canal
4. `ConversationActions` (asignar, resolver, vincular)

### Fase 5: Realtime y UX
1. Suscripcion a nuevos mensajes
2. Indicador de "escribiendo..."
3. Sonido de notificacion
4. Badge de no leidos en sidebar

### Fase 6: Integracion IA
1. Agregar tools de conversaciones al chat
2. Actualizar system prompt con contexto

---

## Resultado Esperado

Al completar la implementacion:

1. **Inbox Unificado**: Ver todas las conversaciones de todos los canales en un solo lugar
2. **Respuesta Omnicanal**: Responder a WhatsApp, Instagram y Webchat desde el CRM
3. **Vinculacion Automatica**: Conectar visitantes anonimos con contactos existentes
4. **Colaboracion**: Asignar conversaciones a miembros del equipo
5. **IA Integrada**: Gestionar conversaciones mediante lenguaje natural
6. **Tiempo Real**: Notificaciones y actualizaciones instantaneas
7. **Historial Completo**: Todo queda registrado y vinculado al contacto

---

## Archivos a Crear/Modificar

| Tipo | Archivo | Accion |
|------|---------|--------|
| SQL | Nueva migracion | Crear tablas conversations y conversation_messages |
| Edge Function | `supabase/functions/n8n-chat/index.ts` | Crear |
| Edge Function | `supabase/functions/manychat-webhook/index.ts` | Crear |
| Edge Function | `supabase/functions/send-conversation-reply/index.ts` | Crear |
| Hook | `src/hooks/useConversations.ts` | Crear |
| Hook | `src/hooks/useNotificationSound.ts` | Crear |
| Tipos | `src/types/conversations.ts` | Crear |
| Pagina | `src/pages/Conversations.tsx` | Crear |
| Componente | `src/components/conversations/ConversationList.tsx` | Crear |
| Componente | `src/components/conversations/ConversationView.tsx` | Crear |
| Componente | `src/components/conversations/MessageBubble.tsx` | Crear |
| Componente | `src/components/conversations/ConversationFilters.tsx` | Crear |
| Componente | `src/components/conversations/ChatWidget.tsx` | Crear (opcional) |
| Router | `src/App.tsx` | Agregar ruta /conversations |
| Sidebar | `src/components/layout/Sidebar.tsx` | Agregar item Conversaciones |
| Edge Function | `supabase/functions/chat/index.ts` | Agregar tools de conversaciones |
| Config | `supabase/config.toml` | Agregar nuevas funciones |

