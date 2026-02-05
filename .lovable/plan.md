
# Plan: Corrección de Problemas y Mejoras Reportados

## Resumen de Problemas Identificados

| # | Problema | Prioridad |
|---|----------|-----------|
| 1 | Dashboard lento con múltiples refrescos | Alta |
| 2 | Aprobaciones de sub-clientes llegan a super admin en vez de marca blanca | Alta |
| 3 | Emails de empresas no visibles en panel admin | Media |
| 4 | No permite modificar nombre de organización (usuario empresa) | Media |
| 5 | Error slug duplicado al crear sub-cliente | Alta |
| 6 | Falta opción "Sin empresa" en selector de contactos | Baja |

---

## Corrección 1: Dashboard Lento y Refrescos Múltiples

### Problema
El Dashboard ejecuta 4 queries independientes (`useContacts`, `useCompanies`, `useOpportunities`, `useActivities`) sin optimización. Cada hook hace su propia petición y puede causar re-renders múltiples.

### Solución
- Agregar `staleTime` y `refetchOnWindowFocus: false` a los hooks del dashboard
- Optimizar las queries para cargar solo los datos necesarios (limitar resultados)
- Usar `useMemo` para cálculos derivados

### Archivos a modificar
- `src/pages/Dashboard.tsx`: Agregar memoización y optimizar renders
- `src/hooks/useContacts.ts`: Agregar configuración de cache
- `src/hooks/useCompanies.ts`: Agregar configuración de cache
- `src/hooks/useOpportunities.ts`: Agregar configuración de cache
- `src/hooks/useActivities.ts`: Agregar configuración de cache

---

## Corrección 2: Aprobación de Sub-clientes por Marca Blanca

### Problema
Cuando una marca blanca crea un sub-cliente, la aprobación debería ser manejada por la propia marca blanca, no por el super admin.

### Solución Actual
El sistema ya implementa esto correctamente en `useResellerAdmin.ts`:
- `approveSubClient` permite a las marcas blancas aprobar sus propios sub-clientes
- El panel de marca blanca (`ResellerAdmin.tsx`) ya muestra los botones de aprobar

### Posible Bug
Si las aprobaciones llegan al super admin, puede ser porque:
1. La creación del sub-cliente no establece correctamente `parent_organization_id`
2. Las RLS policies permiten que el super admin vea estas pendientes

### Solución
- Verificar que al crear sub-cliente se asigne correctamente `parent_organization_id`
- En el panel de super admin, filtrar para no mostrar sub-clientes que pertenecen a una marca blanca
- Añadir lógica en la tabla del admin para excluir organizaciones con `parent_organization_id`

### Archivos a modificar
- `src/pages/Admin.tsx`: Filtrar sub-clientes de la vista principal
- `src/hooks/useSuperAdmin.ts`: Excluir sub-clientes de `pendingOrganizations`

---

## Corrección 3: Emails no Visibles en Panel Admin

### Problema
En la fila de la tabla de empresas, solo se muestra `custom_domain || admin_email` pero `admin_email` puede ser null si no hay admin asignado.

### Código Actual (línea 107-109 Admin.tsx)
```typescript
<p className="text-xs text-muted-foreground">
  {org.custom_domain || org.admin_email || 'Sin admin'}
</p>
```

### Solución
- Mostrar el email en una columna separada más visible
- Añadir columna "Email Admin" a la tabla
- Hacer clic en la fila para ver detalles de la empresa

### Archivos a modificar
- `src/pages/Admin.tsx`: Añadir columna de email y hacer filas clickeables
- `src/components/admin/OrganizationDetailDialog.tsx`: Crear nuevo componente (opcional)

---

## Corrección 4: No Permite Modificar Nombre de Organización

### Problema
En Settings.tsx (línea 207-217), el campo de nombre de organización está marcado como `disabled` y dice "Solo lectura" para todos los usuarios.

### Código Actual
```typescript
<Input
  id="org_name"
  value={organization?.name || ''}
  disabled  // <-- Siempre deshabilitado
  className="flex-1"
/>
<span className="text-xs text-muted-foreground">
  Solo lectura
</span>
```

### Solución
- Permitir que los administradores de la organización editen el nombre
- Usar `canEditBranding` (que ya verifica si es admin) para controlar el campo
- Actualizar la mutación `updateBranding` para incluir el nombre

### Archivos a modificar
- `src/pages/Settings.tsx`: Hacer editable el nombre para admins

---

## Corrección 5: Error Slug Duplicado al Crear Sub-cliente

### Problema
Error: `duplicate key value violates unique constraint "organizations_slug_key"`

El slug se genera así:
```typescript
slug: data.name.toLowerCase().replace(/\s+/g, '-'),
```

Si dos empresas tienen el mismo nombre, el slug será idéntico causando conflicto.

### Solución
- Generar slug único añadiendo sufijo aleatorio o timestamp
- Implementar función `generateUniqueSlug` que verifique existencia

### Código Propuesto
```typescript
const generateSlug = (name: string) => {
  const baseSlug = name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const suffix = Date.now().toString(36).slice(-4);
  return `${baseSlug}-${suffix}`;
};
```

### Archivos a modificar
- `src/hooks/useResellerAdmin.ts`: Usar slug único en createSubClient
- `src/hooks/useSuperAdmin.ts`: Usar slug único en createOrganization

---

## Corrección 6: Falta Opción "Sin Empresa" en Selector

### Problema
El select de empresa al crear contacto no tiene opción para dejar sin empresa asignada.

### Código Actual (Contacts.tsx líneas 306-320)
```typescript
<Select value={formData.company_id} onValueChange={...}>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona una empresa" />
  </SelectTrigger>
  <SelectContent>
    {companies.map((company) => (
      <SelectItem key={company.id} value={company.id}>
        {company.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Solución
Añadir opción "Sin empresa" al inicio del select:
```typescript
<SelectContent>
  <SelectItem value="none">Sin empresa</SelectItem>
  {companies.map((company) => (...))}
</SelectContent>
```

### Archivos a modificar
- `src/pages/Contacts.tsx`: Añadir opción "Sin empresa"

---

## Secuencia de Implementación

1. **Corrección 5** - Slug duplicado (más crítico, bloquea funcionalidad)
2. **Corrección 6** - Sin empresa (cambio simple)
3. **Corrección 4** - Editar nombre organización
4. **Corrección 3** - Emails en panel admin
5. **Corrección 2** - Filtrar sub-clientes en admin
6. **Corrección 1** - Optimización dashboard

---

## Sección Técnica

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/hooks/useResellerAdmin.ts` | Generar slug único |
| `src/hooks/useSuperAdmin.ts` | Generar slug único, filtrar pendientes |
| `src/pages/Contacts.tsx` | Añadir opción "Sin empresa" |
| `src/pages/Settings.tsx` | Hacer editable nombre para admins |
| `src/pages/Admin.tsx` | Añadir columna email, filtrar sub-clientes |
| `src/pages/Dashboard.tsx` | Optimizar con useMemo |
| `src/hooks/useContacts.ts` | Añadir staleTime |
| `src/hooks/useCompanies.ts` | Añadir staleTime |
| `src/hooks/useOpportunities.ts` | Añadir staleTime |
| `src/hooks/useActivities.ts` | Añadir staleTime |

### Función Utilitaria a Crear

```typescript
// src/lib/utils.ts
export function generateUniqueSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const suffix = Date.now().toString(36).slice(-4);
  return `${baseSlug}-${suffix}`;
}
```
