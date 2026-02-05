
# Plan: Corrección Crítica del Sistema de Importación de Contactos

## Diagnóstico del Problema

### Estado Actual del Job
| Campo | Valor |
|-------|-------|
| ID | 8722c4c4-a3de-4ee8-b54d-bab3c71404dd |
| Estado | `processing` (atascado) |
| Progreso | 76% |
| Procesados | 1181 / 1558 |
| Exitosos | 0 |
| Fallidos | 1181 |

### Causas Raíz Identificadas

1. **Columnas inválidas en el mapeo**: El usuario mapeó `ESTADO` → `status` y `TIPO` → `type`, pero estos campos **NO existen** en la tabla `contacts`. Cada INSERT falla por error de columna inexistente.

2. **Sin validación de campos**: La edge function acepta cualquier campo del mapeo sin validar que exista en la tabla destino.

3. **Email vacío**: El campo `email` es `NOT NULL` en la tabla, pero algunos registros del Excel pueden tenerlo vacío.

4. **Falta organization_id**: Los contactos deben pertenecer a una organización, pero el import no está asignando este campo.

5. **Job atascado**: La función terminó por timeout sin actualizar el estado final a `failed` o `completed_with_errors`.

---

## Solución Propuesta

### Cambio 1: Validar campos antes del mapeo (Edge Function)

Agregar una lista blanca de campos válidos por entidad y filtrar el mapeo:

```text
const VALID_FIELDS = {
  contacts: ['first_name', 'last_name', 'email', 'phone', 'mobile', 
             'whatsapp_number', 'job_title', 'department', 'notes',
             'linkedin_url', 'twitter_url', 'instagram_username'],
  companies: ['name', 'domain', 'website', 'industry', 'phone', 
              'address', 'city', 'country', 'employee_count', 'revenue', 'description'],
  opportunities: ['title', 'value', 'currency', 'probability', 'status', 
                  'expected_close_date', 'description'],
  activities: ['title', 'type', 'description', 'due_date', 'priority', 'completed']
};
```

### Cambio 2: Obtener organization_id del usuario

La edge function debe obtener el `organization_id` del job owner usando la función RPC `get_user_organization_id` y asignarlo a cada registro importado.

### Cambio 3: Manejar email vacío

Para contactos donde email esté vacío, generar un email placeholder basado en el nombre y un identificador único: `{nombre}.import.{uuid_corto}@placeholder.local`

### Cambio 4: Mejorar logs y manejo de errores

Agregar logging detallado de qué campo causó el error y asegurar que el job siempre se finalice correctamente (even on timeout).

### Cambio 5: Agregar recovery para jobs atascados

Crear mecanismo para detectar jobs en `processing` por más de 5 minutos y marcarlos como `failed` o permitir reintentar.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `supabase/functions/process-import/index.ts` | Validación de campos, organization_id, manejo de email vacío, mejores logs |
| `src/components/data-management/ImportTab.tsx` | Agregar botón para reintentar/cancelar jobs atascados |
| `src/hooks/useImportJobs.ts` | Agregar función para reintentar importación fallida |
| `src/components/data-management/ColumnMappingDialog.tsx` | Mostrar advertencia cuando se mapean columnas a campos inexistentes |

---

## Sección Técnica

### Edge Function Actualizada (process-import/index.ts)

```typescript
// Lista de campos válidos por entidad
const VALID_FIELDS: Record<string, string[]> = {
  contacts: ['first_name', 'last_name', 'email', 'phone', 'mobile', 
             'whatsapp_number', 'job_title', 'department', 'notes',
             'linkedin_url', 'twitter_url', 'instagram_username'],
  companies: ['name', 'domain', 'website', 'industry', 'phone', 
              'address', 'city', 'country', 'employee_count', 'revenue', 'description'],
  opportunities: ['title', 'value', 'currency', 'probability', 'status', 
                  'expected_close_date', 'description'],
  activities: ['title', 'type', 'description', 'due_date', 'priority', 'completed']
};

// Filtrar mapeo a solo campos válidos
const validMapping: Record<string, string> = {};
const invalidFields: string[] = [];
for (const [source, target] of Object.entries(column_mapping)) {
  if (VALID_FIELDS[entity_type].includes(target as string)) {
    validMapping[source] = target as string;
  } else {
    invalidFields.push(`${source} -> ${target}`);
  }
}

console.log(`Valid mappings: ${Object.keys(validMapping).length}`);
if (invalidFields.length > 0) {
  console.log(`Invalid fields ignored: ${invalidFields.join(', ')}`);
}

// Obtener organization_id del usuario
const { data: teamMember } = await supabaseClient
  .from('team_members')
  .select('organization_id')
  .eq('user_id', userId)
  .eq('is_active', true)
  .single();

const organizationId = teamMember?.organization_id;

// En el mapeo de cada fila
const mappedData: Record<string, unknown> = { 
  user_id: userId,
  organization_id: organizationId // Agregar organization
};

// Manejo de email vacío para contactos
if (entity_type === 'contacts' && !mappedData.email) {
  const name = (mappedData.first_name || 'contact') as string;
  const shortId = crypto.randomUUID().slice(0, 8);
  mappedData.email = `${name.toLowerCase().replace(/\s+/g, '.')}.import.${shortId}@placeholder.local`;
}
```

### Actualización del Frontend (ImportTab.tsx)

Agregar detección de jobs atascados y opciones de acción:

```typescript
// Detectar si un job está atascado (más de 5 min en processing)
const isJobStuck = (job: ImportJob) => {
  if (job.status !== 'processing') return false;
  const startTime = job.started_at ? new Date(job.started_at).getTime() : 0;
  const now = Date.now();
  return (now - startTime) > 5 * 60 * 1000; // 5 minutos
};

// Mostrar botón de retry/cancel para jobs atascados
{isJobStuck(job) && (
  <div className="flex gap-2">
    <Button size="sm" variant="outline" onClick={() => retryImport(job)}>
      Reintentar
    </Button>
    <Button size="sm" variant="destructive" onClick={() => cancelImport(job.id)}>
      Cancelar
    </Button>
  </div>
)}
```

### Consulta para Limpiar Job Atascado

Antes de la implementación, limpiar el job actual:

```sql
UPDATE import_jobs 
SET status = 'failed', 
    completed_at = now(),
    errors = '[{"row": 0, "field": "system", "error": "Campos mapeados inválidos: status, type no existen en contacts"}]'::jsonb
WHERE id = '8722c4c4-a3de-4ee8-b54d-bab3c71404dd';
```

---

## Secuencia de Implementación

1. **Limpiar job atascado** - Marcar como fallido vía SQL
2. **Actualizar edge function** - Validación de campos, organization_id, email placeholder
3. **Actualizar frontend** - Detección de jobs atascados, botones de acción
4. **Mejorar ColumnMappingDialog** - Advertencia visual para campos inválidos
5. **Testing** - Probar importación con archivo de ejemplo

---

## Mejoras de Rendimiento Adicionales

- Usar `Promise.allSettled` para procesar batches en paralelo (con límite)
- Implementar streaming para archivos muy grandes (+10,000 filas)
- Agregar cola de procesamiento con estado persistente

