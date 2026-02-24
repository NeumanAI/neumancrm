

# Fix: Datos de Instagram siguen corruptos y nombre incorrecto

## Diagnostico

La imagen muestra que los 4 mensajes nuevos de "hola" se guardaron con `sender_name: "JG"` y la conversacion aun tiene `external_avatar: "{{profile pic url}}"`. Hay 3 problemas:

### 1. La limpieza SQL anterior NO se aplico
Los datos en la base de datos siguen exactamente igual que antes:
- `conversations.a8a02b79.external_avatar` = `{{profile pic url}}` (debia ser NULL)
- `conversations.a8a02b79.external_name` = `JG` (debia ser `tatangeorge`)
- `conversations.05976d07.last_message_preview` = `{{last text input}}`

### 2. ManyChat envia `name: "JG"` que pasa la sanitizacion
La funcion `sanitize()` solo detecta `{{...}}`. Pero ManyChat envia `name: "JG"` (nombre parcial abreviado de Instagram) que es un string valido. La logica actual:
```
subscriberName = payload.name || [...first, last].join(' ') || ig_username
```
Prioriza `"JG"` sobre `"tatangeorge"`. Para Instagram, el `ig_username` es mejor identificador.

### 3. Los mensajes usan `subscriberName` como `sender_name`
Linea 417: `sender_name: subscriberName` → guarda "JG" en cada mensaje.

## Plan de implementacion

### Paso 1: Cambiar prioridad de nombre para canal Instagram
En `supabase/functions/manychat-webhook/index.ts`, linea 294-297, cambiar la logica para que en canal Instagram se priorice `ig_username`:

```typescript
const subscriberName = channel === 'instagram' && payload.ig_username
  ? payload.ig_username
  : (payload.name || 
     [payload.first_name, payload.last_name].filter(Boolean).join(' ') || 
     payload.ig_username || 'Suscriptor');
```

### Paso 2: Limpiar datos corruptos (de nuevo)
Ejecutar SQL para corregir los registros existentes:

| Tabla | ID | Cambio |
|---|---|---|
| conversations | a8a02b79 | external_avatar=NULL, external_name='tatangeorge' |
| conversations | 05976d07 | external_avatar=NULL, last_message_preview='Mensaje de Instagram' |
| conversation_messages (4 nuevos) | bf114c2a, 5538df1a, 6a45949d, ae6f882e | sender_name='tatangeorge' |
| conversation_messages | 264d78fc | content='Mensaje de Instagram', sender_name='tatangeorge' |

### Paso 3: Actualizar first_name del contacto como fallback
El contacto `16db4d67` tiene `first_name: NULL` y `instagram_username: tatangeorge`. Actualizar `first_name` a `tatangeorge` para que el UI lo muestre correctamente en todos los contextos.

### Archivos a modificar
1. `supabase/functions/manychat-webhook/index.ts` — priorizar ig_username en canal Instagram (1 cambio, ~3 lineas)

### Seccion tecnica

```text
Flujo actual (Instagram):
  ManyChat: { name: "JG", ig_username: "tatangeorge" }
  → subscriberName = "JG" (name tiene prioridad)
  → sender_name = "JG", external_name = "JG"

Flujo corregido:
  ManyChat: { name: "JG", ig_username: "tatangeorge" }
  → channel === 'instagram' && ig_username → subscriberName = "tatangeorge"
  → sender_name = "tatangeorge", external_name = "tatangeorge"
```

