
# Plan: Corrección de Problemas y Mejoras del CRM

## Resumen de Problemas Identificados

| # | Problema | Prioridad | Archivo Principal |
|---|----------|-----------|-------------------|
| 1 | Nombre de empresa no visible en lugar prominente | Media | `Header.tsx` |
| 2 | "Configuración" y "Perfil" abren la misma página | Media | `Header.tsx` |
| 3 | Error al invitar miembro: foreign key violation | Alta | `useTeam.ts` |
| 4 | Menús "Firma Digital" y "AgenticRAG" visibles para todos | Alta | `Sidebar.tsx` |
| 5 | Falta opción "Labs" en menú de Plataforma IA | Baja | `Sidebar.tsx` |
| 6 | "Exportar datos" visible para todos (solo super admin) | Media | `DataManagement.tsx`, `Sidebar.tsx` |
| 7 | Importación pendiente sin procesar (timeout en edge function) | Alta | `process-import/index.ts` |
| 8 | Campos de contacto: simplificar a WhatsApp + Otro número + Instagram | Media | `ContactSidebar.tsx`, tipos |
| 9 | Tareas: solo fecha, no hora | Baja | `Tasks.tsx` |

---

## Corrección 1: Mostrar Nombre de Empresa en Lugar Visible

### Problema
El nombre de la organización/empresa no se muestra de forma visible para el usuario.

### Solución
Agregar el nombre de la organización en el header, junto al email del usuario.

### Archivos a modificar
- `src/components/layout/Header.tsx`: Mostrar nombre de organización en el dropdown del usuario

---

## Corrección 2: "Configuración" y "Perfil" Abren la Misma Página

### Problema
En el menú del usuario (Header), tanto "Perfil" como "Configuración" navegan a `/settings`.

### Solución
Eliminar una de las opciones o diferenciar sus destinos. Recomendación: Mantener solo "Configuración" ya que `/settings` contiene todo.

### Archivos a modificar
- `src/components/layout/Header.tsx`: Eliminar la opción "Perfil" redundante

---

## Corrección 3: Error al Invitar Miembro del Equipo

### Problema
Error: `insert or update on table "team_members" violates foreign key constraint "team_members_user_id_fkey"`

El código actual genera un UUID aleatorio (`crypto.randomUUID()`) como `user_id` placeholder, pero la tabla tiene una foreign key a `auth.users` que no permite IDs inexistentes.

### Solución
Cambiar el flujo de invitación:
1. Crear el registro con `user_id = NULL` (nullable) o usar el ID del usuario que invita temporalmente
2. Agregar campo `invited_email` para rastrear invitaciones pendientes
3. Cuando el usuario invitado se registre, vincular el `user_id` real

### Opción Alternativa (más simple)
Usar el sistema de "pending_admin_email" existente en organizations, adaptado para team_members.

### Archivos a modificar
- `src/hooks/useTeam.ts`: Cambiar lógica de invitación para no usar UUID falso

---

## Corrección 4: Menús de Plataforma IA Visibles para Todos

### Problema
Los menús "Firma Digital" y "AgenticRAG" son visibles para todos los usuarios, pero deberían estar solo disponibles para super admins y ubicados bajo "Administración".

### Código Actual
El sidebar ya tiene la lógica correcta (`isSuperAdmin`), pero puede haber un problema con la verificación del estado.

### Solución
Verificar que `isSuperAdmin` se evalúe correctamente y que los items estén dentro del bloque condicional.

### Archivos a modificar
- `src/components/layout/Sidebar.tsx`: Confirmar que los items de Plataforma IA solo se muestran para super admins

---

## Corrección 5: Agregar Opción "Labs" en Plataforma IA

### Problema
Falta la opción "Labs" en el menú de Plataforma IA, que debería mostrar un mensaje de "En construcción".

### Solución
1. Crear nueva página `src/pages/Labs.tsx` similar a AgenticRAG
2. Agregar item al array `platformAINavItems`
3. Agregar ruta en `App.tsx`

### Archivos a modificar/crear
- `src/pages/Labs.tsx`: Nueva página con mensaje "En construcción"
- `src/components/layout/Sidebar.tsx`: Agregar item Labs
- `src/App.tsx`: Agregar ruta `/admin/labs`

---

## Corrección 6: Exportar Datos Solo para Admin de Cuenta

### Problema
La opción de "Exportar datos" debería estar disponible solo para el super administrador de cada cuenta (rol admin de la organización).

### Solución
1. Ocultar la pestaña "Exportar" en DataManagement para usuarios que no sean admin
2. O mover la funcionalidad de exportación a un lugar más restringido

### Archivos a modificar
- `src/pages/DataManagement.tsx`: Verificar rol y ocultar pestaña de exportación si no es admin
- `src/components/data-management/ExportTab.tsx`: Agregar verificación de permisos

