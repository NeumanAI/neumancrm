

# Plan: Panel de Configuración de Canales de Conversación

## Resumen Ejecutivo

Crear una interfaz completa en **Configuración → Integraciones** que permita a los usuarios activar, configurar y gestionar todos los canales de conversación (ManyChat, Webchat, Gmail) de forma visual e intuitiva, con instrucciones paso a paso y validación de conexión.

---

## Vista General de la Solución

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN → INTEGRACIONES                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  GMAIL (existente)                                              [OAuth]  │ │
│  │  ✓ Conectado - juan@empresa.com                                         │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  MANYCHAT                                                      [Nuevo]   │ │
│  │  Conecta WhatsApp, Instagram y Messenger                                │ │
│  │                                                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐│ │
│  │  │  Paso 1: Ingresa tu API Key de ManyChat                            ││ │
│  │  │  [●●●●●●●●●●●●●●●●●●●●]  [Guardar]                                 ││ │
│  │  │                                                                     ││ │
│  │  │  Paso 2: Configura el webhook en ManyChat                          ││ │
│  │  │  URL: https://xxx.supabase.co/functions/v1/manychat-webhook       ││ │
│  │  │  [Copiar URL]                                                       ││ │
│  │  │                                                                     ││ │
│  │  │  Paso 3: Agrega estos campos en tu flujo de ManyChat              ││ │
│  │  │  - crm_user_id: "tu-user-id"                                       ││ │
│  │  │  - crm_organization_id: "tu-org-id"                                ││ │
│  │  │  [Copiar valores]                                                   ││ │
│  │  │                                                                     ││ │
│  │  │  [Probar conexión]                                                 ││ │
│  │  └─────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                          │ │
│  │  Canales habilitados:                                                    │ │
│  │  [✓] WhatsApp  [✓] Instagram  [✓] Messenger                             │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  WEBCHAT                                                       [Nuevo]   │ │
│  │  Widget de chat para tu sitio web                                       │ │
│  │                                                                          │ │
│  │  Estado: Activo                                                          │ │
│  │  Respuestas automáticas: Desactivadas / n8n configurado                 │ │
│  │                                                                          │ │
│  │  [Configurar Widget]  [Obtener código de inserción]                     │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Nuevos Canales a Configurar

### 1. ManyChat (WhatsApp, Instagram, Messenger)

| Elemento | Descripción |
|----------|-------------|
| API Key | Token de API para enviar mensajes salientes |
| Webhook URL | URL que ManyChat llamará al recibir mensajes |
| Campos CRM | `crm_user_id` y `crm_organization_id` para vincular conversaciones |
| Test de conexión | Verificar que la API Key es válida |

### 2. Webchat

| Elemento | Descripción |
|----------|-------------|
| Habilitado | Toggle para activar/desactivar el canal |
| URL de n8n (opcional) | Webhook para respuestas automáticas con IA |
| Código embebible | Script para insertar el widget en sitios externos |
| Personalización | Colores, mensaje de bienvenida, posición |

### 3. Gmail (ya existente, mejorar)

- Ya funciona con OAuth
- Agregar sección de "canales activos" para mostrar junto a ManyChat y Webchat

---

## Cambios en Base de Datos

### Actualizar tipos de provider en `integrations`

El campo `provider` actualmente solo acepta `'gmail' | 'whatsapp'`. Necesitamos expandirlo para soportar:

- `gmail` (existente)
- `whatsapp` (existente pero se fusionará con manychat)
- `manychat` (nuevo - agrupa WhatsApp, Instagram, Messenger)
- `webchat` (nuevo)

### Estructura de metadata por provider

**ManyChat:**
```json
{
  "api_key_configured": true,
  "channels_enabled": ["whatsapp", "instagram", "messenger"],
  "last_test_at": "2024-01-15T...",
  "test_status": "success"
}
```

**Webchat:**
```json
{
  "widget_enabled": true,
  "n8n_webhook_url": "https://...",
  "widget_config": {
    "position": "bottom-right",
    "primary_color": "#3B82F6",
    "welcome_message": "¡Hola! ¿En qué podemos ayudarte?"
  }
}
```

---

## Cambios en el Código

### 1. Actualizar tipos (`src/types/integrations.ts`)

Expandir el tipo `Integration` para incluir los nuevos providers:

```typescript
export interface Integration {
  id: string;
  user_id: string;
  provider: 'gmail' | 'manychat' | 'webchat';
  // ... resto igual
}

export interface ManyChatConfig {
  api_key_configured: boolean;
  channels_enabled: ('whatsapp' | 'instagram' | 'messenger')[];
  last_test_at?: string;
  test_status?: 'success' | 'error' | 'pending';
}

export interface WebchatConfig {
  widget_enabled: boolean;
  n8n_webhook_url?: string;
  widget_config: {
    position: 'bottom-right' | 'bottom-left';
    primary_color: string;
    welcome_message: string;
  };
}
```

### 2. Actualizar hook (`src/hooks/useIntegrations.ts`)

- Agregar función `getIntegration` para `manychat` y `webchat`
- Agregar mutación para guardar API Key de ManyChat
- Agregar mutación para configurar Webchat

### 3. Refactorizar `IntegrationsTab.tsx`

Dividir en componentes más pequeños:
- `GmailIntegrationCard.tsx` (extraer lógica existente)
- `ManyChatIntegrationCard.tsx` (nuevo)
- `WebchatIntegrationCard.tsx` (nuevo)

### 4. Crear componente `ManyChatIntegrationCard.tsx`

