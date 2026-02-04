

# Plan: Expandir Tools del Chat IA (Parte C)

## Analisis del Estado Actual

He analizado el archivo `supabase/functions/chat/index.ts` y encontrado lo siguiente:

### Tools Ya Implementados (10 tools)
| Tool | Estado |
|------|--------|
| `create_contact` | Implementado |
| `create_company` | Implementado |
| `create_task` | Implementado |
| `create_opportunity` | Implementado |
| `update_opportunity_stage` | Implementado |
| `search_contacts` | Implementado |
| `search_companies` | Implementado |
| `get_pipeline_summary` | Implementado |
| `schedule_meeting` | Implementado |
| `add_note` | Implementado |

### Tools Solicitados por el Usuario (7 tools nuevos)
| Tool | Descripcion | Dependencias |
|------|-------------|--------------|
| `search_contacts` (mejorado) | Busqueda avanzada con filtros | Requiere campo `whatsapp_number` |
| `update_contact` | Actualizar contacto existente | Requiere campo `whatsapp_number` |
| `search_timeline` | Buscar en historial | Requiere tabla `timeline_entries` |
| `analyze_deal_health` | Analizar salud de deals | Requiere tabla `timeline_entries` |
| `get_pipeline_summary` (mejorado) | Resumen detallado | Requiere tabla `timeline_entries` |
| `find_promises` | Buscar compromisos | Requiere tabla `timeline_entries` y campo `action_items` |
| `get_next_best_action` | Sugerir proxima accion | Requiere tabla `timeline_entries` |

---

## Problemas Detectados

### 1. Tabla `timeline_entries` No Existe
El codigo del usuario referencia una tabla `timeline_entries` que no existe en la base de datos. Esta tabla almacenaria:
- Historial de emails, llamadas, reuniones
- Campos: `entry_type`, `occurred_at`, `subject`, `body`, `summary`, `action_items`
- Relaciones con contactos, empresas y oportunidades

### 2. Campo `whatsapp_number` No Existe
La tabla `contacts` no tiene el campo `whatsapp_number` que el usuario referencia.

---

## Plan de Implementacion

### Fase 1: Preparacion de Base de Datos

Crear migracion SQL para:

```sql
-- 1. Agregar campo whatsapp_number a contacts
ALTER TABLE contacts ADD COLUMN whatsapp_number TEXT;

-- 2. Crear tabla timeline_entries
CREATE TABLE timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  company_id UUID REFERENCES companies(id),
  opportunity_id UUID REFERENCES opportunities(id),
  entry_type TEXT NOT NULL, -- 'email', 'call', 'meeting', 'note', 'whatsapp'
  subject TEXT,
  body TEXT,
  summary TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  source TEXT, -- 'gmail', 'manual', 'whatsapp'
  participants JSONB, -- [{email, name, role}]
  action_items JSONB, -- [{text, assigned_to, due_date, status}]
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own timeline" ON timeline_entries
  FOR ALL USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_entries;
```

### Fase 2: Actualizar Tools en chat/index.ts

Modificar el archivo `supabase/functions/chat/index.ts`:

**A. Agregar nuevas definiciones de tools:**

