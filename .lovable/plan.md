

# Fix: Template Strings de ManyChat en Conversaciones y Contactos

## Problema

La imagen confirma que el problema persiste. ManyChat envía literalmente `{{last_name}}`, `{{email}}`, `{{last text input}}`, `{{ig username}}` cuando Instagram no proporciona esos datos. El webhook los guarda tal cual en la base de datos.

La corrección anterior (función `sanitizeManyChatValue`) **nunca se guardó** en el archivo — el código actual no tiene ninguna sanitización.

## Datos corruptos actuales

| Tabla | Campo | Valor corrupto |
|---|---|---|
| `conversations` a8a02b79 | external_email | `{{email}}` |
| `conversations` a8a02b79 | external_name | `JG` (parcial, falta apellido) |
| `conversations` 05976d07 | metadata.ig_username | `{{ig username}}` |
| `contacts` 16db4d67 | last_name | `{{last_name}}` |
| `contacts` 16db4d67 | email | `{{email}}` |
| `contacts` 16db4d67 | first_name | `JG` (parcial) |

## Plan de implementacion

### 1. Agregar sanitizacion al webhook `manychat-webhook/index.ts`

Agregar una funcion `sanitize` que detecte cualquier valor que contenga `{{` y `}}` y lo convierta en `undefined`:

```typescript
function sanitize(val?: string): string | undefined {
  if (!val || val.includes('{{')) return undefined;
  return val.trim() || undefined;
}
```

Aplicarla a todos los campos del payload antes de usarlos:
- `payload.first_name`, `payload.last_name`, `payload.name`
- `payload.email`
- `payload.phone`, `payload.wa_phone`
- `payload.ig_username`
- `payload.last_input_text`, `payload.last_widget_input`

Actualizar la logica de `subscriberName` para usar `ig_username` como fallback:

```typescript
const subscriberName = sanitize(payload.name) || 
  [sanitize(payload.first_name), sanitize(payload.last_name)].filter(Boolean).join(' ') || 
  sanitize(payload.ig_username) || 'Suscriptor';
```

### 2. Limpiar datos corruptos existentes (SQL)

Ejecutar updates para corregir los registros ya guardados:

- **Conversacion a8a02b79**: Limpiar `external_email` a NULL, usar `tatangeorge` como nombre (del metadata.ig_username)
- **Conversacion 05976d07**: Limpiar metadata corrupta
- **Contacto 16db4d67**: Limpiar `last_name` y `email`, generar email temporal con ig_username
- **Contacto 4fba8556**: Ya fue parcialmente limpiado pero verificar

### 3. Archivos a modificar

Solo un archivo:
- `supabase/functions/manychat-webhook/index.ts` — agregar funcion `sanitize()` y aplicarla en ~6 puntos del codigo

### Seccion tecnica

```text
ManyChat payload con campos vacios:
  { first_name: "{{first name}}", email: "{{email}}", ig_username: "tatangeorge" }
                    ↓ sanitize()
  { first_name: undefined, email: undefined, ig_username: "tatangeorge" }
                    ↓
  subscriberName = "tatangeorge"
  email = "tatangeorge@instagram.lead.local"
```

La funcion `sanitize` se aplica una sola vez al recibir el payload, antes de cualquier logica de negocio. Esto previene que datos corruptos lleguen a las tablas `conversations`, `contacts`, `timeline_entries` y `notifications`.