**Funcionalidades:**
- Input enmascarado para API Key
- Botón para guardar API Key (llama a Edge Function que guarda en secrets)
- Sección de instrucciones con webhook URL copiable
- Valores de CRM (user_id, organization_id) copiables
- Botón "Probar conexión" que valida la API Key
- Checkboxes para canales habilitados

### 5. Crear componente `WebchatIntegrationCard.tsx`

**Funcionalidades:**
- Toggle para habilitar/deshabilitar
- Input para URL de n8n (opcional)
- Sección de personalización del widget
- Botón para obtener código de inserción (genera script embebible)
- Vista previa del widget

### 6. Crear Edge Function `save-integration-secret`

Nueva función para guardar API Keys de forma segura:
- Recibe: `{ provider: string, api_key: string }`
- Guarda en Supabase secrets (vía SQL o API interna)
- Actualiza la integración con `api_key_configured: true`

### 7. Crear Edge Function `test-manychat-connection`

Valida que la API Key de ManyChat es correcta:
- Llama a la API de ManyChat para obtener info de la cuenta
- Retorna resultado de validación

---

## Flujo de Configuración para el Usuario

### Configurar ManyChat (WhatsApp/Instagram)

1. El usuario va a **Configuración → Integraciones**
2. En la tarjeta de ManyChat, hace clic en "Configurar"
3. Sigue los pasos visuales:
   - **Paso 1:** Ingresa su API Key de ManyChat (obtenida de manychat.com → Settings → API)
   - **Paso 2:** Copia la Webhook URL y la pega en ManyChat (Flow → External Request)
   - **Paso 3:** Copia los valores `crm_user_id` y `crm_organization_id` para agregarlos al flujo
4. Hace clic en "Probar conexión" para verificar
5. Activa los canales deseados (WhatsApp, Instagram, Messenger)

### Configurar Webchat

1. El usuario va a **Configuración → Integraciones**
2. En la tarjeta de Webchat, hace clic en "Configurar"
3. Activa el widget
4. (Opcional) Configura la URL de n8n para respuestas automáticas
5. Personaliza colores y mensaje de bienvenida
6. Copia el código de inserción y lo pega en su sitio web

---

## Archivos a Crear/Modificar

| Tipo | Archivo | Acción |
|------|---------|--------|
| Tipos | `src/types/integrations.ts` | Modificar - agregar tipos para ManyChat y Webchat |
| Hook | `src/hooks/useIntegrations.ts` | Modificar - agregar soporte para nuevos providers |
| Componente | `src/components/settings/IntegrationsTab.tsx` | Modificar - refactorizar layout |
| Componente | `src/components/settings/GmailIntegrationCard.tsx` | Crear - extraer lógica existente |
| Componente | `src/components/settings/ManyChatIntegrationCard.tsx` | Crear |
| Componente | `src/components/settings/WebchatIntegrationCard.tsx` | Crear |
| Componente | `src/components/settings/WebchatWidgetPreview.tsx` | Crear |
| Componente | `src/components/settings/IntegrationSteps.tsx` | Crear - componente reutilizable de pasos |
| Edge Function | `supabase/functions/save-integration-secret/index.ts` | Crear |
| Edge Function | `supabase/functions/test-manychat-connection/index.ts` | Crear |
| Config | `supabase/config.toml` | Modificar - agregar nuevas funciones |

---

## Orden de Implementación

### Fase 1: Preparación
1. Actualizar tipos en `src/types/integrations.ts`
2. Actualizar hook `useIntegrations.ts` con nuevos métodos

### Fase 2: Edge Functions
1. Crear `save-integration-secret` para guardar API Keys
2. Crear `test-manychat-connection` para validar conexión

### Fase 3: Componentes de UI
1. Crear `IntegrationSteps.tsx` (componente reutilizable)
2. Extraer `GmailIntegrationCard.tsx` del código existente
3. Crear `ManyChatIntegrationCard.tsx` con instrucciones paso a paso
4. Crear `WebchatIntegrationCard.tsx` con código embebible
5. Refactorizar `IntegrationsTab.tsx` para usar los nuevos componentes

### Fase 4: Widget Embebible
1. Crear `WebchatWidgetPreview.tsx` para vista previa
2. Generar código de inserción para sitios externos

---

## Resultado Esperado

Al completar esta implementación:

1. **Configuración Visual**: Panel intuitivo para configurar todos los canales
2. **Instrucciones Claras**: Pasos numerados con valores copiables
3. **Validación de Conexión**: Botón para probar que todo funciona
4. **Código Embebible**: Script listo para copiar e insertar en sitios web
5. **Gestión Centralizada**: Todos los canales en un solo lugar
6. **Seguridad**: API Keys guardadas de forma segura en secrets

---

## Sección Técnica

### Guardado de API Keys

Las API Keys se guardarán de dos formas:
1. **En metadata** de la tabla `integrations`: Solo un flag `api_key_configured: true`
2. **En Supabase Secrets**: El valor real de la API Key, accesible solo desde Edge Functions

### Código del Widget Webchat

El código generado para insertar en sitios externos será similar a:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://tu-proyecto.lovable.app/webchat-widget.js';
    script.async = true;
    script.dataset.crmUserId = 'USER_ID';
    script.dataset.crmOrgId = 'ORG_ID';
    script.dataset.primaryColor = '#3B82F6';
    document.body.appendChild(script);
  })();
</script>
```

### Test de Conexión ManyChat

```typescript
// Llamada a la API de ManyChat para verificar
const response = await fetch('https://api.manychat.com/fb/page/getInfo', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

