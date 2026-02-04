
# Plan: Sistema de Colaboracion en Equipo Multi-Tenant

## Vision General

Implementar un sistema completo de colaboracion multi-usuario con organizaciones, roles, permisos, activity feed y comentarios con @menciones. Este sistema transforma el CRM de single-user a multi-tenant.

---

## Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA MULTI-TENANT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       ORGANIZACIONES                                 │   │
│  │  - Cada usuario pertenece a una organizacion                        │   │
│  │  - Planes: starter (3 users), professional, enterprise              │   │
│  │  - Configuracion: timezone, currency, branding                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ROLES                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Admin   │  │ Manager  │  │ Sales Rep│  │  Viewer  │            │   │
│  │  │ (todo)   │  │ (equipo) │  │ (propio) │  │ (lectura)│            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     FUNCIONALIDADES                                  │   │
│  │                                                                      │   │
│  │  Pagina /team          Activity Feed         Comentarios             │   │
│  │  - Lista miembros      - Cambios en CRM      - En cualquier          │   │
│  │  - Invitar usuarios    - Quien hizo que      - entidad               │   │
│  │  - Cuotas de ventas    - Filtros por tipo    - @menciones            │   │
│  │                                                                      │   │
│  │  Asignacion            Transfer Ownership                            │   │
│  │  - Contacts            - Transferir propiedad                        │   │
│  │  - Companies           - entre miembros del equipo                   │   │
│  │  - Opportunities                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PASO PREVIO OBLIGATORIO: Ejecutar SQL Manualmente

IMPORTANTE: Antes de implementar el codigo, el usuario debe ejecutar manualmente el SQL en Cloud View > Run SQL.

El SQL incluye:
1. Crear tabla `organizations` con RLS
2. Crear tabla `team_members` con roles (admin, manager, sales_rep, viewer)
3. Crear tabla `activity_feed` para tracking automatico
4. Crear tabla `comments` con soporte para @menciones
5. Agregar columnas `organization_id`, `assigned_to`, `created_by` a contacts, companies, opportunities, activities
6. Actualizar politicas RLS para acceso basado en organizacion
7. Crear triggers para auto-generar activity feed
8. Crear funciones helper: `get_user_organization_id()`, `user_has_role()`, `transfer_ownership()`

---

## Implementacion de Codigo

### Parte 1: Hooks (3 archivos nuevos)

| Archivo | Proposito |
|---------|-----------|
| `src/hooks/useTeam.ts` | Gestion de team_members, organizacion, roles, cuotas |
| `src/hooks/useActivityFeed.ts` | Lectura del activity feed con filtros y realtime |
| `src/hooks/useComments.ts` | CRUD de comentarios con deteccion de @menciones |

#### Hook useTeam
- `teamMembers`: Lista de miembros del equipo
- `organization`: Datos de la organizacion
- `currentMember`: Miembro actual con su rol
- `inviteMember(email, role)`: Invitar nuevo miembro
- `updateMemberRole(memberId, role)`: Cambiar rol
- `updateQuota(memberId, monthly, quarterly)`: Establecer cuotas
- `removeMember(memberId)`: Eliminar miembro
- `isAdmin`, `isManager`, `canManageTeam`: Flags de permisos

#### Hook useActivityFeed
- `activities`: Lista de actividades recientes
- Filtros opcionales: entityType, entityId, limit
- Suscripcion realtime a nuevas actividades

#### Hook useComments
- `comments`: Lista de comentarios de una entidad
- `addComment(content, mentions)`: Crear comentario
- `updateComment(id, content)`: Editar comentario
- `deleteComment(id)`: Eliminar comentario
- `pinComment(id)`: Fijar comentario
- Deteccion automatica de @menciones

---

### Parte 2: Pagina de Team (1 archivo nuevo)

| Archivo | Proposito |
|---------|-----------|
| `src/pages/Team.tsx` | Gestion completa del equipo |

Funcionalidades:
- Header con nombre de organizacion y plan
- Contador de usuarios (X / max_users)
- Tabla de miembros con: avatar, nombre, rol, estado, cuota, progreso
- Barras de progreso visuales para cuotas
- Acciones: cambiar rol, establecer cuota, eliminar
- Boton "Invitar Miembro" (solo admins)
- Iconos de roles: Crown (admin), Shield (manager), User (sales_rep), Eye (viewer)

---

### Parte 3: Componentes de Team (5 archivos nuevos)

| Archivo | Proposito |
|---------|-----------|
| `src/components/team/InviteMemberDialog.tsx` | Modal para invitar miembros por email |
| `src/components/team/SetQuotaDialog.tsx` | Modal para establecer cuotas mensuales/trimestrales |
| `src/components/team/ActivityFeedList.tsx` | Lista de actividad reciente con iconos por accion |
| `src/components/team/CommentsSection.tsx` | Seccion de comentarios con @menciones |
| `src/components/team/AssignToSelect.tsx` | Selector de asignacion con avatares |

