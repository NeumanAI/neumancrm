

# Plan: Fase 1 - Potenciar la IA del CRM

## Vision General

Esta fase transforma el CRM en un sistema verdaderamente "AI-native" donde la inteligencia artificial no es solo un chat, sino el motor que automatiza la captura de datos, genera insights proactivos y guía las acciones del usuario.

---

## Arquitectura de la Fase 1

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASE 1: IA POTENCIADA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    1.1 GMAIL SYNC COMPLETO                           │   │
│  │  ┌──────────┐      ┌──────────────┐      ┌─────────────────────┐   │   │
│  │  │ Gmail    │ ---> │ process-     │ ---> │ Timeline +          │   │   │
│  │  │ API      │      │ emails       │      │ Contactos + Tasks   │   │   │
│  │  └──────────┘      │ (IA Gemini)  │      └─────────────────────┘   │   │
│  │                    └──────────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    1.2 DAILY AI SUMMARY                              │   │
│  │  ┌──────────┐      ┌──────────────┐      ┌─────────────────────┐   │   │
│  │  │ Login    │ ---> │ generate-    │ ---> │ Modal de Resumen    │   │   │
│  │  │ User     │      │ daily-brief  │      │ del Dia             │   │   │
│  │  └──────────┘      │ (IA Gemini)  │      └─────────────────────┘   │   │
│  │                    └──────────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    1.3 AI INSIGHTS DASHBOARD                         │   │
│  │  ┌──────────┐      ┌──────────────┐      ┌─────────────────────┐   │   │
│  │  │ CRM      │ ---> │ generate-    │ ---> │ Cards en Dashboard  │   │   │
│  │  │ Data     │      │ insights     │      │ con Recomendaciones │   │   │
│  │  └──────────┘      │ (IA Gemini)  │      └─────────────────────┘   │   │
│  │                    └──────────────┘                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.1 Gmail Sync Completo

### Estado Actual

El proyecto ya tiene:
- OAuth de Gmail implementado (`gmail-auth` y `gmail-callback`)
- Tabla `integrations` para almacenar tokens
- UI en Settings para conectar Gmail

Falta:
- Edge function `process-emails` que lee y procesa emails
- Almacenamiento de tokens en `integrations` (el callback actual no guarda tokens)
- Cron job para sincronizacion automatica

### Tareas de Implementacion

#### 1.1.1 Arreglar Gmail Callback

Modificar `gmail-callback/index.ts` para:
- Recibir el `user_id` via parametro `state` en OAuth
- Guardar `access_token` y `refresh_token` en tabla `integrations`
- Guardar email del usuario en metadata

#### 1.1.2 Crear Edge Function `process-emails`

Nueva funcion que:
1. Obtiene tokens de Gmail desde `integrations`
2. Llama a Gmail API para obtener emails recientes (desde last_synced_at)
3. Por cada email:
   - Extrae remitente, destinatarios, asunto, cuerpo
   - Usa Gemini para analizar y extraer:
     - Contactos mencionados (nombre, cargo, empresa)
     - Action items / compromisos
     - Si detecta oportunidad comercial
     - Resumen de la conversacion
4. Crea/actualiza contactos y empresas
5. Crea entrada en `timeline_entries` con tipo "email"
6. Actualiza `last_synced_at` en `integrations`

Estructura del prompt de IA:

```text
Analiza este email y extrae informacion en JSON:
{
  "contacts": [{ name, email, job_title, company }],
  "action_items": [{ task, due_date, assignee }],
  "opportunity": { detected: boolean, title, estimated_value },
  "summary": "resumen en 1-2 oraciones",
  "sentiment": "positive" | "neutral" | "negative"
}
```

#### 1.1.3 Modificar UI de Integraciones

En `IntegrationsTab.tsx`:
- Pasar `user_id` via state parameter al OAuth flow
- Mostrar progreso de sincronizacion
- Mostrar ultimo email sincronizado

#### 1.1.4 Configurar Cron Job

Crear job SQL para ejecutar `process-emails` cada 5 minutos:
- Usa `pg_cron` y `pg_net`
- Llama a la edge function con service role

---

## 1.2 Resumen Diario con IA

### Descripcion

Al hacer login, el usuario ve un modal con un resumen inteligente del dia:
- Tareas vencidas y proximas
- Deals en riesgo (sin actividad reciente)
- Nuevas interacciones detectadas
- Sugerencias de "next best action"

### Tareas de Implementacion

#### 1.2.1 Crear Edge Function `generate-daily-brief`

Funcion que:
1. Recibe user_id del usuario autenticado
2. Consulta datos del CRM:
   - Tareas vencidas (due_date < hoy y no completadas)
   - Tareas de hoy
   - Oportunidades sin actividad en 7+ dias
   - Emails/interacciones nuevos en ultimas 24h
3. Usa Gemini para generar resumen personalizado:
   - Prioridades del dia
   - Alertas importantes
   - Sugerencias de accion
4. Retorna JSON estructurado

#### 1.2.2 Crear Componente `DailyBriefModal`

Modal que:
- Se muestra al hacer login (primera visita del dia)
- Guarda en localStorage la fecha del ultimo brief visto
- Muestra el resumen con secciones:
  - Prioridades (tareas urgentes)
  - Alertas (deals en riesgo)
  - Sugerencias de IA
