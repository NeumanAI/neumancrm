

## Diagnóstico: Por qué el fetch de Bitancorp no llega al CRM

### El código compartido es correcto
El fetch que pegaste tiene la URL, apikey, headers y payload correctos. El endpoint funciona (acabo de verificarlo con una prueba directa exitosa).

### Causa más probable: el código no se está ejecutando

Dado que hay **cero solicitudes** en los logs del servidor (ni siquiera un OPTIONS preflight), las posibilidades son:

1. **El código no está desplegado**: El cambio aún no se publicó en producción en Bitancorp
2. **Error JavaScript antes del fetch**: Algún error en el código previo impide que se llegue a ejecutar el `fetch`
3. **La variable `sessionId` o `userMessage.content` es undefined**: Si `sessionId` es `undefined`, el `JSON.stringify` producirá un payload inválido o el fetch fallará silenciosamente

### Verificación necesaria (lado Bitancorp)

Necesitas abrir la consola del navegador (F12 → Console) en el sitio de Bitancorp, enviar un mensaje en el webchat, y buscar:
- Errores JavaScript en rojo
- El mensaje `"CRM Neuman sync error:"` (que indica que el `.catch` capturó un error)
- Si no aparece nada, significa que el código no se está ejecutando

### Plan de acción

**Paso 1: Agregar un log visible antes del fetch en Bitancorp**

Modificar el código en Bitancorp para agregar un `console.log` antes del fetch:

```javascript
console.log(">>> CRM Neuman: enviando mensaje", { sessionId, message: userMessage.content });

fetch("https://vzqjoiapwgsbvsknrlqk.supabase.co/functions/v1/n8n-chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": "eyJ...",
  },
  body: JSON.stringify({
    session_id: sessionId,
    message: userMessage.content,
    visitor_name: "Visitante Web",
    visitor_email: "",
    user_id: "e595967d-a0cc-4cf2-ba94-32aa81d3eee0",
    organization_id: "5179d17c-7107-46ea-ba1a-88a029bf74d9",
  }),
})
.then(res => console.log(">>> CRM Neuman: respuesta", res.status))
.catch((err) => console.error("CRM Neuman sync error:", err));
```

**Paso 2: Verificar que el código esté en producción**

Confirmar que el archivo con el fetch fue desplegado/publicado en el sitio web de Bitancorp.

**Paso 3: Verificar las variables**

Asegurarse de que `sessionId` y `userMessage.content` tengan valores válidos en el momento del fetch. Si alguna es `undefined`, el endpoint rechazará la solicitud con un 400.

### Detalle técnico

- El endpoint `n8n-chat` responde correctamente (HTTP 200, crea conversación y contacto)
- Los CORS están configurados con `Access-Control-Allow-Origin: *` y aceptan el header `apikey`
- El `verify_jwt = false` está configurado en `config.toml`
- No hay ningún problema del lado del CRM; el bloqueo está en que el fetch nunca se ejecuta desde el navegador del visitante

