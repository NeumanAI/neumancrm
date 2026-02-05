 # 📊 NeumanCRM - Documentación Completa
 
 > **Versión:** 1.0.0  
 > **Última actualización:** Febrero 2025  
 > **Plataforma:** React + TypeScript + Supabase
 
 ---
 
 ## 📑 Tabla de Contenidos
 
 1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
 2. [Módulos Funcionales](#2-módulos-funcionales)
    - [2.1 Gestión de Contactos](#21-gestión-de-contactos)
    - [2.2 Gestión de Empresas](#22-gestión-de-empresas)
    - [2.3 Pipeline de Ventas](#23-pipeline-de-ventas)
    - [2.4 Gestión de Tareas](#24-gestión-de-tareas-y-actividades)
    - [2.5 Conversaciones Omnicanal](#25-conversaciones-omnicanal)
 3. [Integraciones](#3-integraciones)
 4. [Asistente de IA](#4-asistente-de-ia)
 5. [Gestión de Equipos](#5-gestión-de-equipos)
 6. [Administración](#6-administración)
 7. [Gestión de Datos](#7-gestión-de-datos)
 8. [Notificaciones](#8-notificaciones)
 9. [Backend (Edge Functions)](#9-edge-functions-backend)
 10. [Seguridad](#10-seguridad)
 11. [Arquitectura Técnica](#11-arquitectura-técnica)
 
 ---
 
 ## 1. Resumen Ejecutivo
 
 **NeumanCRM** es una plataforma de gestión de relaciones con clientes (CRM) diseñada para equipos de ventas modernos. Combina funcionalidades tradicionales de CRM con inteligencia artificial y comunicación omnicanal.
 
 ### Stack Tecnológico
 
 | Capa | Tecnología |
 |------|------------|
 | Frontend | React 18, TypeScript, Vite |
 | Estilos | Tailwind CSS, Shadcn/ui |
 | Estado | TanStack Query (React Query) |
 | Backend | Supabase (PostgreSQL + Edge Functions) |
 | IA | OpenAI GPT / Gemini via AI Gateway |
 | Realtime | Supabase Realtime |
 
 ### Arquitectura Multi-tenancy
 
 ```
 ┌─────────────────────────────────────────────────────────────┐
 │                      SUPER ADMIN                            │
 │            (Administrador de la plataforma)                 │
 └─────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
 ┌─────────────────┐       ┌─────────────────┐
 │ Cliente Directo │       │    Reseller     │
 │   (Direct)      │       │  (Marca Blanca) │
 └─────────────────┘       └────────┬────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
              ┌───────────┐  ┌───────────┐  ┌───────────┐
              │Sub-cliente│  │Sub-cliente│  │Sub-cliente│
              └───────────┘  └───────────┘  └───────────┘
 ```
 
 ---
 
 ## 2. Módulos Funcionales
 
 ### 2.1 Gestión de Contactos
 
 Sistema completo para administrar leads y contactos de clientes.
 
 #### Campos Disponibles
 
 | Campo | Tipo | Descripción |
 |-------|------|-------------|
 | `first_name` | String | Nombre |
 | `last_name` | String | Apellido |
 | `email` | String | Correo electrónico (requerido) |
 | `phone` | String | Teléfono fijo |
 | `mobile` | String | Teléfono móvil |
 | `whatsapp_number` | String | Número de WhatsApp |
 | `job_title` | String | Cargo/Puesto |
 | `department` | String | Departamento |
 | `company_id` | UUID | Empresa asociada |
 | `linkedin_url` | URL | Perfil de LinkedIn |
 | `twitter_url` | URL | Perfil de Twitter |
 | `avatar_url` | URL | Foto de perfil |
 | `notes` | Text | Notas libres |
 | `source` | Enum | Origen del lead |
 | `instagram_username` | String | Usuario de Instagram |
 | `assigned_to` | UUID | Miembro asignado |
 
 #### Fuentes de Leads
 
 | Fuente | Descripción |
 |--------|-------------|
 | `manual` | Creado manualmente |
 | `webchat` | Widget de chat web |
 | `whatsapp` | Conversación de WhatsApp |
 | `instagram` | Mensaje de Instagram |
 | `messenger` | Facebook Messenger |
 | `email` | Importado desde email |
 | `import` | Importación CSV/Excel |
 
 #### Funcionalidades
 
 - ✅ CRUD completo (Crear, Leer, Actualizar, Eliminar)
 - ✅ Vista de lista con filtros y búsqueda
 - ✅ Vista de detalle con sidebar de información
 - ✅ Timeline de interacciones
 - ✅ Gestión de documentos adjuntos
 - ✅ Asignación a miembros del equipo
 - ✅ Historial de actividades
 
 ---
 
 ### 2.2 Gestión de Empresas
 
 Administración de cuentas corporativas y organizaciones.
 
 #### Campos Disponibles
 
 | Campo | Tipo | Descripción |
 |-------|------|-------------|
 | `name` | String | Nombre de la empresa (requerido) |
 | `domain` | String | Dominio web |
 | `website` | URL | Sitio web |
 | `industry` | String | Industria/Sector |
 | `employee_count` | Number | Número de empleados |
 | `revenue` | Number | Ingresos anuales |
 | `description` | Text | Descripción |
 | `phone` | String | Teléfono principal |
 | `address` | String | Dirección |
 | `city` | String | Ciudad |
 | `country` | String | País |
 | `linkedin_url` | URL | Página de LinkedIn |
 | `twitter_url` | URL | Cuenta de Twitter |
 | `logo_url` | URL | Logo de la empresa |
 | `assigned_to` | UUID | Miembro asignado |
 
 #### Funcionalidades
 
 - ✅ CRUD completo
 - ✅ Vista de detalle con contactos asociados
 - ✅ Listado de oportunidades por empresa
 - ✅ Timeline de interacciones
 - ✅ Documentos adjuntos
 - ✅ Métricas de valor total de deals
 
 ---
 
 ### 2.3 Pipeline de Ventas
 
 Vista Kanban interactiva para gestión de oportunidades.
 
 #### Etapas del Pipeline
 
 | Etapa | Probabilidad | Color | Estado |
 |-------|-------------|-------|--------|
 | Lead | 10% | Gris | Abierto |
 | Calificación | 20% | Azul | Abierto |
 | Reunión/Demo | 40% | Cyan | Abierto |
 | Propuesta | 60% | Amarillo | Abierto |
 | Negociación | 80% | Naranja | Abierto |
 | Ganado | 100% | Verde | Cerrado (Won) |
 | Perdido | 0% | Rojo | Cerrado (Lost) |
 
 #### Campos de Oportunidad
 
 | Campo | Tipo | Descripción |
 |-------|------|-------------|
 | `title` | String | Título del deal (requerido) |
 | `value` | Number | Valor monetario |
 | `currency` | String | Moneda (USD por defecto) |
 | `probability` | Number | Probabilidad de cierre (0-100) |
 | `expected_close_date` | Date | Fecha esperada de cierre |
 | `company_id` | UUID | Empresa relacionada |
 | `contact_id` | UUID | Contacto principal |
 | `stage_id` | UUID | Etapa actual |
 | `status` | Enum | open, won, lost |
 | `lost_reason` | String | Razón de pérdida |
 | `assigned_to` | UUID | Vendedor asignado |
 
 #### Funcionalidades
 
 - ✅ Vista Kanban con drag-and-drop (@dnd-kit)
 - ✅ Cambio de etapa arrastrando tarjetas
 - ✅ Actualización automática de probabilidad
 - ✅ Cálculo de valor total por etapa
 - ✅ Filtros por vendedor, empresa, fecha
 - ✅ Modal de edición rápida
 - ✅ Indicadores visuales de deals en riesgo
 
 ---
 
 ### 2.4 Gestión de Tareas y Actividades
 
 Sistema de seguimiento de actividades comerciales.
 
 #### Tipos de Actividad
 
 | Tipo | Icono | Descripción |
 |------|-------|-------------|
 | `task` | ✓ | Tarea general |
 | `call` | 📞 | Llamada telefónica |
 | `email` | ✉️ | Correo electrónico |
 | `meeting` | 📅 | Reunión programada |
 | `note` | 📝 | Nota o comentario |
 
 #### Prioridades
 
 | Prioridad | Color | Descripción |
 |-----------|-------|-------------|
 | `low` | Verde | Baja prioridad |
 | `medium` | Amarillo | Prioridad media |
 | `high` | Naranja | Alta prioridad |
 | `urgent` | Rojo | Urgente |
 
 #### Campos
 
 | Campo | Tipo | Descripción |
 |-------|------|-------------|
 | `title` | String | Título (requerido) |
 | `description` | Text | Descripción detallada |
 | `type` | Enum | Tipo de actividad |
 | `priority` | Enum | Nivel de prioridad |
 | `due_date` | DateTime | Fecha de vencimiento |
 | `completed` | Boolean | Estado de completado |
 | `contact_id` | UUID | Contacto relacionado |
 | `company_id` | UUID | Empresa relacionada |
 | `opportunity_id` | UUID | Oportunidad relacionada |
 | `assigned_to` | UUID | Responsable |
 
 ---
 
 ### 2.5 Conversaciones Omnicanal
 
 Bandeja de entrada unificada para todos los canales de comunicación.
 
 #### Canales Soportados
 
 | Canal | Icono | Integración |
 |-------|-------|-------------|
 | Webchat | 💬 | Widget embebible |
 | WhatsApp | 📱 | ManyChat API |
 | Instagram | 📸 | ManyChat API |
 | Messenger | 💭 | ManyChat API |
 | Email | ✉️ | Gmail OAuth |
 
 #### Estados de Conversación
 
 | Estado | Color | Descripción |
 |--------|-------|-------------|
 | `open` | Verde | Conversación activa |
 | `pending` | Amarillo | Esperando respuesta |
 | `resolved` | Azul | Resuelta |
 | `archived` | Gris | Archivada |
 
 #### Funcionalidades
 
 - ✅ Bandeja unificada de todos los canales
 - ✅ Vista en tiempo real (Supabase Realtime)
 - ✅ Contador de mensajes no leídos
 - ✅ Asignación a miembros del equipo
 - ✅ Creación automática de leads
 - ✅ Historial completo de conversación
 - ✅ Respuesta directa desde el CRM
 - ✅ Notas internas (no visibles para el cliente)
 
 ---
 
### 2.6 Gestión de Proyectos y Unidades de Negocio

Sistema de segmentación de contactos, empresas y oportunidades por proyecto.

#### Tipos de Proyecto

| Tipo | Descripción |
|------|-------------|
| `project` | Proyecto genérico |
| `real_estate` | Proyecto inmobiliario |
| `construction` | Proyecto de construcción |
| `business_unit` | Unidad de negocio |
| `department` | Departamento |
| `brand` | Marca |
| `product_line` | Línea de producto |
| `location` | Ubicación/Sucursal |
| `other` | Otro |

#### Estados de Proyecto

| Estado | Color | Descripción |
|--------|-------|-------------|
| `active` | 🟢 | Proyecto activo y en operación |
| `inactive` | 🟡 | Proyecto pausado temporalmente |
| `completed` | ✅ | Proyecto completado |
| `cancelled` | ❌ | Proyecto cancelado |

#### Campos de Proyecto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre del proyecto (requerido) |
| `code` | String | Código identificador único |
| `type` | Enum | Tipo de proyecto |
| `status` | Enum | Estado actual |
| `description` | Text | Descripción del proyecto |
| `budget` | Number | Presupuesto asignado |
| `revenue_target` | Number | Meta de ingresos |
| `start_date` | Date | Fecha de inicio |
| `end_date` | Date | Fecha de finalización |
| `city` | String | Ciudad |
| `country` | String | País |
| `color` | String | Color para UI (hex) |
| `icon` | String | Icono para UI |

#### Relación Contacto-Proyecto

Un contacto puede estar asociado a múltiples proyectos con estado individual:

| Estado | Descripción |
|--------|-------------|
| `lead` | Lead interesado en el proyecto |
| `qualified` | Lead calificado |
| `customer` | Cliente que compró/contrató |
| `inactive` | Contacto inactivo en el proyecto |

#### Métricas por Proyecto

| Métrica | Descripción |
|---------|-------------|
| `total_contacts` | Contactos asociados al proyecto |
| `total_companies` | Empresas vinculadas |
| `total_opportunities` | Oportunidades en el proyecto |
| `pipeline_value` | Valor del pipeline abierto |
| `won_deals_value` | Valor de deals ganados |
| `conversion_rate` | Tasa de conversión |

#### Funcionalidades

- ✅ CRUD completo de proyectos
- ✅ Vista de lista con tarjetas y filtros
- ✅ Vista de detalle con métricas
- ✅ Asociación de contactos a múltiples proyectos
- ✅ Filtro global por proyecto en el header
- ✅ Métricas calculadas automáticamente
- ✅ Permisos basados en rol (Admin/Manager pueden crear)

#### Herramientas de IA para Proyectos

| Herramienta | Descripción |
|-------------|-------------|
| `list_projects` | Listar proyectos con filtros |
| `create_project` | Crear nuevo proyecto |
| `get_project_stats` | Métricas detalladas por proyecto |
| `add_contact_to_project` | Asociar contacto a proyecto |
| `get_project_contacts` | Contactos de un proyecto |
| `search_projects` | Buscar proyectos por nombre/código |

---

 ## 3. Integraciones
 
 ### 3.1 Gmail
 
 Sincronización bidireccional de correos electrónicos.
 
 | Característica | Descripción |
 |----------------|-------------|
 | Autenticación | OAuth 2.0 |
 | Sincronización | Cada 15 minutos |
 | Direccionalidad | Bidireccional |
 | Timeline | Captura automática |
 
 **Flujo de configuración:**
 1. Usuario hace clic en "Conectar Gmail"
 2. Redirección a Google OAuth
 3. Autorización de permisos de lectura
 4. Callback guarda tokens encriptados
 5. Edge Function sincroniza periódicamente
 
 ---
 
 ### 3.2 ManyChat
 
 Integración con plataforma de chatbots para WhatsApp, Instagram y Messenger.
 
 | Característica | Descripción |
 |----------------|-------------|
 | Autenticación | API Key |
 | Canales | WhatsApp, Instagram, Messenger |
 | Webhook | Recepción en tiempo real |
 | Respuestas | Envío via API |
 
 **Configuración:**
 1. Obtener API Key de ManyChat
 2. Configurar en Settings > Integraciones
 3. Copiar URL del webhook
 4. Pegar en ManyChat > Settings > Webhooks
 
 ---
 
 ### 3.3 Webchat
 
 Widget de chat embebible para sitios web externos.
 
 | Característica | Descripción |
 |----------------|-------------|
 | Implementación | Script JS |
 | Backend | n8n Workflow |
 | IA | Respuestas automáticas |
 | Leads | Creación automática |
 
 **Código de inserción:**
 ```html
 <script>
   window.crmWidgetConfig = {
     userId: 'YOUR_USER_ID',
     orgId: 'YOUR_ORG_ID',
     primaryColor: '#3B82F6',
     welcomeMessage: '¡Hola! ¿En qué podemos ayudarte?'
   };
 </script>
 <script src="https://your-domain.com/widget.js"></script>
 ```
 
 ---
 
 ## 4. Asistente de IA
 
 ### 4.1 Chat Global
 
 Panel flotante accesible desde cualquier vista del CRM.
 
 **Características:**
 - Acceso con atajo de teclado (Ctrl+K)
 - Persistencia de conversaciones
 - Historial navegable
 - Múltiples conversaciones
 
 ---
 
 ### 4.2 Herramientas Disponibles (30+)
 
 <details>
 <summary><strong>📇 Contactos y Empresas</strong></summary>
 
 | Herramienta | Descripción |
 |-------------|-------------|
 | `create_contact` | Crear nuevo contacto |
 | `update_contact` | Actualizar contacto existente |
 | `search_contacts` | Buscar contactos por criterios |
 | `create_company` | Crear nueva empresa |
 | `search_companies` | Buscar empresas |
 
 </details>
 
 <details>
 <summary><strong>✅ Tareas y Reuniones</strong></summary>
 
 | Herramienta | Descripción |
 |-------------|-------------|
 | `create_task` | Crear tarea con fecha y prioridad |
 | `schedule_meeting` | Agendar reunión |
 
 </details>
 
 <details>
 <summary><strong>💰 Pipeline y Oportunidades</strong></summary>
 
 | Herramienta | Descripción |
 |-------------|-------------|
 | `create_opportunity` | Crear nueva oportunidad |
 | `update_opportunity_stage` | Mover deal a otra etapa |
 | `get_pipeline_summary` | Resumen del pipeline |
 | `analyze_deal_health` | Análisis de salud del deal |
 
 </details>
 
 <details>
 <summary><strong>📊 Timeline y Análisis</strong></summary>
 
 | Herramienta | Descripción |
 |-------------|-------------|
 | `search_timeline` | Buscar en historial de interacciones |
 | `find_promises` | Encontrar compromisos pendientes |
 | `get_next_best_action` | Sugerencia de próxima acción |
 | `add_note` | Agregar nota a timeline |
 
 </details>
 
 <details>
 <summary><strong>👥 Equipo y Colaboración</strong></summary>
 
 | Herramienta | Descripción |
 |-------------|-------------|
 | `get_team_summary` | Resumen del equipo |
 | `get_member_info` | Info de miembro específico |
 | `get_quotas_progress` | Progreso de cuotas |
 | `assign_contact` | Asignar contacto |
 | `assign_company` | Asignar empresa |
 | `assign_opportunity` | Asignar oportunidad |
 | `get_my_assignments` | Mis asignaciones |
 | `add_team_comment` | Agregar comentario |
 | `get_entity_comments` | Ver comentarios |
 | `get_activity_feed` | Feed de actividad |
 | `notify_team_member` | Notificar a miembro |
 
 </details>
 
 <details>
 <summary><strong>💬 Conversaciones Omnicanal</strong></summary>
 
 | Herramienta | Descripción |
 |-------------|-------------|
 | `list_conversations` | Listar conversaciones |
 | `get_conversation_messages` | Ver mensajes |
 | `reply_to_conversation` | Responder |
 | `assign_conversation` | Asignar conversación |
 | `resolve_conversation` | Marcar como resuelta |
 
 </details>
 
 ---
 
 ### 4.3 Daily Brief
 
 Resumen automático diario generado por IA.
 
 **Contenido del Brief:**
 - 📋 Tareas del día
 - ⚠️ Deals urgentes o en riesgo
 - 📅 Reuniones programadas
 - 💡 Sugerencias de acciones
 - 📈 Métricas clave
 
 **Generación:** Edge Function `generate-daily-brief` ejecutada diariamente.
 
 ---
 
 ### 4.4 AI Insights
 
 Análisis inteligente del pipeline y sugerencias proactivas.
 
 **Tipos de Insights:**
 
 | Tipo | Descripción |
 |------|-------------|
 | `deal_at_risk` | Deal sin actividad reciente |
 | `follow_up_needed` | Requiere seguimiento |
 | `high_value_opportunity` | Oportunidad de alto valor |
 | `closing_soon` | Próximo a fecha de cierre |
 | `stale_contact` | Contacto sin interacción |
 
 ---
 
 ## 5. Gestión de Equipos
 
 ### 5.1 Roles y Permisos
 
 | Rol | Crear | Editar | Eliminar | Asignar | Gestionar Equipo |
 |-----|-------|--------|----------|---------|------------------|
 | **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
 | **Manager** | ✅ | ✅ | ❌ | ✅ | ❌ |
 | **Sales Rep** | ✅ | ✅* | ❌ | ❌ | ❌ |
 | **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ |
 
 *Solo sus propias asignaciones
 
 ---
 
 ### 5.2 Cuotas de Ventas
 
 Sistema de establecimiento y seguimiento de objetivos.
 
 | Campo | Descripción |
 |-------|-------------|
 | `quota_monthly` | Cuota mensual en valor monetario |
 | `quota_quarterly` | Cuota trimestral |
 | `deals_closed_value` | Valor de deals cerrados |
 
 **Visualización:**
 - Barra de progreso por vendedor
 - Comparativa de equipo
 - Dashboard de rendimiento
 
 ---
 
 ### 5.3 Activity Feed
 
 Registro centralizado de todas las actividades del equipo.
 
 **Eventos registrados:**
 - Creación de entidades
 - Actualizaciones
 - Cambios de etapa
 - Asignaciones
 - Comentarios
 
 **Filtros disponibles:**
 - Por tipo de entidad
 - Por miembro del equipo
 - Por rango de fechas
 
 ---
 
 ## 6. Administración
 
 ### 6.1 Super Admin
 
 Panel de administración global de la plataforma.
 
 **Funcionalidades:**
 
 | Función | Descripción |
 |---------|-------------|
 | Ver organizaciones | Lista de todas las organizaciones |
 | Aprobar/Rechazar | Gestión de solicitudes pendientes |
 | Crear cliente directo | Organización con acceso directo |
 | Crear reseller | Organización marca blanca |
 | Gestionar dominios | Dominios personalizados |
 | Ver métricas | Uso global de la plataforma |
 
 ---
 
 ### 6.2 Reseller Admin
 
 Panel para gestión de sub-clientes (marca blanca).
 
 **Funcionalidades:**
 - Crear sub-clientes
 - Aplicar branding heredado
 - Gestionar usuarios de sub-clientes
 - Ver métricas agregadas
 
 ---
 
 ### 6.3 White-Label (Marca Blanca)
 
 Sistema de personalización visual completo.
 
 | Elemento | Descripción |
 |----------|-------------|
 | Logo | Logo personalizado (cabecera y login) |
 | Color primario | Color principal de la interfaz |
 | Color secundario | Color de acentos |
 | Favicon | Icono de pestaña del navegador |
 | Dominio | Dominio personalizado (ej: crm.tuempresa.com) |
 
 **Implementación técnica:**
 - Variables CSS dinámicas
 - Detección de dominio en login
 - RPC `get_organization_by_domain`
 
 ---
 
 ## 7. Gestión de Datos
 
 ### 7.1 Importación
 
 | Formato | Extensión | Librería |
 |---------|-----------|----------|
 | CSV | .csv | PapaParse |
 | Excel | .xlsx, .xls | SheetJS (xlsx) |
 
 **Proceso de importación:**
 1. Subir archivo (drag & drop)
 2. Mapeo automático de columnas
 3. Revisión y ajuste manual
 4. Vista previa de datos
 5. Configurar opciones (actualizar/saltar)
 6. Ejecutar importación
 7. Reporte de resultados
 
 **Opciones:**
 - `update_existing`: Actualizar registros existentes (por email)
 - `skip_duplicates`: Saltar duplicados
 
 ---
 
 ### 7.2 Exportación
 
 | Formato | Descripción |
 |---------|-------------|
 | CSV | Valores separados por coma |
 | Excel | Libro de Excel (.xlsx) |
 | JSON | Formato estructurado |
 
 **Filtros de exportación:**
 - Tipo de entidad (contactos, empresas, deals)
 - Rango de fechas
 - Campos específicos
 
 ---
 
 ### 7.3 Detección de Duplicados
 
 Algoritmo de similitud para encontrar registros duplicados.
 
 **Campos de comparación:**
 - Email (exacto)
 - Teléfono (normalizado)
 - Nombre + Empresa (fuzzy)
 
 **Estados:**
 | Estado | Descripción |
 |--------|-------------|
 | `pending` | Pendiente de revisión |
 | `merged` | Fusionados |
 | `dismissed` | Descartado (no es duplicado) |
 
 **Herramienta de Merge:**
 - Vista lado a lado
 - Selección de valores a conservar
 - Fusión de campos relacionados
 
 ---
 
 ### 7.4 Operaciones Masivas
 
 | Operación | Descripción |
 |-----------|-------------|
 | Actualización | Cambiar campo en múltiples registros |
 | Eliminación | Borrar múltiples registros |
 | Asignación | Asignar lote a miembro del equipo |
 | Etiquetado | Agregar/quitar etiquetas |
 
 ---
 
 ### 7.5 Registro de Auditoría
 
 Historial completo de cambios en el sistema.
 
 | Campo | Descripción |
 |-------|-------------|
 | `action` | Tipo de acción (create, update, delete) |
 | `entity_type` | Tipo de entidad afectada |
 | `entity_id` | ID del registro |
 | `old_values` | Valores anteriores (JSON) |
 | `new_values` | Valores nuevos (JSON) |
 | `user_id` | Usuario que realizó la acción |
 | `created_at` | Fecha y hora |
 | `ip_address` | Dirección IP |
 | `user_agent` | Navegador/dispositivo |
 
 ---
 
 ## 8. Notificaciones
 
 ### Tipos de Notificación
 
 | Tipo | Trigger | Prioridad |
 |------|---------|-----------|
 | `task_due` | Tarea próxima a vencer | Alta |
 | `deal_update` | Cambio en oportunidad | Normal |
 | `new_contact` | Nuevo lead creado | Normal |
 | `email_sync` | Sincronización de email | Baja |
 | `system` | Alertas del sistema | Variable |
 
 ### Centro de Notificaciones
 
 - Badge con contador de no leídas
 - Lista cronológica
 - Marcar como leída
 - Marcar todas como leídas
 - Filtros por tipo
 
 ### Preferencias
 
 | Preferencia | Descripción |
 |-------------|-------------|
 | `task_reminders` | Recordatorios de tareas |
 | `deal_updates` | Actualizaciones de deals |
 | `new_contacts` | Nuevos contactos |
 | `email_sync` | Sincronización de email |
 | `browser_notifications` | Notificaciones del navegador |
 | `email_notifications` | Notificaciones por email |
 | `reminder_hours` | Horas de anticipación |
 
 ---
 
 ## 9. Edge Functions (Backend)
 
 Funciones serverless ejecutadas en Supabase Edge.
 
 | Función | Endpoint | Descripción |
 |---------|----------|-------------|
 | `chat` | POST /chat | Asistente de IA con herramientas |
 | `generate-insights` | POST /generate-insights | Análisis de pipeline |
 | `generate-daily-brief` | POST /generate-daily-brief | Resumen diario |
 | `gmail-auth` | GET /gmail-auth | Inicio de OAuth Gmail |
 | `gmail-callback` | GET /gmail-callback | Callback de OAuth |
 | `process-emails` | POST /process-emails | Sincronización de emails |
 | `manychat-webhook` | POST /manychat-webhook | Recepción ManyChat |
 | `n8n-chat` | POST /n8n-chat | Webchat con n8n |
 | `send-conversation-reply` | POST /send-conversation-reply | Envío de respuestas |
 | `process-import` | POST /process-import | Procesamiento de importación |
 | `process-export` | POST /process-export | Procesamiento de exportación |
 | `scan-duplicates` | POST /scan-duplicates | Detección de duplicados |
 | `check-notifications` | POST /check-notifications | Verificación de notificaciones |
 | `save-integration-secret` | POST /save-integration-secret | Guardar API keys |
 | `test-manychat-connection` | POST /test-manychat-connection | Probar conexión ManyChat |
 | `ingest-whatsapp-conversation` | POST /ingest-whatsapp-conversation | Ingestar conversaciones |
 
 ---
 
 ## 10. Seguridad
 
 ### Autenticación
 
 | Método | Descripción |
 |--------|-------------|
 | Email/Password | Registro con verificación de email |
 | Magic Link | Enlace de acceso sin contraseña |
 | OAuth | Google (próximamente) |
 
 ### Row Level Security (RLS)
 
 Políticas de seguridad a nivel de base de datos.
 
 **Principios:**
 - Usuarios solo ven datos de su organización
 - Super Admins ven todas las organizaciones
 - Resellers ven sus sub-clientes
 - Roles determinan acciones permitidas
 
 **Ejemplo de política:**
 ```sql
 CREATE POLICY "Users can view own org contacts"
 ON contacts FOR SELECT
 USING (organization_id = get_user_organization_id());
 ```
 
 ### Tokens JWT
 
 - Generados por Supabase Auth
 - Incluyen `user_id` y claims personalizados
 - Validados en Edge Functions
 - Expiración configurable
 
 ---
 
 ## 11. Arquitectura Técnica
 
 ### Estructura de Archivos
 
 ```
 src/
 ├── components/           # Componentes React
 │   ├── ui/              # Componentes base (Shadcn)
 │   ├── layout/          # Layout (Sidebar, Header)
 │   ├── contacts/        # Módulo de contactos
 │   ├── companies/       # Módulo de empresas
 │   ├── conversations/   # Módulo omnicanal
 │   ├── chat/            # Chat de IA
 │   ├── notifications/   # Sistema de notificaciones
 │   ├── team/            # Gestión de equipos
 │   ├── settings/        # Configuraciones
 │   ├── admin/           # Super Admin
 │   ├── reseller/        # Reseller Admin
 │   └── data-management/ # Import/Export
 │
 ├── hooks/               # Custom Hooks
 │   ├── useAuth.tsx
 │   ├── useContacts.ts
 │   ├── useCompanies.ts
 │   ├── useOpportunities.ts
 │   ├── useConversations.ts
 │   ├── useTeam.ts
 │   └── ...
 │
 ├── contexts/            # React Contexts
 │   ├── ChatContext.tsx
 │   └── BrandingContext.tsx
 │
 ├── pages/               # Páginas/Rutas
 │   ├── Dashboard.tsx
 │   ├── Contacts.tsx
 │   ├── Companies.tsx
 │   ├── Pipeline.tsx
 │   ├── Conversations.tsx
 │   ├── Team.tsx
 │   ├── Settings.tsx
 │   └── Admin.tsx
 │
 ├── types/               # Definiciones TypeScript
 │   ├── crm.ts
 │   ├── conversations.ts
 │   └── integrations.ts
 │
 └── integrations/        # Cliente Supabase
     └── supabase/
         ├── client.ts
         └── types.ts
 
 supabase/
 └── functions/           # Edge Functions (15+)
     ├── chat/
     ├── generate-insights/
     ├── gmail-auth/
     └── ...
 ```
 
 ### Dependencias Principales
 
 | Librería | Versión | Uso |
 |----------|---------|-----|
 | react | ^18.3.1 | Framework UI |
 | typescript | ~5.x | Tipado estático |
 | @tanstack/react-query | ^5.83.0 | Estado servidor |
 | @supabase/supabase-js | ^2.93.3 | Cliente Supabase |
 | @dnd-kit/core | ^6.3.1 | Drag and drop |
 | recharts | ^2.15.4 | Gráficos |
 | framer-motion | ^12.30.0 | Animaciones |
 | papaparse | ^5.5.3 | Parseo CSV |
 | xlsx | ^0.18.5 | Archivos Excel |
 | react-dropzone | ^14.4.0 | Subida de archivos |
 | tailwindcss | ^3.x | Estilos CSS |
 | shadcn/ui | - | Componentes UI |
 
 ---
 
 ## 📄 Exportar este Documento
 
 Este documento está en formato Markdown y puede ser exportado a PDF usando:
 
 1. **VS Code**: Extensión "Markdown PDF"
 2. **Pandoc**: `pandoc CRM_DOCUMENTATION.md -o CRM_DOCUMENTATION.pdf`
 3. **Online**: [markdowntopdf.com](https://www.markdowntopdf.com/)
 4. **GitHub**: Renderiza automáticamente el Markdown
 
 ---
 
 ## 📞 Soporte
 
 Para consultas técnicas o soporte:
 - 📧 Email: soporte@neumancrm.com
 - 📖 Documentación en línea
 - 💬 Chat de soporte in-app
 
 ---
 
 *© 2025 NeumanCRM. Todos los derechos reservados.*