
## Plan: Corregir Input del Chat en Panel Expandido

### Problema Identificado
Cuando el panel de chat está expandido (drawer abierto), el input fijo en la parte inferior queda oculto detrás del drawer. Esto deja al usuario sin posibilidad de continuar escribiendo mensajes.

### Solución

Agregar un input dentro del panel expandido (`GlobalChatPanel`) para que cuando el drawer esté abierto, el usuario pueda escribir desde ahí.

### Cambios a Realizar

#### 1. `src/components/chat/GlobalChatPanel.tsx`
- Agregar un footer con un input de texto dentro del drawer
- Reutilizar la misma lógica del contexto (`inputValue`, `setInputValue`, `sendMessage`)
- El input dentro del panel tendrá el mismo diseño que el input global

#### 2. `src/components/chat/GlobalChatInput.tsx`
- Ocultar el input cuando el panel está abierto (`isPanelOpen`) para evitar duplicados
- Solo mostrar cuando el panel está cerrado

### Diseño Visual del Panel Corregido

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Historial]  │                  MENSAJES                            │
│              │                                                       │
│ Conversación │  👤 "agregar contacto"                               │
│ 1            │                                                       │
│ Conversación │  ✨ "¡Claro que sí! Para crear un contacto..."       │
│ 2            │                                                       │
│              │                                                       │
│              ├───────────────────────────────────────────────────────│
│              │ ✨ [  Escribe tu mensaje aquí...        ] [Enviar]   │
└──────────────┴───────────────────────────────────────────────────────┘
```

### Flujo Mejorado

| Estado del Panel | Comportamiento del Input |
|------------------|--------------------------|
| Cerrado | Input fijo visible en la parte inferior de la pantalla |
| Abierto | Input dentro del drawer, input fijo oculto |

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/chat/GlobalChatPanel.tsx` | Agregar footer con input dentro del drawer |
| `src/components/chat/GlobalChatInput.tsx` | Ocultar cuando `isPanelOpen` es true |

### Detalles de Implementación

**GlobalChatPanel.tsx:**
- Agregar un `div` con clase `border-t` como footer
- Incluir `Textarea` con el mismo estilo del input global
- Conectar a `inputValue`, `setInputValue`, `sendMessage` del contexto
- Manejar `Enter` para enviar

**GlobalChatInput.tsx:**
- Agregar condición: si `isPanelOpen` es true, retornar `null` (no renderizar)
- Esto evita tener dos inputs visibles al mismo tiempo