```typescript
// Agregar despues de los tools existentes
{
  type: "function",
  function: {
    name: "update_contact",
    description: "Actualiza informacion de un contacto existente",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email del contacto a actualizar (requerido)" },
        first_name: { type: "string", description: "Nuevo nombre" },
        last_name: { type: "string", description: "Nuevo apellido" },
        phone: { type: "string", description: "Nuevo telefono" },
        whatsapp_number: { type: "string", description: "Nuevo WhatsApp" },
        job_title: { type: "string", description: "Nuevo cargo" },
        notes: { type: "string", description: "Notas adicionales" },
      },
      required: ["email"],
    },
  },
},
{
  type: "function",
  function: {
    name: "search_timeline",
    description: "Busca en el historial de interacciones",
    parameters: {
      type: "object",
      properties: {
        contact_email: { type: "string" },
        company_name: { type: "string" },
        entry_type: { type: "string", enum: ["email", "meeting", "call", "note", "whatsapp"] },
        search_text: { type: "string" },
        days_ago: { type: "number", description: "Ultimos X dias (default: 30)" },
        limit: { type: "number", description: "Numero de resultados (default: 10)" },
      },
    },
  },
},
{
  type: "function",
  function: {
    name: "analyze_deal_health",
    description: "Analiza la salud de una oportunidad",
    parameters: {
      type: "object",
      properties: {
        opportunity_id: { type: "string" },
        company_name: { type: "string" },
      },
    },
  },
},
{
  type: "function",
  function: {
    name: "find_promises",
    description: "Busca compromisos pendientes en conversaciones",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "overdue", "all"] },
        contact_email: { type: "string" },
        days_range: { type: "number" },
      },
    },
  },
},
{
  type: "function",
  function: {
    name: "get_next_best_action",
    description: "Sugiere la siguiente mejor accion para un contacto, empresa o deal",
    parameters: {
      type: "object",
      properties: {
        entity_type: { type: "string", enum: ["contact", "company", "opportunity"] },
        entity_identifier: { type: "string" },
      },
      required: ["entity_type", "entity_identifier"],
    },
  },
},
```

**B. Agregar implementaciones de funciones:**

Las funciones ejecutoras seran:
- `updateContact()`: Actualiza campos del contacto por email
- `searchTimeline()`: Busca en timeline_entries con filtros
- `analyzeDealHealth()`: Calcula score de salud (0-100) basado en actividad
- `findPromises()`: Extrae action_items de timeline_entries
- `getNextBestAction()`: Sugiere acciones basadas en historial

**C. Actualizar el switch statement en `executeTool()`:**

```typescript
case "update_contact":
  return await updateContact(supabase, args);
case "search_timeline":
  return await searchTimeline(supabase, args);
case "analyze_deal_health":
  return await analyzeDealHealth(supabase, args);
case "find_promises":
  return await findPromises(supabase, args);
case "get_next_best_action":
  return await getNextBestAction(supabase, args);
```

### Fase 3: Actualizar System Prompt

Agregar las nuevas capacidades al system prompt para que el modelo sepa usarlas:

```typescript
## Funciones disponibles:
// ... existentes ...
- **update_contact**: Actualizar informacion de un contacto
- **search_timeline**: Buscar en historial de interacciones
- **analyze_deal_health**: Analizar salud de una oportunidad
- **find_promises**: Buscar compromisos pendientes
- **get_next_best_action**: Obtener sugerencia de proxima accion
```

---

## Resumen de Cambios

| Archivo | Accion |
|---------|--------|
| Nueva migracion SQL | Crear tabla `timeline_entries` y campo `whatsapp_number` |
| `supabase/functions/chat/index.ts` | Agregar 5 tools nuevos + 5 funciones ejecutoras |
| `supabase/config.toml` | Sin cambios necesarios |

---

## Orden de Ejecucion

| Paso | Tarea |
|------|-------|
| 1 | Crear migracion SQL para `timeline_entries` y `whatsapp_number` |
| 2 | Agregar definiciones de tools nuevos |
| 3 | Implementar funciones ejecutoras |
| 4 | Actualizar switch en `executeTool` |
| 5 | Actualizar system prompt |
| 6 | Desplegar edge function |
| 7 | Probar tools en el chat |

---

## Consideraciones Tecnicas

1. **Degradacion Elegante**: Los tools que dependen de `timeline_entries` funcionaran devolviendo listas vacias si la tabla esta vacia, en lugar de fallar
2. **Mejorar search_contacts**: Agregar soporte para `has_whatsapp` y `company_name` filters
3. **Mejorar get_pipeline_summary**: Agregar deteccion de deals en riesgo basado en `activities` en lugar de `timeline_entries` (fallback)
4. **RLS**: La tabla `timeline_entries` tendra politicas para que usuarios solo vean sus datos

