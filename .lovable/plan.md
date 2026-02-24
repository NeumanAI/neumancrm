

# Integrar el Webchat de Bitancorp con este CRM

## Situacion actual

Bitancorp creo su propia infraestructura de conversaciones con estos endpoints:

- **Base URL**: `https://xmlpujchnzzxiqopcebf.supabase.co/functions/v1/conversations-api`
- **Autenticacion**: Header `x-api-key` con el valor del secreto `CRM_API_KEY`
- **Endpoints disponibles**: GET (sessions, messages, leads) y POST (send_message, pause_bot, resume_bot)

Tu CRM (Neuman) ya tiene el endpoint `n8n-chat` listo para recibir mensajes de webchat.

## Hay dos caminos posibles

### Opcion A: Bitancorp envia mensajes directamente a este CRM (Recomendado - mas simple)

Bitancorp configura su widget de chat para que al recibir un mensaje del visitante, llame al endpoint de ESTE CRM:

```
POST https://vzqjoiapwgsbvsknrlqk.supabase.co/functions/v1/n8n-chat
```

Con el payload:
```json
{
  "session_id": "session-uuid",
  "message": "texto del visitante",
  "visitor_name": "Nombre",
  "visitor_email": "email@ejemplo.com",
  "user_id": "e595967d-a0cc-4cf2-ba94-32aa81d3eee0",
  "organization_id": "5179d17c-7107-46ea-ba1a-88a029bf74d9"
}
```

**Ventaja**: No requiere cambios en este CRM. Las conversaciones aparecen automaticamente en `/conversaciones`.

### Opcion B: Este CRM consume la API de Bitancorp (Bidireccional - mas complejo)

Crear una edge function en este CRM que periodicamente consulte la API de Bitancorp para traer las conversaciones, y cuando un agente responda desde el CRM, envie la respuesta via `send_message` de Bitancorp.

**Ventaja**: Permite pausar/reanudar el bot y el agente puede responder directamente desde el CRM hacia el webchat de Bitancorp.

## Pasos para la Opcion A (recomendada)

En el proyecto Bitancorp, necesitas que el componente de chat (probablemente `BitanAIChat.tsx`) haga un `fetch` POST al endpoint de este CRM cada vez que un visitante envie un mensaje.

### Datos que necesitas configurar en Bitancorp:

| Campo | Valor |
|---|---|
| `user_id` | `e595967d-a0cc-4cf2-ba94-32aa81d3eee0` (tu cuenta jogedu) |
| `organization_id` | `5179d17c-7107-46ea-ba1a-88a029bf74d9` |
| Endpoint CRM | `https://vzqjoiapwgsbvsknrlqk.supabase.co/functions/v1/n8n-chat` |

### Lo que falta por hacer en Bitancorp:

1. Abrir el proyecto Bitancorp en Lovable
2. Pedirle que en el componente del chat, al enviar un mensaje, tambien haga un POST al endpoint del CRM con los datos del visitante
3. Probar enviando un mensaje desde el webchat de Bitancorp
4. Verificar que aparece en `/conversaciones` de este CRM

## Pasos para la Opcion B (bidireccional)

Requiere crear en este CRM:

1. **Guardar la API key de Bitancorp** como secreto (`BITANCORP_API_KEY`)
2. **Nueva edge function `sync-bitancorp`** que consulte los endpoints GET de Bitancorp y guarde conversaciones/mensajes nuevos en las tablas locales
3. **Modificar `send-conversation-reply`** para que cuando el canal sea `webchat` y la conversacion venga de Bitancorp, llame al POST `send_message` de la API de Bitancorp
4. **Sincronizacion**: Ejecutar la funcion periodicamente o configurar un webhook en Bitancorp que notifique a este CRM cuando hay nuevos mensajes

## Seccion tecnica

### Arquitectura Opcion A
```text
Visitante Web → Bitancorp Chat Widget
                     ↓ POST
         CRM n8n-chat endpoint
                     ↓
         conversations + conversation_messages (tablas)
                     ↓ Realtime
         /conversaciones (UI del CRM)
```

### Arquitectura Opcion B
```text
Visitante Web → Bitancorp Chat Widget → Bitancorp DB
                                              ↓ GET (sync)
                                     CRM sync-bitancorp
                                              ↓
                                     conversations (tablas CRM)
                                              ↓ Realtime
                                     /conversaciones (UI)

Agente CRM → send-conversation-reply → POST send_message → Bitancorp → Visitante
```

## Recomendacion

Empieza con la **Opcion A** porque no requiere cambios en este CRM y ya esta todo listo. Solo necesitas ir al proyecto Bitancorp y pedirle que envie los mensajes del chat al endpoint de este CRM.

