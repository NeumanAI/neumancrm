

# Eliminar Aprobación Manual + Agregar Bloqueo por Spam

## Resumen

Cambiar el flujo de registro para que los usuarios accedan inmediatamente al CRM después del onboarding, sin esperar aprobación manual. Se agrega un sistema de bloqueo por spam/abuso que el admin puede activar cuando lo necesite.

**Flujo actual:** Registro -> /pending-approval -> Admin aprueba -> /dashboard
**Flujo nuevo:** Registro -> /onboarding -> /dashboard (inmediato). Admin puede bloquear cuentas abusivas -> /blocked

---

## Cambios planificados

### 1. Migración de base de datos
- Aprobar automáticamente todas las organizaciones pendientes existentes
- Agregar columnas `is_blocked`, `blocked_at`, `blocked_by`, `blocked_reason` a la tabla `organizations`
- Crear trigger `auto_approve_organization()` que setea `is_approved = true` automáticamente en cada INSERT

### 2. Crear `src/pages/Blocked.tsx`
- Página para cuentas suspendidas con icono ShieldX, mensaje claro y enlace a soporte
- Botón de cerrar sesión

### 3. Modificar `src/App.tsx`
- Reemplazar import de `PendingApproval` por `Blocked`
- Ruta `/blocked` nueva
- `/pending-approval` redirige a `/blocked` (compatibilidad)

### 4. Modificar `src/components/layout/AppLayout.tsx`
- Cambiar guard de `!organization.is_approved` a `organization.is_blocked`
- Redirigir a `/blocked` en lugar de `/pending-approval`

### 5. Modificar `src/hooks/useTeam.ts`
- Agregar `is_blocked` y `blocked_reason` al tipo `Organization`

### 6. Modificar `src/hooks/useSuperAdmin.ts`
- Agregar `is_blocked` al tipo `OrganizationWithAdmin`
- Agregar mutaciones `blockOrganization` y `unblockOrganization`
- Actualizar filtros: `blockedOrganizations`, `activeOrganizations`
- Mantener `pendingOrganizations` como array vacio y `approvedOrganizations` como alias de `activeOrganizations` para no romper codigo existente

### 7. Modificar `src/pages/Admin.tsx`
- Reemplazar badges "Aprobada/Pendiente" por "Activa/Bloqueada"
- Reemplazar botones "Aprobar/Revocar" por "Bloquear/Desbloquear"
- Actualizar card de "Pendientes" por "Bloqueadas"
- Eliminar tab "Pendientes" (ya no aplica)

### 8. Modificar `src/hooks/useResellerAdmin.ts`
- Sub-clientes creados por resellers siempre con `is_approved: true`

---

## Detalles tecnicos

### Migración SQL
```sql
-- Auto-aprobar existentes
UPDATE public.organizations SET is_approved = true, approved_at = now() WHERE is_approved = false;

-- Nuevas columnas
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_by UUID,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Trigger auto-aprobar
CREATE OR REPLACE FUNCTION public.auto_approve_organization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.is_approved := true;
  NEW.approved_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_approve_org_on_insert
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION auto_approve_organization();
```

### Archivos nuevos
| Archivo | Descripcion |
|---|---|
| `src/pages/Blocked.tsx` | Pagina para cuentas bloqueadas |

### Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Rutas /blocked, redirect /pending-approval |
| `src/components/layout/AppLayout.tsx` | Guard is_blocked en lugar de is_approved |
| `src/hooks/useTeam.ts` | Tipo Organization con is_blocked |
| `src/hooks/useSuperAdmin.ts` | Mutaciones block/unblock, filtros nuevos |
| `src/hooks/useResellerAdmin.ts` | Auto-aprobar sub-clientes |
| `src/pages/Admin.tsx` | UI Bloquear/Desbloquear |

### Archivo eliminable
| Archivo | Accion |
|---|---|
| `src/pages/PendingApproval.tsx` | Ya no se usa (la ruta redirige a /blocked) |

