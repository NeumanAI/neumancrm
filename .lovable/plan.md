
# Plan: Darle Mas Poder a la IA en el CRM

## Diagnostico Actual

El CRM ya tiene una base solida de IA con:
- **Chat con 30+ tools** para CRUD de contactos, empresas, oportunidades, tareas, equipo y proyectos
- **AI Insights** en el Dashboard (generate-insights)
- **Daily Brief** diario con resumen del dia (generate-daily-brief)
- **Streaming** con tool calling

### Brechas Detectadas (lo que la IA NO puede hacer hoy)

| Capacidad Faltante | Impacto |
|---------------------|---------|
| No puede completar/actualizar tareas | El usuario crea tareas por chat pero no puede marcarlas como hechas |
| No puede eliminar entidades | Solo crea, no puede borrar contactos, empresas u oportunidades |
| No puede listar tareas pendientes | Solo crea tareas, no puede consultarlas |
| No puede enviar emails/WhatsApp | No hay accion directa desde el chat |
| No hay resumen de conversaciones omnicanal | No consulta la tabla `conversations` ni `conversation_messages` |
| No puede generar reportes/exportaciones | Solo consulta, no genera documentos |
| No puede buscar oportunidades por filtros | Solo pipeline summary, no busqueda granular |
| No tiene contexto de la pagina actual | No sabe donde esta el usuario en el CRM |
| No puede actualizar empresas | Solo crea empresas, no las edita |
| No tiene tool de diagnostico/resumen global | No hay un "dame el estado general" inteligente |

---

## Mejoras Propuestas (7 areas)

### 1. Nuevas Tools para el Chat (Backend)

Agregar 10 nuevas herramientas al edge function `chat/index.ts`:

**Gestion de Tareas:**
- `list_tasks`: Listar tareas con filtros (estado, prioridad, fecha, tipo)
- `complete_task`: Marcar tarea como completada o reabrir
- `update_task`: Actualizar titulo, prioridad, fecha, descripcion

**Gestion de Entidades:**
- `update_company`: Actualizar campos de empresa (industria, telefono, web, etc.)
- `delete_entity`: Eliminar contacto, empresa u oportunidad (con confirmacion en prompt)
- `search_opportunities`: Buscar oportunidades con filtros (valor, etapa, empresa, fecha)

**Conversaciones Omnicanal:**
- `list_conversations`: Ver conversaciones abiertas por canal (webchat, whatsapp, email)
- `get_conversation_summary`: Obtener resumen de una conversacion con ultimo mensaje

**Inteligencia:**
- `generate_crm_report`: Generar resumen ejecutivo del CRM (pipeline, conversion, actividad)
- `smart_search`: Busqueda universal en contactos, empresas, oportunidades y tareas

### 2. Contexto de Pagina Actual (Frontend)

Pasar la ruta actual del usuario al chat para que la IA sea contextualmente inteligente:
- Si el usuario esta en `/pipeline`, el prompt de sistema incluye "El usuario esta viendo el pipeline"
- Si esta en `/contacts/123`, el prompt incluye datos de ese contacto
- Esto permite respuestas como "Veo que estas mirando el deal con X, quieres que te de un analisis?"

**Cambios:**
- `ChatContext.tsx`: Capturar `useLocation()` y enviarlo como metadata al edge function
- `chat/index.ts`: Recibir `currentRoute` y ajustar el system prompt

### 3. Quick Actions Contextuales (Frontend)

Reemplazar los quick actions estaticos del chat con acciones inteligentes basadas en:
- La pagina actual
- Los datos del CRM (tareas vencidas, deals en riesgo)
- La hora del dia

**Ejemplos de acciones dinamicas:**
- En `/pipeline`: "Analiza la salud de mis deals", "Cuales estan en riesgo?"
- En `/contacts`: "Busca contactos sin seguimiento", "Crea un contacto nuevo"
- En `/tasks`: "Que tareas tengo para hoy?", "Completa la tarea de..."
- General: "Dame un resumen ejecutivo", "Busca [algo] en todo el CRM"

### 4. Acciones Rapidas desde AI Insights (Frontend)

El boton "Preguntale a la IA" del AIInsightsCard debe abrir el chat con un prompt pre-cargado:
- Click en deal en riesgo -> Abre chat con "Analiza el deal [titulo]"
- Click en "Preguntale a la IA" -> Abre chat con "Dame un analisis profundo del pipeline"
- Click en sugerencia -> Ejecuta la accion sugerida

### 5. Modelo Mejorado y System Prompt Optimizado (Backend)

- Cambiar de `google/gemini-2.5-flash` a `google/gemini-3-flash-preview` (mas rapido y capaz)
- Optimizar el system prompt para ser mas conciso y contextual
- Agregar seccion de "Estado actual del CRM" mas resumida para reducir tokens

### 6. Tool de Busqueda Universal "Smart Search" (Backend)

Una sola herramienta que busca en todas las tablas a la vez:
- Contactos (nombre, email, empresa)
- Empresas (nombre, industria)
- Oportunidades (titulo, empresa)
- Tareas (titulo)
- Timeline (contenido)

Devuelve resultados agrupados por tipo con relevancia.

### 7. Notificaciones Proactivas de IA (Frontend + Backend)

Sistema donde la IA notifica activamente al usuario sobre:
- Deals que llevan 7+ dias sin actividad
- Tareas vencidas
- Contactos frios (30+ dias sin interaccion)

Integrado con el componente `NotificationBell` existente.

---

## Archivos a Modificar

### Backend (Edge Function)
| Archivo | Cambios |
|---------|---------|
| `supabase/functions/chat/index.ts` | +10 nuevas tools, tool definitions, executors, smart search, model upgrade |

