

## Plan: Corregir Visualización de Mensajes en el Chat

### Problema Raíz Identificado

El backend funciona correctamente:
- Los contactos se crean en la base de datos
- Las respuestas streaming llegan correctamente
- Los mensajes se guardan en la tabla `ai_conversations`

Sin embargo, la UI no muestra los mensajes porque hay un problema de sincronización de estado entre React Query y el estado local del contexto.

### Diagnóstico Técnico

En `ChatContext.tsx`:
- `messages` se obtiene de `currentConversation?.messages || []`
- `currentConversation` busca en `conversations` (datos del query)
- Después de `updateConversation.mutateAsync`, se llama `queryClient.invalidateQueries`
- Pero la invalidación es asíncrona y la UI puede mostrar datos vacíos temporalmente

El problema específico: cuando `selectedConversationId` cambia o cuando la mutación completa, React Query necesita refetch los datos, y durante ese tiempo `messages` puede estar vacío.

### Solución Propuesta

#### Cambio 1: Optimistic Updates en React Query

Actualizar las mutaciones para usar `onMutate` y aplicar cambios optimistas inmediatamente sin esperar el refetch.

```typescript
// En updateConversation mutation
onMutate: async ({ id, messages }) => {
  await queryClient.cancelQueries({ queryKey: ['ai_conversations'] });
  const previous = queryClient.getQueryData(['ai_conversations']);
  
  // Actualizar cache optimísticamente
  queryClient.setQueryData(['ai_conversations'], (old: AIConversation[]) =>
    old?.map(conv => 
      conv.id === id 
        ? { ...conv, messages, last_message_at: new Date().toISOString() }
        : conv
    )
  );
  
  return { previous };
},
onError: (err, variables, context) => {
  // Rollback en caso de error
  queryClient.setQueryData(['ai_conversations'], context?.previous);
},
```

#### Cambio 2: Estado Local para Mensajes de Streaming

Mantener los mensajes actuales en un estado local separado durante el streaming para evitar parpadeos.

```typescript
// Estado local para mensajes durante streaming
const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
const [isStreaming, setIsStreaming] = useState(false);

// Sincronizar con la conversación seleccionada
useEffect(() => {
  if (!isStreaming && currentConversation) {
    setLocalMessages(currentConversation.messages);
  }
}, [currentConversation, isStreaming]);
```

#### Cambio 3: Selección Automática de Conversación Recién Creada

Asegurar que después de crear una conversación, esta se seleccione y muestre correctamente.

### Cambios en Archivos

| Archivo | Cambio |
|---------|--------|
| `src/contexts/ChatContext.tsx` | Agregar optimistic updates y mejorar sincronización de estado |

### Flujo Corregido

| Paso | Antes | Después |
|------|-------|---------|
| 1. Usuario envía mensaje | Mensaje se guarda, UI espera refetch | Mensaje aparece inmediatamente (optimistic) |
| 2. Streaming inicia | Puede mostrar área vacía | Mantiene mensajes locales durante streaming |
| 3. Respuesta completa | Espera invalidación del query | Actualiza cache optimísticamente, UI fluida |

### Resultado Esperado

- Los mensajes aparecen inmediatamente al enviar
- El área de chat nunca queda vacía durante transiciones
- El streaming se muestra correctamente en tiempo real
- Las conversaciones del historial muestran sus mensajes al seleccionarlas

