

# Fix: Nombre, foto y contacto en conversaciones de Instagram

## Problemas encontrados

Hay 3 problemas distintos visibles en la imagen:

### 1. El campo `profile_pic` no se sanitiza
ManyChat envia `{{profile pic url}}` cuando Instagram no provee foto. Este campo NO esta incluido en la sanitizacion del webhook, asi que se guarda literalmente en `external_avatar` y `avatar_url`. Por eso no se muestra foto.

### 2. El nombre no se muestra correctamente en el header
La logica en `ConversationView.tsx` y `ConversationItem.tsx` busca `contacts.first_name` + `contacts.last_name`. El contacto `16db4d67` tiene ambos en `NULL`, asi que cae al fallback `external_name` que es "JG" (nombre parcial). Pero el `instagram_username` ("tatangeorge") existe y seria mejor identificador.

La logica actual:
```
displayName = contacts.first_name + contacts.last_name || external_name || 'Sin nombre'
```

Deberia incluir `instagram_username` como fallback:
```
displayName = contacts.first_name + contacts.last_name || contacts.instagram_username || external_name || 'Sin nombre'
```

### 3. La segunda conversacion (05976d07) sigue con datos corruptos
Tiene un mensaje con contenido `{{last text input}}` y sender_name `{{full name}}` — estos se crearon ANTES del fix de sanitizacion. Tambien su contacto asociado (`4fba8556`) tiene `avatar_url: {{profile pic url}}` y metadata corrupta.

## Plan de implementacion

### Paso 1: Sanitizar `profile_pic` en el webhook
En `supabase/functions/manychat-webhook/index.ts`, agregar despues de la linea que sanitiza `last_widget_input`:
```typescript
payload.profile_pic = sanitize(payload.profile_pic) as any;
```

### Paso 2: Mejorar displayName en ConversationItem.tsx y ConversationView.tsx
Actualizar la logica de `displayName` en ambos componentes para incluir `instagram_username` y `metadata.ig_username` como fallbacks:

```typescript
const displayName = conversation.contacts 
  ? [conversation.contacts.first_name, conversation.contacts.last_name].filter(Boolean).join(' ') 
    || conversation.contacts.instagram_username
    || conversation.external_name 
    || 'Sin nombre'
  : conversation.external_name || 'Sin nombre';
```

Esto requiere que el query en `useConversations.ts` tambien traiga `instagram_username`:
```typescript
contacts:contact_id (id, first_name, last_name, email, avatar_url, instagram_username)
```

### Paso 3: Filtrar avatares con template strings en el frontend
En ambos componentes, validar que `avatarUrl` no contenga `{{`:
```typescript
const avatarUrl = (() => {
  const url = conversation.contacts?.avatar_url || conversation.external_avatar;
  return url && !url.includes('{{') ? url : undefined;
})();
```

### Paso 4: Limpiar datos corruptos existentes (SQL)

| Tabla | ID | Campo | Accion |
|---|---|---|---|
| conversations | a8a02b79 | external_avatar | SET NULL |
| conversations | a8a02b79 | external_name | SET 'tatangeorge' |
| conversations | 05976d07 | external_avatar | SET NULL |
| contacts | 16db4d67 | avatar_url | SET NULL |
| contacts | 4fba8556 | avatar_url | SET NULL |
| contacts | 4fba8556 | source_id | SET NULL (era `{{subscriber id}}`) |
| conversation_messages | 264d78fc | content | SET 'Mensaje de Instagram' |
| conversation_messages | 264d78fc | sender_name | SET 'Contacto Instagram' |

### Archivos a modificar

1. `supabase/functions/manychat-webhook/index.ts` — agregar sanitizacion de `profile_pic`
2. `src/hooks/useConversations.ts` — agregar `instagram_username` al select de contacts
3. `src/components/conversations/ConversationItem.tsx` — mejorar displayName y filtrar avatar
4. `src/components/conversations/ConversationView.tsx` — mejorar displayName y filtrar avatar

### Seccion tecnica

```text
Flujo actual:
  ManyChat: { profile_pic: "{{profile pic url}}", first_name: "JG" }
  → DB: avatar_url = "{{profile pic url}}", first_name = NULL
  → UI: <AvatarImage src="{{profile pic url}}" /> → imagen rota, nombre "JG"

Flujo corregido:
  ManyChat: { profile_pic: "{{profile pic url}}", ig_username: "tatangeorge" }
  → sanitize() → profile_pic = undefined, ig_username = "tatangeorge"
  → DB: avatar_url = NULL, external_name = "tatangeorge"
  → UI: <AvatarFallback>TA</AvatarFallback>, nombre "tatangeorge"
```

