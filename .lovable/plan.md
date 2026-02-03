

## Plan: Integrar IA Real al Chat con Lovable AI Gateway

### Respuesta a tu pregunta

**¡Sí, absolutamente puedes cambiarla después!** La arquitectura que implementaremos está diseñada para ser intercambiable:

- La lógica de IA vive en una **Edge Function** (backend)
- El frontend solo llama a esa función, sin saber qué modelo hay detrás
- Para cambiar de proveedor, solo modificas la Edge Function

```text
┌────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA FLEXIBLE                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   FRONTEND (Chat.tsx)                                          │
│        │                                                       │
│        │ POST /functions/v1/chat                               │
│        ▼                                                       │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │              EDGE FUNCTION (chat)                        │ │
│   │  ┌─────────────────────────────────────────────────┐    │ │
│   │  │           Aquí se cambia el proveedor            │    │ │
│   │  │                                                   │    │ │
│   │  │  AHORA:    Lovable AI Gateway (Gemini/GPT)       │    │ │
│   │  │  DESPUÉS:  Tu API personalizada                  │    │ │
│   │  │            OpenAI directo                        │    │ │
│   │  │            Anthropic Claude                       │    │ │
│   │  │            Cualquier otro                        │    │ │
│   │  └─────────────────────────────────────────────────┘    │ │
│   └─────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### Lo que vamos a implementar

#### 1. Edge Function `chat`

Crear una función backend que:
- Recibe mensajes del usuario
- Incluye contexto del CRM (contactos, oportunidades, tareas)
- Llama al Lovable AI Gateway
- Devuelve respuestas en streaming (token por token)
- Maneja errores elegantemente (429, 402)

#### 2. Actualizar Frontend (Chat.tsx)

- Reemplazar la función mock `getAIResponse()` 
- Implementar streaming real (tokens llegan uno por uno)
- Mostrar respuesta progresivamente mientras se genera

---

### Flujo de la conversación

```text
Usuario escribe: "¿Cuántos contactos tengo?"
                    │
                    ▼
        Frontend envía a Edge Function
                    │
                    ▼
        Edge Function construye contexto:
        - System prompt del CRM
        - Historial de conversación
        - Datos relevantes del usuario
                    │
                    ▼
        Llama a Lovable AI Gateway
        (google/gemini-3-flash-preview)
                    │
                    ▼
        Streaming de respuesta
        Token por token
                    │
                    ▼
        Usuario ve: "Tienes 15 contactos..."
        (apareciendo progresivamente)
```

---

### Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/functions/chat/index.ts` | Crear | Edge function con Lovable AI |
| `supabase/config.toml` | Modificar | Registrar la función |
| `src/pages/Chat.tsx` | Modificar | Integrar streaming real |

---

### Cómo cambiar a API personalizada (futuro)

Cuando quieras usar tu propia API, solo cambiarás esto en la Edge Function:

```typescript
// AHORA - Lovable AI Gateway
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", ... })
});

// DESPUÉS - Tu API personalizada
const response = await fetch("https://tu-api.com/chat", {
  headers: { Authorization: `Bearer ${TU_API_KEY}` },
  body: JSON.stringify({ prompt: ... })
});
```

El frontend **no cambia nada** - sigue llamando a `/functions/v1/chat`.

---

### System Prompt del CRM

El asistente tendrá conocimiento sobre:
- Que es un asistente de CRM
- Cómo ayudar con contactos, empresas, pipeline y tareas
- Respuestas en español
- Formato markdown para mejor presentación

---

### Beneficios de esta arquitectura

- **Seguridad**: Las API keys nunca llegan al navegador
- **Flexibilidad**: Cambias de IA sin tocar el frontend
- **Performance**: Streaming para respuestas instantáneas
- **Escalabilidad**: Edge Functions escalan automáticamente

