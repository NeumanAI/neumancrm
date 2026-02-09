

# Plan: AI Assistant Unificado - Panel Lateral Permanente

## Resumen

Unificar el chat IA actual (GlobalChatInput + GlobalChatPanel) y el AI Co-Worker en un unico componente llamado **AI Assistant** que funcione como panel lateral permanente al estilo de Lovable/Claude Chrome Extension. El panel tendra dos tabs: **Chat** (con streaming, conversaciones, markdown) y **Sugerencias** (proactivas del Co-Worker).

---

## Diferencia Clave vs. el Prompt Original

El prompt subido propone un chat simplificado con `supabase.functions.invoke` que perderia:
- Streaming token-por-token (SSE)
- Persistencia de conversaciones (tabla `ai_conversations`)
- Historial de conversaciones (sidebar con hoy/ayer/antiguas)
- Markdown rendering en respuestas
- Tool calling (40+ herramientas)
- Contexto de ruta

**En su lugar**, el nuevo AIAssistant reutilizara el `ChatContext` existente que ya tiene todo esto implementado. Solo cambiara la presentacion visual.

---

## Componentes a Eliminar del Layout

| Componente | Razon |
|-----------|-------|
| `<AICoWorker />` | Se integra como tab "Sugerencias" en el nuevo panel |
| `<GlobalChatInput />` | El input pasa dentro del panel lateral |
| `<GlobalChatPanel />` | El Drawer se reemplaza por el panel lateral permanente |

**Nota**: Los archivos de estos componentes NO se eliminan, solo se dejan de importar en AppLayout. Se podrian limpiar despues.

---

## Archivo Nuevo

### `src/components/ai/AIAssistant.tsx`

Panel lateral permanente (derecha de la pantalla) con:

**Header**: Gradiente purple-to-blue con icono Sparkles, titulo "AI Assistant", boton minimizar, tabs Chat/Sugerencias

**Tab Chat**: 
- Reutiliza `ChatMessages` (streaming, markdown, quick actions contextuales)
- Sidebar de conversaciones colapsable (lista de hoy/ayer/antiguas)
- Input con streaming usando `useChat()` del ChatContext existente
- Boton "Nueva conversacion"

**Tab Sugerencias**:
- Logica migrada de AICoWorker (loadSuggestions via `get-coworker-suggestions`)
- Cards con borde-izquierdo colorizado (rojo=urgente, naranja=importante, azul=sugerencia)
- Dismiss individual, badges de impacto, boton de accion
- Auto-refresh cada 5 minutos

**Vista Minimizada**:
- Barra delgada (w-14) con icono Sparkles, texto vertical "AI Assistant"
- Badge de notificaciones si hay sugerencias urgentes

---

## Archivos a Modificar

### `src/components/layout/AppLayout.tsx`

- Eliminar imports de `AICoWorker`, `GlobalChatInput`, `GlobalChatPanel`
- Agregar import de `AIAssistant`
- Cambiar padding-right del main content: de `pr-[19rem]` a un valor dinamico o fijo que respete el panel (el panel se posiciona fixed, el main ya tiene espacio con pr-[19rem])
- Reemplazar los 3 componentes eliminados con `<AIAssistant />`

### `src/index.css`

- Agregar estilos para `.writing-mode-vertical` (texto vertical del panel minimizado)
- Agregar estilos de scrollbar customizado para el panel

---

## Seccion Tecnica

### Estructura del AIAssistant

```text
AIAssistant (fixed right-0 top-0 bottom-0)
+-- Estado minimizado (w-14)
|   +-- Boton expandir con badge
|   +-- Texto vertical "AI Assistant"
|   +-- Icono Sparkles
|
+-- Estado expandido (w-[420px])
    +-- Header (gradiente, tabs)
    +-- Tab Chat
    |   +-- Sidebar conversaciones (colapsable, w-48)
    |   +-- Area de mensajes (ChatMessages existente)
    |   +-- Input (Textarea + Send button)
    +-- Tab Sugerencias
    |   +-- Header con Refresh
    |   +-- Lista de suggestion cards
    |   +-- Estado vacio
    +-- Footer (powered by AI)
```

### Integracion con ChatContext

El componente usara `useChat()` para:
- `displayMessages` - mensajes a mostrar
- `inputValue` / `setInputValue` - control del input
- `sendMessage` - enviar mensaje con streaming
- `isLoading` / `streamingContent` - estado de carga
- `conversations` / `selectedConversationId` - gestion de conversaciones
- `startNewConversation` - crear nueva conversacion
- `currentRoute` - ruta actual para quick actions

### Logica de Sugerencias (migrada de AICoWorker)

```typescript
// Misma logica que AICoWorker.tsx
const [suggestions, setSuggestions] = useState([]);
const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

async function loadSuggestions() {
  const { data } = await supabase.functions.invoke('get-coworker-suggestions', {
    body: { current_page: location.pathname }
  });
  setSuggestions(data?.suggestions || []);
}

useEffect(() => {
  loadSuggestions();
  const interval = setInterval(loadSuggestions, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [location.pathname]);
```

### AppLayout Modificado

```typescript
// ANTES:
<CommandBar />
<AICoWorker />
<GlobalChatInput />
<GlobalChatPanel />
<DailyBriefModal />

// DESPUES:
<CommandBar />
<AIAssistant />
<DailyBriefModal />
```

El main content mantiene `pr-[19rem]` que ya reserva espacio para el panel lateral. Cuando el AIAssistant este minimizado, el contenido tendra espacio extra (el panel se minimiza a w-14).

### Cambio de Padding Dinamico

Para que el contenido se ajuste cuando el panel esta minimizado vs expandido, el AIAssistant disparara un evento custom o usaremos CSS con un data attribute en el body. Alternativa mas simple: el main siempre tiene `pr-[28rem]` fijo (450px del panel) y cuando se minimiza el padding no cambia pero hay mas espacio visual de scroll.

Mejor enfoque: pasar el estado de minimizado via un callback al AppLayout que ajuste el padding del main.

---

## Orden de Implementacion

1. Crear `src/components/ai/AIAssistant.tsx` con tabs Chat + Sugerencias
2. Modificar `src/components/layout/AppLayout.tsx` - reemplazar 3 componentes por AIAssistant
3. Agregar estilos CSS en `src/index.css`
4. Verificar que el ChatContext funciona correctamente con el nuevo panel

---

## Resultado Visual

```text
ANTES:
+--------+------------------------+--------+
| Sidebar| Main Content           |CoWorker|
|        |                        | Panel  |
|        |                        |        |
|        |========================|        |
|        | [Chat flotante abajo]  |        |
+--------+------------------------+--------+

DESPUES:
+--------+------------------+---------------+
| Sidebar| Main Content     | AI Assistant  |
|        |                  | [Chat|Suger.] |
|        |                  | Mensajes...   |
|        |                  | [Input___][>] |
+--------+------------------+---------------+
```

- Un solo punto de interaccion con la IA
- Chat completo con streaming y conversaciones persistidas
- Sugerencias proactivas en tab separado
- Siempre visible, minimizable a barra delgada
- Gradiente purple/blue coherente con el branding AI del CRM

