

# Plan: Auto-Creación y Vinculación de Leads desde Conversaciones

## Objetivo

Cada conversación que llegue desde cualquier canal (WhatsApp, Instagram, Webchat, etc.) debe automáticamente:
1. **Buscar** un contacto existente por teléfono, email o datos coincidentes
2. **Crear** un nuevo contacto/lead si no existe
3. **Actualizar** el contacto existente con nuevos datos si ya existe
4. **Vincular** la conversación al contacto
5. **Notificar** al usuario sobre nuevos leads creados

---

## Estado Actual vs Estado Deseado

| Aspecto | Actualmente | Propuesto |
|---------|-------------|-----------|
| ManyChat webhook | Solo busca contactos existentes | Crea contacto si no existe |
| Webchat (n8n) | No vincula a contactos | Busca/crea contacto automáticamente |
| Datos del contacto | No se actualizan | Se enriquecen con cada interacción |
| Notificaciones | Solo para conversaciones | También para nuevos leads |
| Visibilidad | Contacto y conversación desconectados | Vista unificada |

---

## Arquitectura de la Solución

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        WEBHOOK RECIBE MENSAJE                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FUNCIÓN: findOrCreateContact()                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Extraer datos del mensaje/suscriptor:                                       │
│     - Nombre, Teléfono, Email, Avatar, Username (IG)                           │
│                                                                                 │
│  2. Buscar contacto existente por:                                             │
│     ┌───────────────────────────────────────────────────────────────────────┐  │
│     │  Prioridad 1: email exacto                                            │  │
│     │  Prioridad 2: phone/mobile/whatsapp_number                            │  │
│     │  Prioridad 3: metadata.ig_username (para Instagram)                   │  │
│     │  Prioridad 4: metadata.manychat_id                                    │  │
│     └───────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  3. Si existe → Actualizar con nuevos datos                                    │
│     Si no existe → Crear nuevo contacto                                        │
│                                                                                 │
│  4. Retornar contact_id                                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CREAR/ACTUALIZAR CONVERSACIÓN                                │
│                    con contact_id vinculado                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SI ES NUEVO CONTACTO                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  - Crear notificación "Nuevo lead desde {canal}"                               │
│  - Agregar entrada en timeline "Primer contacto vía {canal}"                   │
│  - Marcar origen del contacto (source: webchat/whatsapp/instagram)             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### 1. Agregar campos a tabla `contacts`

| Campo Nuevo | Tipo | Descripción |
|-------------|------|-------------|
| `source` | text | Canal de origen (webchat, whatsapp, instagram, manual, import) |
| `source_id` | text | ID externo (subscriber_id de ManyChat, session_id de webchat) |
| `instagram_username` | text | Username de Instagram para matching |
| `metadata` | jsonb | Datos adicionales del canal original |

### 2. SQL Migration

```sql
-- Agregar campos de origen a contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_id text,
ADD COLUMN IF NOT EXISTS instagram_username text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Índice para búsqueda rápida por source_id
CREATE INDEX IF NOT EXISTS idx_contacts_source_id ON public.contacts(source_id);
CREATE INDEX IF NOT EXISTS idx_contacts_instagram_username ON public.contacts(instagram_username);
```

---

## Lógica de Matching y Creación

### Función utilitaria `findOrCreateContact`

Se creará una función reutilizable en los Edge Functions que:

```typescript
interface ContactMatchData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  instagram_username?: string;
  manychat_subscriber_id?: string;
  avatar_url?: string;
  source: 'webchat' | 'whatsapp' | 'instagram' | 'messenger' | 'email';
}

async function findOrCreateContact(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string | null,
  data: ContactMatchData
): Promise<{ contactId: string; isNew: boolean }>
```

### Reglas de Matching (en orden de prioridad)

1. **Email exacto** - match más confiable
2. **Teléfono normalizado** - busca en phone, mobile, whatsapp_number
3. **Instagram username** - para canales de Instagram
4. **ManyChat subscriber_id** - en metadata.manychat_id

### Reglas de Creación

Si no se encuentra match:
- Generar email temporal si no hay uno: `{phone}@lead.crm.local` o `{timestamp}@webchat.crm.local`
- Marcar `source` con el canal de origen
- Guardar `source_id` para futuro matching
- Copiar avatar si está disponible

### Reglas de Actualización

Si se encuentra match:
- **Agregar** datos faltantes (no sobrescribir existentes)
- **Actualizar** `last_contacted_at`
- **Enriquecer** metadata con nuevos datos del canal

---

## Cambios en Edge Functions

### 1. manychat-webhook/index.ts

**Cambios:**
- Importar/implementar función `findOrCreateContact`
- Llamar a la función antes de crear la conversación
- Usar el `contact_id` retornado
- Crear notificación si es nuevo lead
- Crear entrada en timeline para el primer contacto

