

## Plan: Corregir Function Calling del Asistente de IA

### Problema Identificado

El asistente de IA no está ejecutando las herramientas (function calling) para crear contactos. En su lugar, responde conversacionalmente como si hubiera completado la acción, pero **no inserta datos en la base de datos**.

Evidencia de los logs:
- Se llama a la API con `tools` configuradas
- **Nunca aparece** el log `"Executing tool: create_contact"`
- El contacto no existe en la tabla `contacts` (consultas devuelven `[]`)

### Causas Probables

1. **Problema con el modelo**: `google/gemini-3-flash-preview` puede no estar manejando correctamente `tool_choice: "auto"` o las definiciones de tools
2. **Email no proporcionado**: El usuario no dio email, pero en lugar de pedir ese dato obligatorio, la IA "inventó" que creó el contacto
3. **Falta instrucción explícita**: El system prompt no es lo suficientemente enfático sobre **siempre usar** las funciones

### Solución Propuesta

Modificar la edge function `supabase/functions/chat/index.ts`:

#### 1. Cambiar el modelo a uno más confiable con function calling
```typescript
// Cambiar de:
model: "google/gemini-3-flash-preview"

// A:
model: "google/gemini-2.5-flash" // Más estable para function calling
```

#### 2. Reforzar el system prompt
Agregar instrucciones más explícitas para que el modelo **siempre** use las funciones:

```typescript
// En buildSystemPrompt, agregar al final:
## REGLAS ESTRICTAS:
1. NUNCA digas que creaste algo sin usar la función correspondiente
2. Si el usuario pide crear un contacto, USA create_contact - NO simules la creación
3. Si faltan datos obligatorios (email para contactos, nombre para empresas), PRIMERO pregunta por esos datos
4. Solo confirma la creación DESPUÉS de recibir el resultado de la función
```

#### 3. Mejorar el logging para debug
```typescript
console.log("AI response choice:", JSON.stringify(choice, null, 2));
```

#### 4. Considerar tool_choice más estricto
```typescript
// Opcionalmente forzar uso de herramientas cuando el mensaje sugiere creación:
tool_choice: messages[messages.length - 1]?.content?.toLowerCase().includes('crear') 
  ? { type: "function", function: { name: "create_contact" } }
  : "auto"
```

### Cambios en Archivos

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/chat/index.ts` | Cambiar modelo, reforzar prompt, mejorar logging |

### Flujo Corregido

```text
Usuario: "crear contacto Johnatan George 3122554920 Neuman Ceo"
    │
    ▼
IA detecta intención de crear contacto
    │
    ▼ (ANTES: respondía conversacionalmente ❌)
    ▼ (AHORA: usa función create_contact)
    │
IA responde: "Necesito el email para crear el contacto. ¿Cuál es?"
    │
    ▼
Usuario proporciona email
    │
    ▼
IA llama create_contact({ first_name: "Johnatan", last_name: "George", ... })
    │
    ▼
Edge function ejecuta INSERT en Supabase
    │
    ▼
IA confirma: "✅ Contacto creado exitosamente"
```

### Verificación

Después de implementar:
1. Probar creando un contacto con todos los datos incluyendo email
2. Verificar en los logs que aparece `"Executing tool: create_contact"`
3. Confirmar que el contacto aparece en la página de Contactos