### Frontend
| Archivo | Cambios |
|---------|---------|
| `src/contexts/ChatContext.tsx` | Capturar ruta actual, enviar como metadata, metodo `sendPrefilledMessage` |
| `src/components/chat/ChatMessages.tsx` | Quick actions dinamicos basados en ruta y datos |
| `src/components/dashboard/AIInsightsCard.tsx` | Botones de accion que abren chat con prompts |
| `src/components/chat/GlobalChatInput.tsx` | Soporte para mensajes pre-cargados |

---

## Seccion Tecnica

### Nuevas Tool Definitions (ejemplo parcial)

```typescript
// list_tasks
{
  type: "function",
  function: {
    name: "list_tasks",
    description: "Lista tareas y actividades del usuario con filtros avanzados.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "completed", "overdue", "today"], description: "Estado de las tareas" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Filtrar por prioridad" },
        type: { type: "string", enum: ["task", "call", "email", "meeting", "follow_up"], description: "Tipo de actividad" },
        limit: { type: "number", description: "Maximo de resultados (default: 10)" },
      },
    },
  },
},

// complete_task
{
  type: "function",
  function: {
    name: "complete_task",
    description: "Marca una tarea como completada o la reabre.",
    parameters: {
      type: "object",
      properties: {
        task_title: { type: "string", description: "Titulo de la tarea (busqueda parcial)" },
        completed: { type: "boolean", description: "true para completar, false para reabrir" },
      },
      required: ["task_title"],
    },
  },
},

// smart_search
{
  type: "function",
  function: {
    name: "smart_search",
    description: "Busqueda universal en todo el CRM: contactos, empresas, oportunidades y tareas.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto de busqueda" },
        entity_types: { type: "array", items: { type: "string", enum: ["contacts", "companies", "opportunities", "tasks"] }, description: "Tipos a buscar (default: todos)" },
      },
      required: ["query"],
    },
  },
},
```

### Contexto de Pagina (ChatContext.tsx)

```typescript
// Agregar a ChatContext
import { useLocation } from 'react-router-dom';

// En ChatProvider:
const location = useLocation();

// En sendMessage, enviar ruta al backend:
body: JSON.stringify({ 
  messages: aiMessages,
  currentRoute: location.pathname,
})
```

### Quick Actions Dinamicos (ChatMessages.tsx)

```typescript
const getContextualQuickActions = (pathname: string, crmStats: any) => {
  const baseActions = ['Dame un resumen ejecutivo'];
  
  switch (true) {
    case pathname === '/pipeline':
      return [...baseActions, 'Analiza la salud de mis deals', 'Cuales deals estan en riesgo?', 'Muestra el resumen del pipeline'];
    case pathname === '/contacts':
      return [...baseActions, 'Busca contactos sin seguimiento', 'Crea un contacto nuevo', 'Contactos con WhatsApp'];
    case pathname === '/tasks':
      return [...baseActions, 'Que tareas tengo para hoy?', 'Tareas vencidas', 'Completa la tarea...'];
    case pathname.startsWith('/contacts/'):
      return [...baseActions, 'Analiza este contacto', 'Siguiente mejor accion', 'Historial de interacciones'];
    default:
      return [...baseActions, 'Crear un contacto', 'Ver mi pipeline', 'Tareas de hoy'];
  }
};
```

### AIInsightsCard con Deep-Link al Chat

```typescript
// En AIInsightsCard.tsx
const { openPanel, setInputValue, sendMessage } = useChat();

const handleAskAI = (prompt: string) => {
  setInputValue(prompt);
  openPanel();
  // Auto-enviar despues de un tick
  setTimeout(() => sendMessage(), 100);
};

// En el boton CTA:
<Button onClick={() => handleAskAI('Dame un analisis profundo del pipeline con recomendaciones')}>
  Preguntale a la IA
</Button>

// En cada deal en riesgo:
<button onClick={() => handleAskAI(`Analiza el deal "${deal.title}" y sugiere acciones`)}>
  {deal.title}
</button>
```

---

## Orden de Implementacion

1. **Backend primero**: Agregar las 10 nuevas tools al chat edge function (list_tasks, complete_task, update_task, update_company, delete_entity, search_opportunities, list_conversations, get_conversation_summary, generate_crm_report, smart_search)
2. **Model upgrade**: Cambiar a google/gemini-3-flash-preview
3. **Contexto de ruta**: Enviar currentRoute desde ChatContext al backend
4. **Quick actions dinamicos**: Actualizar ChatMessages.tsx
5. **Deep-links desde Insights**: Conectar AIInsightsCard con el chat
6. **Metodo sendPrefilledMessage**: Agregar a ChatContext para uso global

---

## Resultado Esperado

| Area | Antes | Despues |
|------|-------|---------|
| Tools disponibles | 30 | 40+ |
| Puede completar tareas | No | Si |
| Puede eliminar entidades | No | Si |
| Puede consultar tareas | No | Si (con filtros) |
| Busqueda universal | No | Si (smart_search) |
| Contexto de pagina | No | Si (sabe donde esta el usuario) |
| Quick actions | 4 estaticos | Dinamicos por pagina |
| Insights -> Chat | Sin conexion | Click = pregunta pre-cargada |
| Modelo | gemini-2.5-flash | gemini-3-flash-preview |
| Conversaciones omnicanal | Sin acceso IA | Consulta y resume |

La IA pasara de ser un asistente pasivo a un copiloto proactivo que entiende el contexto, sugiere acciones relevantes y puede ejecutar practicamente cualquier operacion del CRM.
