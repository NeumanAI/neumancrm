

# Plan: Sistema de Sub-Clientes para Resellers de Marca Blanca

## Resumen Ejecutivo

Implementar un sistema jerárquico de 3 niveles que permite a los resellers de marca blanca (whitelabel) crear y gestionar sus propios clientes finales, mientras que tú (Super Admin) mantienes control total sobre todo el sistema.

## Modelo de Jerarquía

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        NIVEL 1: SUPER ADMIN                         │
│                   (Tú - Control total del sistema)                   │
│                                                                     │
│  • Ve TODAS las organizaciones (resellers + directos + sub-clientes)│
│  • Puede crear/editar/eliminar cualquier organización               │
│  • Aprueba resellers y clientes directos                            │
│  • Accede a /admin con panel completo                               │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
       ┌──────────────┴──────────────┐
       │                             │
       ▼                             ▼
┌─────────────────────┐   ┌─────────────────────────────────────────┐
│  CLIENTE DIRECTO    │   │         RESELLER (MARCA BLANCA)         │
│  (organization_type │   │     (organization_type = 'whitelabel')  │
│    = 'direct')      │   │                                         │
│                     │   │  • Ve SUS sub-clientes únicamente        │
│  • No tiene sub-    │   │  • Puede crear sub-clientes             │
│    clientes         │   │  • Accede a /reseller-admin (nuevo)     │
│  • Usa marca        │   │  • Los sub-clientes ven su marca        │
│    NeumanCRM        │   │  • No puede ver otros resellers         │
└─────────────────────┘   └────────────────┬────────────────────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                          ▼                ▼                ▼
                   ┌───────────┐    ┌───────────┐    ┌───────────┐
                   │Sub-cliente│    │Sub-cliente│    │Sub-cliente│
                   │    #1     │    │    #2     │    │    #3     │
                   └───────────┘    └───────────┘    └───────────┘
```

## Cambios en Base de Datos

### 1. Agregar columna `parent_organization_id` a `organizations`

```sql
ALTER TABLE public.organizations 
ADD COLUMN parent_organization_id UUID REFERENCES public.organizations(id);

CREATE INDEX idx_organizations_parent ON public.organizations(parent_organization_id);

COMMENT ON COLUMN public.organizations.parent_organization_id IS 
  'ID del reseller padre. NULL = organización raíz (directo o reseller)';
```

### 2. Nueva función para verificar si el usuario es admin de un reseller

```sql
CREATE OR REPLACE FUNCTION public.is_reseller_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm
    INNER JOIN public.organizations o ON tm.organization_id = o.id
    WHERE tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.is_active = true
      AND o.organization_type = 'whitelabel'
  )
$$;
```

### 3. Función para obtener el ID del reseller del usuario actual

```sql
CREATE OR REPLACE FUNCTION public.get_reseller_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.team_members tm
  INNER JOIN public.organizations o ON tm.organization_id = o.id
  WHERE tm.user_id = auth.uid()
    AND tm.role = 'admin'
    AND tm.is_active = true
    AND o.organization_type = 'whitelabel'
  LIMIT 1
$$;
```

### 4. Actualizar políticas RLS para `organizations`

```sql
-- Resellers pueden ver sus sub-clientes
CREATE POLICY "Resellers can view their sub-organizations"
ON public.organizations
FOR SELECT
USING (
  parent_organization_id = get_reseller_organization_id()
  AND is_reseller_admin()
);

-- Resellers pueden crear sub-clientes
CREATE POLICY "Resellers can create sub-organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  parent_organization_id = get_reseller_organization_id()
  AND is_reseller_admin()
  AND organization_type = 'direct'
);

