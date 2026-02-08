

# Plan: AI-Native CRM Fase 1

## Resumen

Implementar 4 features AI-Native que se **suman** a la funcionalidad existente sin reemplazar nada:

1. **Natural Language Interface (NLI)** - Formularios conversacionales para crear contactos/empresas/oportunidades
2. **Command Bar (Cmd+K)** - Barra de comandos global con lenguaje natural
3. **AI Co-Worker** - Panel lateral con sugerencias proactivas
4. **User Behavior Learning** - Tracking de acciones del usuario

---

## Alcance y Consideraciones Clave

- Los formularios tradicionales de Contactos, Empresas y Pipeline se mantienen intactos
- Solo se agregan botones "Crear con IA" junto a los botones existentes
- El chat existente (40+ tools) NO se modifica ni se duplica
- Se reutiliza la libreria `cmdk` (ya instalada) para el Command Bar
- Se usa Lovable AI Gateway (ya configurado con LOVABLE_API_KEY)
- Las 3 nuevas edge functions son ligeras y especializadas (NLI, Command, Co-Worker)

---

## Cambios en Base de Datos

Se crean 2 tablas nuevas con RLS:

**user_actions** - Registro de acciones del usuario para aprendizaje
- Campos: user_id, organization_id, action_type, entity_type, entity_id, page_url, method (form/nli/command_bar), metadata, duration_ms
- RLS: usuarios solo ven/crean sus propias acciones
- Indices en user_id, organization_id, action_type, created_at

**user_behavior_patterns** - Patrones aprendidos (para uso futuro)
- Campos: user_id, pattern_type, pattern_data (JSONB), frequency, confidence
- RLS: usuarios solo ven sus propios patrones

---

## Archivos Nuevos a Crear

### Edge Functions (3)

| Archivo | Funcion |
|---------|---------|
| `supabase/functions/process-conversational-input/index.ts` | Procesa input de lenguaje natural para NLI, extrae datos estructurados usando Gemini |
| `supabase/functions/interpret-command/index.ts` | Interpreta comandos del Command Bar y devuelve intent + params |
| `supabase/functions/get-coworker-suggestions/index.ts` | Genera sugerencias contextuales basadas en deals en riesgo, tareas vencidas, etc. |

### Componentes React (3)

| Archivo | Funcion |
|---------|---------|
| `src/components/ai/ConversationalForm.tsx` | Formulario conversacional paso a paso con IA |
| `src/components/ai/CommandBar.tsx` | Barra Cmd+K con busqueda y comandos en lenguaje natural |
| `src/components/ai/AICoWorker.tsx` | Panel lateral minimizable con sugerencias proactivas |

### Hooks (1)

| Archivo | Funcion |
|---------|---------|
| `src/hooks/useActionTracking.ts` | Hook para trackear acciones del usuario (fire-and-forget) |

---

## Archivos Existentes a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/config.toml` | Agregar 3 nuevas edge functions con verify_jwt = false |
| `src/components/layout/AppLayout.tsx` | Agregar CommandBar y AICoWorker al layout |
| `src/components/layout/Header.tsx` | Agregar hint de Cmd+K al input de busqueda y hacerlo clickable |
| `src/pages/Contacts.tsx` | Agregar boton "Crear con IA" y dialog con ConversationalForm |
| `src/pages/Companies.tsx` | Agregar boton "Crear con IA" y dialog con ConversationalForm |
| `src/pages/Pipeline.tsx` | Agregar boton "Crear con IA" y dialog con ConversationalForm |

---

## Seccion Tecnica

### Edge Function: process-conversational-input

- Recibe: input del usuario, tipo de entidad, datos recolectados hasta ahora
- Usa Gemini (google/gemini-2.5-flash) para extraer datos estructurados del texto
- Responde con: extracted_data, is_complete, next_question, confirmation_message
- Autenticacion via header Authorization con supabase.auth.getUser()
- No necesita LOVABLE_API_KEY explicitamente porque el gateway lo maneja

### Edge Function: interpret-command

- Recibe: query en lenguaje natural
- Clasifica intent: navigate, create, search, filter, execute_action
- Devuelve: intent, params, confidence, suggested_route
- Para busquedas tambien hace query directo a contactos/empresas/oportunidades

### Edge Function: get-coworker-suggestions

- Autenticado: requiere usuario logueado
- Consulta: deals sin actividad (7+ dias), deals hot (propuesta/negociacion), tareas vencidas
- Devuelve: array de sugerencias con tipo (urgent/important/suggestion), titulo, accion recomendada

### ConversationalForm Component

- Estado conversacional: mensajes[] con roles user/assistant
- Cada submit llama a process-conversational-input
- Cuando is_complete=true, muestra botones Confirmar/Editar/Cancelar
- onComplete callback recibe los datos extraidos para crear la entidad
- Quick suggestions iniciales para guiar al usuario

### CommandBar Component

- Se abre con Cmd+K / Ctrl+K (event listener global)
- Usa el componente cmdk existente (CommandDialog, CommandInput, etc.)
- Debounce de 500ms antes de llamar a interpret-command
- Para intent=navigate: navega a la ruta sugerida
- Para intent=search: busca en paralelo en contacts, companies, opportunities
- Para intent=create: dispara evento custom 'ai-create-entity' para abrir ConversationalForm
- Acciones rapidas predefinidas cuando no hay query

### AICoWorker Component

- Panel lateral derecho, minimizable a solo icono
- Carga sugerencias al montar y cada 5 minutos
- Se actualiza cuando cambia la ruta (location.pathname)
- Cada sugerencia tiene: icono por tipo, titulo, descripcion, boton de accion, dismiss
- Estado minimizado persiste en sesion
- No bloquea el layout principal

### useActionTracking Hook

- Fire-and-forget: no bloquea la UI
- Obtiene organization_id del team_member del usuario
- Cachea organization_id para no repetir queries
- Parametros: action_type, entity_type, entity_id, method, metadata, duration_ms

### Header Modifications

- El input de busqueda muestra badge "Cmd+K" como hint
- Click en el input dispara apertura del CommandBar via KeyboardEvent sintético
- Solo en paginas que no son Dashboard (el Dashboard muestra saludo personalizado)

### Layout Modifications

- CommandBar se agrega como componente global dentro de ChatProvider
- AICoWorker se agrega como panel flotante, posicionado fixed a la derecha
- El main content reduce padding-right cuando Co-Worker esta expandido (via CSS)

### Contacts/Companies/Pipeline Modifications

- Se agrega estado showNLI para controlar dialog de ConversationalForm
- Boton "Crear con IA" (gradiente purpura) junto al boton existente
- Dialog wraps ConversationalForm con entity type correcto
- onComplete llama al mismo createContact/createCompany/createOpportunity que usa el form normal
- Se integra useActionTracking para registrar si se creo via 'nli' o 'form'

---

## Orden de Implementacion

1. Migracion SQL (2 tablas + RLS + indices)
2. Crear las 3 edge functions + actualizar config.toml
3. Crear hook useActionTracking
4. Crear ConversationalForm
5. Crear CommandBar
6. Crear AICoWorker
7. Modificar AppLayout (agregar CommandBar + AICoWorker)
8. Modificar Header (hint Cmd+K)
9. Modificar Contacts, Companies, Pipeline (boton "Crear con IA")
10. Deploy y testing

