
# Plan: Generar Documentación Completa del CRM

## Objetivo
Crear un archivo Markdown completo y exportable con toda la documentación de funcionalidades del CRM, organizado por módulos y con información técnica detallada.

---

## Contenido del Documento

### 1. Resumen Ejecutivo
- Descripción general del sistema CRM
- Stack tecnológico (React, TypeScript, Tailwind, Shadcn/ui, Supabase)
- Arquitectura de multi-tenancy (Super Admin → Resellers → Sub-clientes)

### 2. Módulos Funcionales

#### 2.1 Gestión de Contactos
- CRUD completo de contactos
- Campos: nombre, email, teléfono, WhatsApp, cargo, empresa asociada
- Vista de detalle con Timeline integrado
- Gestión de documentos adjuntos
- Fuentes de leads: manual, webchat, WhatsApp, Instagram, Messenger, email, import

#### 2.2 Gestión de Empresas
- CRUD completo de empresas
- Campos: nombre, industria, sitio web, teléfono, dirección, empleados, ingresos
- Vista de detalle con contactos asociados
- Gestión de documentos adjuntos
- Timeline de interacciones

#### 2.3 Pipeline de Ventas
- Vista Kanban con drag-and-drop (@dnd-kit)
- 7 etapas configurables: Lead, Calificación, Reunión Demo, Propuesta, Negociación, Ganado, Perdido
- Probabilidad automática por etapa
- Cálculo de valor total del pipeline
- Asignación de oportunidades a miembros del equipo

#### 2.4 Gestión de Tareas y Actividades
- Tipos: tarea, llamada, email, reunión, nota
- Prioridades: baja, media, alta, urgente
- Fecha de vencimiento
- Asociación con contactos, empresas y oportunidades

#### 2.5 Conversaciones Omnicanal
- Canales soportados: Webchat, WhatsApp, Instagram, Messenger, Email
- Bandeja de entrada unificada
- Estados: abierta, pendiente, resuelta, archivada
- Asignación a miembros del equipo
- Contador de mensajes no leídos
- Creación automática de leads

### 3. Integraciones

#### 3.1 Gmail
- Autenticación OAuth 2.0
- Sincronización de emails
- Captura automática de interacciones en Timeline

#### 3.2 ManyChat
- Integración via API Key
- Canales: WhatsApp, Instagram, Messenger
- Webhook para recibir conversaciones

#### 3.3 Webchat
- Widget embebible para sitios externos
- Script de inserción generado
- Integración con n8n para IA

### 4. Asistente de IA

#### 4.1 Chat Global
- Panel flotante accesible desde cualquier vista
- Persistencia de conversaciones

#### 4.2 Herramientas del Asistente (30+)
**Contactos y Empresas:**
- create_contact, update_contact, search_contacts
- create_company, search_companies

**Tareas y Reuniones:**
- create_task, schedule_meeting

**Pipeline y Oportunidades:**
- create_opportunity, update_opportunity_stage
- get_pipeline_summary, analyze_deal_health

**Timeline y Análisis:**
- search_timeline, find_promises
- get_next_best_action, add_note

**Equipo y Colaboración:**
- get_team_summary, get_member_info, get_quotas_progress
- assign_contact, assign_company, assign_opportunity
- get_my_assignments, add_team_comment
- get_entity_comments, get_activity_feed, notify_team_member

**Conversaciones Omnicanal:**
- list_conversations, get_conversation_messages
- reply_to_conversation, assign_conversation, resolve_conversation

#### 4.3 Daily Brief
- Resumen automático diario
- Tareas del día, deals urgentes, próximas reuniones

#### 4.4 AI Insights
- Análisis de deals en riesgo
- Sugerencias de próximas acciones
- Métricas del pipeline

### 5. Gestión de Equipos

#### 5.1 Roles y Permisos
| Rol | Permisos |
|-----|----------|
| Admin | Crear, editar, eliminar, asignar, comentar, gestionar equipo |
| Manager | Crear, editar, asignar, comentar |
| Sales Rep | Crear, editar, comentar (solo sus asignaciones) |
| Viewer | Solo lectura |