#### InviteMemberDialog
- Input de email
- Select de rol (sales_rep, manager, viewer)
- Validacion de limite de usuarios
- Toast de confirmacion

#### SetQuotaDialog
- Inputs para cuota mensual y trimestral en USD
- Muestra nombre del miembro seleccionado
- Validacion de permisos (solo admin/manager)

#### ActivityFeedList
- Iconos por tipo de accion: Plus (created), Edit (updated), Trash (deleted), UserPlus (assigned), ArrowRightLeft (transferred)
- Texto descriptivo: "creo contacto X", "actualizo empresa Y"
- Timestamp relativo con date-fns
- Filtrado opcional por entidad

#### CommentsSection
- Formulario con textarea
- Tip de uso de @menciones
- Lista de comentarios con avatar, autor, timestamp
- Badge de "editado" si fue modificado
- Pin icon para comentarios fijados
- Botones de pin y delete

#### AssignToSelect
- Dropdown con miembros del equipo
- Avatar + nombre de cada miembro
- Usado en formularios de crear/editar contactos, empresas, oportunidades

---

### Parte 4: Modificaciones a Archivos Existentes

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar ruta `/team` con Team component |
| `src/components/layout/Sidebar.tsx` | Agregar link "Equipo" con icono UsersRound |
| `src/pages/ContactDetail.tsx` | Agregar tabs "Activity" y "Comments" |
| `src/pages/CompanyDetail.tsx` | Agregar tabs "Activity" y "Comments" |
| `src/pages/Pipeline.tsx` | Mostrar assigned_to en cards de oportunidades |

#### Modificacion de App.tsx
```typescript
import Team from "./pages/Team";
// En Routes:
<Route path="/team" element={<AppLayout><Team /></AppLayout>} />
```

#### Modificacion de Sidebar.tsx
- Agregar { to: '/team', icon: UsersRound, label: 'Equipo' } al array navItems
- Posicionar despues de "Datos" y antes de "Configuracion"

#### Modificacion de ContactDetail.tsx
- Agregar tabs "Activity" y "Comments"
- Usar ActivityFeedList con entityType="contacts" y entityId={contactId}
- Usar CommentsSection con entityType="contacts" y entityId={contactId}

#### Modificacion de CompanyDetail.tsx
- Misma logica que ContactDetail pero con entityType="companies"

#### Modificacion de Pipeline.tsx
- Importar useTeam
- En OpportunityCard, mostrar assigned_to si existe
- Mostrar avatar y nombre del miembro asignado

---

## Permisos por Rol

| Accion | Admin | Manager | Sales Rep | Viewer |
|--------|-------|---------|-----------|--------|
| Ver todos los datos de la org | Si | Si | Si | Si |
| Crear entidades | Si | Si | Si | No |
| Editar propias | Si | Si | Si | No |
| Editar del equipo | Si | Si | No | No |
| Eliminar entidades | Si | Si | No | No |
| Invitar miembros | Si | No | No | No |
| Cambiar roles | Si | No | No | No |
| Establecer cuotas | Si | Si | No | No |
| Ver activity feed | Si | Si | Si | Si |
| Agregar comentarios | Si | Si | Si | Si |

---

## Estructura de Archivos Final

```
src/
├── hooks/
│   ├── useTeam.ts (NUEVO)
│   ├── useActivityFeed.ts (NUEVO)
│   └── useComments.ts (NUEVO)
├── pages/
│   └── Team.tsx (NUEVO)
├── components/
│   └── team/
│       ├── InviteMemberDialog.tsx (NUEVO)
│       ├── SetQuotaDialog.tsx (NUEVO)
│       ├── ActivityFeedList.tsx (NUEVO)
│       ├── CommentsSection.tsx (NUEVO)
│       └── AssignToSelect.tsx (NUEVO)
```

---

## Orden de Implementacion

1. Proporcionar SQL completo para ejecutar manualmente
2. Crear hooks: useTeam, useActivityFeed, useComments
3. Crear componentes de team: dialogs, lists, selects
4. Crear pagina Team.tsx
5. Modificar App.tsx (agregar ruta)
6. Modificar Sidebar.tsx (agregar link)
7. Modificar ContactDetail.tsx (agregar tabs)
8. Modificar CompanyDetail.tsx (agregar tabs)
9. Modificar Pipeline.tsx (mostrar assigned_to)

---

## Consideraciones Tecnicas

- **RLS Seguro**: Todas las politicas basadas en organization_id via team_members
- **Security Definer Functions**: Para evitar recursion infinita en RLS
- **Triggers Automaticos**: Activity feed se genera automaticamente en INSERT/UPDATE/DELETE
- **Realtime**: Hooks suscritos a cambios via Supabase Realtime
- **Permisos Client-Side**: Solo para UX, la seguridad real esta en RLS
- **No Romper Existente**: Solo agregar funcionalidad, no modificar logica existente