---

## Corrección 7: Importación Pendiente Sin Procesar

### Problema
La importación de Excel se quedó en "Procesando" y nunca completó (20 minutos esperando).

### Causa Probable
1. La edge function `process-import` tiene un timeout de 30 segundos por defecto
2. Procesar 1558 registros uno por uno sin batch puede exceder el timeout
3. No hay manejo de reconexión o procesamiento en chunks

### Solución
1. Procesar en batches más grandes (INSERT múltiple)
2. Usar transacciones donde sea posible
3. Agregar timeout handling y reintentos
4. Actualizar estado a "failed" si hay error

### Archivos a modificar
- `supabase/functions/process-import/index.ts`: Optimizar procesamiento con batches

---

## Corrección 8: Simplificar Campos de Teléfono en Contactos

### Problema
Actualmente hay: Teléfono, Móvil, WhatsApp. El usuario solicita: Solo WhatsApp + Otro número + Instagram.

### Solución
1. Mantener campos en DB (retrocompatibilidad)
2. En la UI mostrar solo: WhatsApp (principal), Otro teléfono (usar campo `phone`), Instagram
3. Agregar campo `instagram_username` a la UI (ya existe en DB)

### Archivos a modificar
- `src/components/contacts/ContactSidebar.tsx`: Reorganizar campos visibles
- `src/pages/Contacts.tsx`: Actualizar formulario de creación/edición

---

## Corrección 9: Tareas Solo Fecha Sin Hora

### Problema
El selector de fecha límite para tareas usa `datetime-local`, pero el usuario quiere solo fecha.

### Solución
Cambiar de `datetime-local` a `date` y ajustar el procesamiento.

### Archivos a modificar
- `src/pages/Tasks.tsx`: Cambiar input type de `datetime-local` a `date`

---

## Secuencia de Implementación

1. **Corrección 3** - Error invitación (bloquea funcionalidad crítica)
2. **Corrección 7** - Importación (bloquea funcionalidad crítica)
3. **Corrección 4** - Menús visibles (seguridad/permisos)
4. **Corrección 6** - Exportar solo admin
5. **Corrección 2** - Menú duplicado
6. **Corrección 1** - Nombre empresa visible
7. **Corrección 5** - Agregar Labs
8. **Corrección 8** - Campos contacto
9. **Corrección 9** - Solo fecha en tareas

---

## Sección Técnica

### Archivos a Crear
| Archivo | Descripción |
|---------|-------------|
| `src/pages/Labs.tsx` | Página placeholder para Labs |

### Archivos a Modificar
| Archivo | Cambios |
|---------|---------|
| `src/hooks/useTeam.ts` | Cambiar lógica de invitación para usar flujo correcto |
| `supabase/functions/process-import/index.ts` | Optimizar con batch inserts |
| `src/components/layout/Sidebar.tsx` | Agregar Labs, verificar visibilidad |
| `src/components/layout/Header.tsx` | Mostrar nombre org, eliminar menú duplicado |
| `src/pages/DataManagement.tsx` | Verificar permisos para exportar |
| `src/components/contacts/ContactSidebar.tsx` | Reorganizar campos (WhatsApp, Otro, Instagram) |
| `src/pages/Contacts.tsx` | Actualizar formulario con nuevos campos |
| `src/pages/Tasks.tsx` | Cambiar selector a solo fecha |
| `src/App.tsx` | Agregar ruta Labs |

### Cambio de Base de Datos Posible
Para la corrección 3 (invitación de miembros), se necesita:
- Hacer `user_id` nullable en `team_members`, o
- Agregar campo `pending_email` para invitaciones

```sql
-- Opción 1: Hacer user_id nullable temporalmente para invitaciones
ALTER TABLE team_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE team_members ADD COLUMN pending_email TEXT;
ALTER TABLE team_members ADD COLUMN invitation_status TEXT DEFAULT 'active';
```

### Optimización de Import (Corrección 7)

```typescript
// Batch insert en lugar de uno por uno
const batchSize = 100;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize).map(row => {
    const mappedData: Record<string, unknown> = { user_id: userId };
    for (const [sourceCol, targetField] of Object.entries(column_mapping)) {
      if (row[sourceCol] !== undefined && row[sourceCol] !== '') {
        mappedData[targetField] = row[sourceCol];
      }
    }
    return mappedData;
  });
  
  const { error } = await supabaseClient.from(entity_type).insert(batch);
  if (error) {
    failedCount += batch.length;
  } else {
    successCount += batch.length;
  }
  
  // Update progress
  const progress = Math.round(((i + batch.length) / data.length) * 100);
  await supabaseClient.from('import_jobs').update({ 
    progress, 
    processed_rows: i + batch.length,
    successful_rows: successCount,
    failed_rows: failedCount 
  }).eq('id', job_id);
}
```