-- Resellers pueden actualizar sus sub-clientes
CREATE POLICY "Resellers can update their sub-organizations"
ON public.organizations
FOR UPDATE
USING (
  parent_organization_id = get_reseller_organization_id()
  AND is_reseller_admin()
);
```

## Nuevos Archivos a Crear

### 1. `src/hooks/useResellerAdmin.ts`
Hook para manejar operaciones de reseller admin:
- Obtener sub-clientes de su organización
- Crear nuevos sub-clientes
- Aprobar/revocar sub-clientes
- Estadísticas del reseller

### 2. `src/pages/ResellerAdmin.tsx`
Panel de administración para resellers:
- Lista de sus sub-clientes
- Botón para crear nuevo sub-cliente
- Estadísticas de uso
- Sin acceso a configuración de marca (ya la tiene el Super Admin)

### 3. `src/components/reseller/CreateSubClientDialog.tsx`
Diálogo simplificado para crear sub-clientes:
- Nombre de la empresa
- Email del admin
- Estado de aprobación
- Hereda el branding del reseller padre

## Archivos a Modificar

### 1. `src/hooks/useSuperAdmin.ts`
- Incluir `parent_organization_id` en interfaces
- Agregar filtros para ver jerarquía
- Función para asignar sub-cliente a reseller

### 2. `src/pages/Admin.tsx`
- Mostrar estructura jerárquica
- Indicar qué organizaciones son sub-clientes
- Permitir mover sub-clientes entre resellers

### 3. `src/components/layout/Sidebar.tsx`
- Agregar enlace a `/reseller-admin` para admins de whitelabel
- Ocultar `/admin` para usuarios normales (ya funciona)

### 4. `src/components/layout/AppLayout.tsx`
- Verificar si usuario es reseller admin
- Pasar prop correspondiente al Sidebar

### 5. `src/App.tsx`
- Agregar ruta `/reseller-admin`

### 6. `src/hooks/useTeam.ts`
- Incluir `parent_organization_id` en la interfaz `Organization`

## Flujo de Usuario

### Para ti (Super Admin):
```text
1. Creas un reseller de marca blanca (Acme CRM)
2. El admin del reseller se registra
3. El reseller accede a /reseller-admin
4. El reseller crea sus propios clientes
5. Tú ves todo en /admin con estructura jerárquica
```

### Para el Reseller (Marca Blanca):
```text
1. Accede a su dashboard normal del CRM
2. Ve enlace "Administración" en sidebar
3. En /reseller-admin ve sus sub-clientes
4. Puede crear nuevos sub-clientes
5. Los sub-clientes ven el branding del reseller
```

## Lógica de Branding para Sub-Clientes

Los sub-clientes heredan automáticamente el branding del reseller padre:

```typescript
// Al crear sub-cliente
const subClient = {
  name: formData.name,
  parent_organization_id: resellerOrgId,
  organization_type: 'direct', // Los sub-clientes son tipo "direct"
  // Hereda branding del padre
  logo_url: parentOrg.logo_url,
  primary_color: parentOrg.primary_color,
  secondary_color: parentOrg.secondary_color,
  // El dominio del padre aplica a sub-clientes
};
```

## Orden de Implementación

| Paso | Descripción | Tipo |
|------|-------------|------|
| 1 | Migración: agregar `parent_organization_id` | DB |
| 2 | Migración: crear funciones `is_reseller_admin()` y `get_reseller_organization_id()` | DB |
| 3 | Migración: actualizar políticas RLS | DB |
| 4 | Crear `src/hooks/useResellerAdmin.ts` | Frontend |
| 5 | Crear `src/pages/ResellerAdmin.tsx` | Frontend |
| 6 | Crear `src/components/reseller/CreateSubClientDialog.tsx` | Frontend |
| 7 | Actualizar Sidebar para mostrar enlace a resellers | Frontend |
| 8 | Agregar ruta en App.tsx | Frontend |
| 9 | Actualizar `src/pages/Admin.tsx` para mostrar jerarquía | Frontend |

## Consideraciones de Seguridad

1. **Aislamiento de datos**: Los resellers solo ven sus propios sub-clientes
2. **RLS en cascada**: Los sub-clientes heredan las mismas restricciones RLS
3. **Validación server-side**: Las funciones SECURITY DEFINER previenen escalación de privilegios
4. **Sin acceso cruzado**: Un reseller no puede ver datos de otro reseller

## Vista Final del Admin (Super Admin)

```text
┌────────────────────────────────────────────────────────┐
│ Panel de Administración                                │
├────────────────────────────────────────────────────────┤
│ [Todos] [Directos] [Marca Blanca] [Sub-clientes]       │
├────────────────────────────────────────────────────────┤
│ ▶ Acme CRM (Marca Blanca)                     ✓ Aprobada│
│   └─ Cliente Final 1                          ✓ Aprobada│
│   └─ Cliente Final 2                          ✓ Aprobada│
│                                                        │
│ ▶ Beta Solutions (Marca Blanca)               ✓ Aprobada│
│   └─ Empresa ABC                              ⏳ Pendiente│
│                                                        │
│ ▷ Mi Empresa Directa (Directo)                ✓ Aprobada│
└────────────────────────────────────────────────────────┘
```