### 2. n8n-chat/index.ts

**Cambios:**
- Agregar lógica de `findOrCreateContact`
- Crear contacto desde datos del visitor (nombre, email)
- Vincular conversación al contacto
- Crear notificación para nuevos leads de webchat

### 3. Nuevo archivo: _shared/contact-utils.ts

Crear funciones compartidas para:
- `findOrCreateContact()` - buscar o crear contacto
- `normalizePhone()` - normalizar números de teléfono
- `createLeadNotification()` - crear notificación de nuevo lead
- `createTimelineEntry()` - crear entrada en timeline

---

## Notificaciones de Nuevos Leads

Cuando se crea un nuevo contacto desde una conversación:

```typescript
await supabase.from('notifications').insert({
  user_id: crmUserId,
  type: 'new_contact',
  title: `Nuevo lead desde ${channelName}`,
  message: `${contactName} te ha contactado por primera vez vía ${channelName}`,
  priority: 'high',
  entity_type: 'contact',
  entity_id: newContactId,
  action_url: `/contacts/${newContactId}`,
});
```

---

## Timeline Entry Automático

Registrar el primer contacto en la línea de tiempo:

```typescript
await supabase.from('timeline_entries').insert({
  user_id: crmUserId,
  contact_id: newContactId,
  entry_type: channel, // 'whatsapp', 'instagram', 'webchat'
  source: 'auto',
  subject: `Primer contacto vía ${channelName}`,
  body: `${contactName} inició una conversación a través de ${channelName}`,
  metadata: {
    channel,
    subscriber_id: externalId,
    auto_created: true,
  },
  occurred_at: new Date().toISOString(),
});
```

---

## Orden de Implementación

### Fase 1: Base de Datos
1. Crear migración SQL para agregar campos a `contacts`
2. Crear índices para búsqueda eficiente

### Fase 2: Funciones Utilitarias
1. Crear archivo de utilidades compartidas
2. Implementar `findOrCreateContact`
3. Implementar `normalizePhone`
4. Implementar helpers de notificación y timeline

### Fase 3: Actualizar Webhooks
1. Modificar `manychat-webhook` con auto-creación
2. Modificar `n8n-chat` con auto-creación
3. Agregar manejo de errores robusto

### Fase 4: Pruebas
1. Probar con mensaje de ManyChat (WhatsApp)
2. Probar con mensaje de Webchat
3. Verificar que contactos duplicados no se crean
4. Verificar actualización de datos existentes

---

## Archivos a Crear/Modificar

| Tipo | Archivo | Acción |
|------|---------|--------|
| SQL | Nueva migración | Agregar campos source, source_id, instagram_username, metadata a contacts |
| Edge Function | `supabase/functions/manychat-webhook/index.ts` | Modificar - agregar auto-creación de leads |
| Edge Function | `supabase/functions/n8n-chat/index.ts` | Modificar - agregar auto-creación de leads |
| Tipos | `src/types/crm.ts` | Modificar - agregar nuevos campos a Contact |

---

## Resultado Esperado

1. **Cada conversación entrante** crea o vincula automáticamente un contacto
2. **Los datos del contacto** se enriquecen con cada interacción
3. **El usuario recibe notificación** cuando llega un nuevo lead
4. **La línea de tiempo** registra el primer contacto
5. **No se crean duplicados** gracias al matching inteligente
6. **Trazabilidad completa** del origen de cada lead

---

## Sección Técnica Detallada

### Normalización de Teléfonos

```typescript
function normalizePhone(phone: string): string {
  // Eliminar espacios, guiones, paréntesis
  let normalized = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Si empieza con 00, reemplazar por +
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.slice(2);
  }
  
  // Si no tiene prefijo internacional y tiene 10 dígitos, es local
  if (!normalized.startsWith('+') && normalized.length === 10) {
    // Asumir México por defecto (configurable)
    normalized = '+52' + normalized;
  }
  
  return normalized;
}
```

### Email Temporal para Leads sin Email

```typescript
function generateTemporaryEmail(data: ContactMatchData): string {
  if (data.phone) {
    return `${normalizePhone(data.phone).replace('+', '')}@lead.crm.local`;
  }
  if (data.instagram_username) {
    return `${data.instagram_username}@instagram.lead.local`;
  }
  return `lead_${Date.now()}@webchat.lead.local`;
}
```

### Query de Búsqueda de Contacto

```sql
SELECT id, email, phone, mobile, whatsapp_number, source_id, metadata
FROM contacts
WHERE user_id = $1
  AND (
    email = $2
    OR phone = $3 
    OR mobile = $3
    OR whatsapp_number = $3
    OR instagram_username = $4
    OR (metadata->>'manychat_id')::text = $5
  )
LIMIT 1;
```