#### 5.2 Cuotas de Ventas
- Establecimiento de cuotas mensuales/trimestrales
- Seguimiento de progreso
- Visualización en dashboard

#### 5.3 Activity Feed
- Registro de actividades del equipo
- Filtrado por tipo de entidad
- Historial de cambios

### 6. Administración

#### 6.1 Super Admin
- Gestión de todas las organizaciones
- Aprobación/rechazo de organizaciones pendientes
- Creación de clientes directos y marca blanca
- Gestión de dominios personalizados

#### 6.2 Reseller Admin
- Gestión de sub-clientes
- Herencia de branding

#### 6.3 White-Label (Marca Blanca)
- Logo personalizado
- Colores primario y secundario
- Favicon personalizado
- Dominio personalizado

### 7. Gestión de Datos

#### 7.1 Importación
- Formatos: CSV, Excel
- Mapeo automático de columnas
- Validación de datos
- Opciones: actualizar existentes, saltar duplicados

#### 7.2 Exportación
- Formatos: CSV, Excel, JSON
- Filtros por fecha y tipo de entidad

#### 7.3 Detección de Duplicados
- Algoritmo de similitud
- Herramienta de merge
- Estados: pendiente, fusionado, descartado

#### 7.4 Operaciones Masivas
- Actualización en lote
- Eliminación en lote
- Asignación masiva

#### 7.5 Registro de Auditoría
- Historial de cambios
- Usuario responsable
- Valores anteriores y nuevos

### 8. Notificaciones
- Tipos: tareas vencidas, actualizaciones de deals, nuevos contactos, sync de email
- Centro de notificaciones
- Preferencias configurables
- Notificaciones del navegador (opcional)

### 9. Edge Functions (Backend)
| Función | Descripción |
|---------|-------------|
| chat | Asistente de IA con herramientas |
| generate-insights | Análisis de pipeline y sugerencias |
| generate-daily-brief | Resumen diario automático |
| gmail-auth / gmail-callback | OAuth para Gmail |
| process-emails | Sincronización de emails |
| manychat-webhook | Recepción de mensajes ManyChat |
| n8n-chat | Webchat con IA |
| send-conversation-reply | Envío de respuestas omnicanal |
| process-import / process-export | Procesamiento de archivos |
| scan-duplicates | Detección de duplicados |
| check-notifications | Verificación de notificaciones |

### 10. Seguridad
- Autenticación con email/contraseña
- Magic Link opcional
- RLS (Row Level Security) por organización
- Tokens JWT para Edge Functions
- Verificación de email requerida

---

## Sección Técnica

### Estructura de Archivos Principales
```text
src/
├── pages/           # Vistas principales (Dashboard, Contacts, Pipeline, etc.)
├── components/      # Componentes React organizados por módulo
├── hooks/           # Custom hooks para lógica de negocio
├── contexts/        # Contextos (Auth, Branding, Chat)
├── types/           # Definiciones TypeScript
└── integrations/    # Cliente Supabase
supabase/
└── functions/       # Edge Functions (15+)
```

### Dependencias Clave
- @dnd-kit: Drag and drop para Pipeline
- @tanstack/react-query: Gestión de estado servidor
- recharts: Gráficos del Dashboard
- framer-motion: Animaciones
- papaparse / xlsx: Import/Export de datos
- react-dropzone: Carga de archivos

---

## Implementación

### Archivo a crear:
- **`docs/CRM_DOCUMENTATION.md`**: Documento Markdown completo

### Características del documento:
- Tabla de contenidos con enlaces
- Tablas formateadas para referencia rápida
- Ejemplos de uso donde aplique
- Secciones colapsables usando HTML details/summary
- Exportable como PDF usando cualquier conversor Markdown-to-PDF

---

## Resultado Final
Un documento de ~15-20 páginas que servirá como referencia completa del sistema, útil para:
- Onboarding de nuevos usuarios
- Documentación técnica para desarrolladores
- Manual de referencia para ventas/demos
- Base para centro de ayuda futuro
