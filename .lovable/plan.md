
# Plan: Sistema de Autorización de Empresas con Panel Super-Admin

## Resumen

Implementar un sistema simple donde:
1. Las nuevas empresas se registran pero quedan **pendientes de autorización**
2. Tú tienes un **panel de super-admin** para ver y aprobar empresas
3. Mientras no estén aprobadas, los usuarios ven una pantalla de "cuenta pendiente"
4. Una vez aprobadas, tienen **acceso completo** (sin límites de plan por ahora)

---

## Flujo de Usuario

```text
NUEVO USUARIO SE REGISTRA
         │
         ▼
┌─────────────────────────────────────┐
│  Se crea organización automática    │
│  con is_approved = FALSE            │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Usuario ve pantalla:               │
│  "Tu cuenta está pendiente de       │
│   aprobación. Te notificaremos      │
│   cuando esté lista."               │
│                                     │
│  [Cerrar Sesión]                    │
└─────────────────────────────────────┘

         MIENTRAS TANTO...

┌─────────────────────────────────────┐
│  SUPER-ADMIN (Tú)                   │
│  Ve lista de empresas pendientes    │
│  [Aprobar] [Rechazar]               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Click "Aprobar"                    │
│  → is_approved = TRUE               │
│  → Usuario ahora puede usar el CRM  │
└─────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### 1. Agregar campo a tabla `organizations`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `is_approved` | boolean | false | Si la empresa fue autorizada |
| `approved_at` | timestamptz | null | Cuándo se aprobó |
| `approved_by` | uuid | null | Quién la aprobó |

### 2. Nueva tabla `super_admins`

Tabla para identificar a los administradores de la plataforma (ustedes):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | PK |
| `user_id` | uuid | Referencia a auth.users |
| `created_at` | timestamptz | Fecha de creación |

### 3. Función para verificar si es super-admin

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  )
$$;
```

### 4. Políticas RLS para super_admins

- Super-admins pueden ver **TODAS** las organizaciones
- Super-admins pueden actualizar cualquier organización (para aprobar)

---

## Componentes a Crear

### 1. Página `/pending-approval`

Pantalla que ven los usuarios cuando su empresa aún no está aprobada:

- Mensaje claro de que están pendientes
- Información de contacto (opcional)
- Botón de cerrar sesión
- Auto-refresh cada 30 segundos para detectar aprobación

### 2. Página `/admin`

Panel exclusivo para super-admins con:

**Tab: Empresas Pendientes**
- Lista de organizaciones con `is_approved = false`
- Muestra: nombre, email del admin, fecha de registro
- Botones: [Aprobar] [Rechazar]

**Tab: Empresas Aprobadas**
- Lista de todas las empresas activas
- Estadísticas: usuarios, contactos, oportunidades
- Opción de desactivar si es necesario

### 3. Modificar `AppLayout.tsx`

Agregar verificación:
- Si `organization.is_approved === false` → Redirigir a `/pending-approval`
- Si es super-admin → Mostrar enlace a `/admin` en el menú

---

## Archivos a Crear/Modificar

| Tipo | Archivo | Acción |
|------|---------|--------|
| SQL | Nueva migración | Agregar campos a organizations, crear tabla super_admins |
| Página | `src/pages/PendingApproval.tsx` | Crear - Pantalla de espera |
| Página | `src/pages/Admin.tsx` | Crear - Panel super-admin |
| Hook | `src/hooks/useSuperAdmin.ts` | Crear - Lógica de super-admin |
| Hook | `src/hooks/useTeam.ts` | Modificar - Agregar is_approved |
| Layout | `src/components/layout/AppLayout.tsx` | Modificar - Verificar aprobación |
| Layout | `src/components/layout/Sidebar.tsx` | Modificar - Mostrar enlace Admin |
| Router | `src/App.tsx` | Agregar rutas nuevas |

---

## Orden de Implementación

### Fase 1: Base de Datos
1. Crear migración SQL
2. Agregar tu usuario a `super_admins` (te pediré tu user_id)
3. Actualizar función de trigger para crear orgs con `is_approved = false`

### Fase 2: Hooks
1. Crear `useSuperAdmin.ts` para operaciones de admin
2. Modificar `useTeam.ts` para incluir `is_approved`

### Fase 3: UI
1. Crear página `PendingApproval.tsx`
2. Crear página `Admin.tsx` con tabs
3. Modificar `AppLayout.tsx` para detectar aprobación
4. Agregar enlace en Sidebar para super-admins

---

## Seguridad

### RLS Policies

```sql
-- Super-admins pueden ver todas las organizaciones
CREATE POLICY "Super admins can view all orgs"
ON public.organizations FOR SELECT
TO authenticated
USING (
  id = get_user_organization_id() 
  OR is_super_admin()
);

-- Super-admins pueden actualizar cualquier organización
CREATE POLICY "Super admins can update any org"
ON public.organizations FOR UPDATE
TO authenticated
USING (is_super_admin());
```

### Protección de rutas

- `/admin` solo accesible si `is_super_admin()` retorna true
- Verificación tanto en frontend como en backend (RLS)

---

## Antes de Empezar

Necesito que me proporciones:
1. **Tu email de usuario** en el CRM (para agregarte como super-admin)

O si prefieres, puedo hacer que el primer usuario registrado sea automáticamente super-admin.
