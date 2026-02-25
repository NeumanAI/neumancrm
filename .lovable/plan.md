

# Estado de la integración Bitancorp Webchat → CRM

## Diagnóstico

El endpoint `n8n-chat` está funcionando correctamente. Acabo de hacer una prueba directa y respondió con éxito (HTTP 200), creando conversación, contacto, notificación y timeline.

Sin embargo, **no hay ninguna conversación real de webchat en la base de datos** (solo mi prueba). Esto significa que los mensajes de Bitancorp **no están llegando** al endpoint.

## Posibles causas

1. **URL incorrecta en Bitancorp**: Deben estar apuntando a:
   ```
   https://vzqjoiapwgsbvsknrlqk.supabase.co/functions/v1/n8n-chat
   ```

2. **Payload incorrecto**: El body JSON debe incluir estos campos obligatorios:
   ```json
   {
     "session_id": "<id-unico-por-sesion>",
     "message": "<texto-del-visitante>",
     "user_id": "e595967d-a0cc-4cf2-ba94-32aa81d3eee0",
     "organization_id": "5179d17c-7107-46ea-ba1a-88a029bf74d9",
     "visitor_name": "<nombre-opcional>",
     "visitor_email": "<email-opcional>"
   }
   ```

3. **Header faltante**: La llamada necesita el header:
   ```
   Content-Type: application/json
   apikey: <anon-key>
   ```
   El `apikey` header es requerido por el gateway aunque `verify_jwt = false`.

4. **Fire-and-forget sin verificación**: Si Bitancorp no verifica la respuesta, puede que esté fallando silenciosamente (por ejemplo, un 401 por falta de `apikey`).

## Plan de acción

### Paso 1: Verificar qué está enviando Bitancorp
Necesito que me compartas:
- La URL exacta que configuraste en el webhook de Bitancorp
- El formato del payload que están enviando
- Si hay algún log o respuesta de error en el lado de Bitancorp

### Paso 2: Limpiar datos de prueba
Hay que eliminar la conversación y contacto de prueba que acabo de crear.

### Paso 3: Si el problema es el `apikey`
El endpoint necesita el header `apikey` para pasar el gateway de Supabase. Si Bitancorp no lo incluye, podemos agregar autenticación por un token personalizado en el body (como un campo `api_key`) y validarlo dentro de la función.

---

**Necesito que me confirmes qué configuración tiene Bitancorp exactamente** (URL, headers, payload) para identificar dónde está la desconexión.