- Acciones rapidas: "Ir a Tareas", "Ir a Pipeline"

#### 1.2.3 Integrar en Layout

En `AppLayout.tsx`:
- Verificar si es primera visita del dia
- Si es primera visita, llamar a `generate-daily-brief`
- Mostrar `DailyBriefModal` con la respuesta

---

## 1.3 AI Insights en Dashboard

### Descripcion

Nueva seccion en Dashboard que muestra:
- Deals en riesgo (sin actividad reciente)
- Contactos que necesitan follow-up
- Patrones detectados en el pipeline
- Recomendaciones proactivas de la IA

### Tareas de Implementacion

#### 1.3.1 Crear Edge Function `generate-insights`

Funcion que:
1. Recibe user_id del usuario autenticado
2. Analiza datos del CRM:
   - Oportunidades por etapa y tiempo en cada una
   - Actividad reciente por contacto
   - Tasa de conversion por etapa
   - Patrones de deals ganados vs perdidos
3. Usa Gemini para generar insights:
   - Top 3 deals en riesgo
   - Top 3 contactos para hacer follow-up
   - Predicciones de cierre
   - Recomendaciones de accion
4. Retorna JSON estructurado

#### 1.3.2 Crear Hook `useAIInsights`

Hook que:
- Llama a `generate-insights` 
- Cachea resultado por 1 hora (staleTime)
- Expone loading, error, data

#### 1.3.3 Crear Componente `AIInsightsCard`

Card para Dashboard que muestra:
- Icono de sparkles/IA
- Seccion "Deals en Riesgo" con lista clickable
- Seccion "Necesitan Follow-up" con avatares de contactos
- Seccion "Sugerencias de IA" con bullets
- Link "Ver mas detalles" 

#### 1.3.4 Integrar en Dashboard

Modificar `Dashboard.tsx`:
- Agregar `AIInsightsCard` como nueva seccion
- Posicionar prominentemente (arriba de los graficos)

---

## Archivos a Crear

| Archivo | Proposito |
|---------|-----------|
| `supabase/functions/process-emails/index.ts` | Sincroniza emails de Gmail |
| `supabase/functions/generate-daily-brief/index.ts` | Genera resumen diario |
| `supabase/functions/generate-insights/index.ts` | Genera insights de IA |
| `src/components/dashboard/AIInsightsCard.tsx` | Card de insights en Dashboard |
| `src/components/layout/DailyBriefModal.tsx` | Modal de resumen diario |
| `src/hooks/useAIInsights.ts` | Hook para obtener insights |
| `src/hooks/useDailyBrief.ts` | Hook para resumen diario |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/gmail-callback/index.ts` | Guardar tokens en DB |
| `supabase/functions/gmail-auth/index.ts` | Pasar user_id via state |
| `src/components/settings/IntegrationsTab.tsx` | Enviar user_id en OAuth |
| `src/components/layout/AppLayout.tsx` | Mostrar DailyBriefModal |
| `src/pages/Dashboard.tsx` | Agregar AIInsightsCard |
| `supabase/config.toml` | Agregar nuevas funciones |

---

## Modelo de Datos

### Timeline Entry para Email

Cuando se procesa un email, se crea entrada con:

```typescript
{
  entry_type: 'email',
  source: 'gmail',
  subject: 'Asunto del email',
  body: 'Cuerpo del email (truncado)',
  summary: 'Resumen generado por IA',
  participants: [
    { name: 'Juan', email: 'juan@empresa.com', role: 'from' },
    { name: 'Maria', email: 'maria@ejemplo.com', role: 'to' }
  ],
  action_items: [
    { task: 'Enviar propuesta', due_date: '2026-02-10', status: 'pending' }
  ],
  metadata: {
    gmail_message_id: 'abc123',
    sentiment: 'positive'
  }
}
```

---

## Seguridad

- Todas las edge functions validan JWT del usuario
- Tokens de Gmail se almacenan encriptados (Supabase maneja esto)
- Las funciones solo acceden a datos del usuario autenticado
- Refresh tokens se usan para renovar access tokens expirados

---

## Orden de Implementacion

1. **Gmail Sync** (mayor impacto)
   - 1.1.1 Arreglar gmail-callback
   - 1.1.2 Crear process-emails
   - 1.1.3 Actualizar IntegrationsTab
   - 1.1.4 Configurar cron (opcional, puede ser manual inicialmente)

2. **AI Insights** (visible inmediatamente)
   - 1.3.1 Crear generate-insights
   - 1.3.2 Crear useAIInsights
   - 1.3.3 Crear AIInsightsCard
   - 1.3.4 Integrar en Dashboard

3. **Daily Brief** (mejora experiencia)
   - 1.2.1 Crear generate-daily-brief
   - 1.2.2 Crear DailyBriefModal
   - 1.2.3 Integrar en AppLayout

---

## Consideraciones Tecnicas

- **Rate Limits de Gmail**: Maximo 250 emails por sync para evitar timeouts
- **Tamano de Emails**: Truncar body a 5000 caracteres antes de enviar a IA
- **Cache de Insights**: staleTime de 1 hora para no sobrecargar la IA
- **Daily Brief**: Guardar ultima fecha vista en localStorage
- **Tokens Expirados**: Implementar refresh automatico de tokens de Gmail

