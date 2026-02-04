
# Plan: Sistema de Gestión de Datos para CRM

## Resumen Ejecutivo

Implementar un módulo completo de gestión de datos que incluye importación/exportación de datos, detección de duplicados, operaciones masivas, y registro de auditoría. Todo sin modificar las funcionalidades existentes del CRM.

---

## Fase 1: Base de Datos (Migraciones)

### Nuevas Tablas a Crear

| Tabla | Propósito |
|-------|-----------|
| `import_jobs` | Registro de trabajos de importación con progreso y resultados |
| `export_jobs` | Registro de exportaciones con links de descarga |
| `duplicates` | Duplicados detectados pendientes de revisión |
| `audit_log` | Historial completo de cambios en el CRM |
| `backups` | Metadatos de respaldos automáticos |

### Storage Bucket

Crear bucket `data-files` para almacenar archivos de importación/exportación.

### Triggers Automáticos

Crear triggers en `contacts`, `companies` y `opportunities` para registrar automáticamente todos los cambios en `audit_log`.

---

## Fase 2: Nuevas Dependencias

```
papaparse    - Parseo de archivos CSV
xlsx         - Lectura/escritura de archivos Excel  
react-dropzone - Componente de drag & drop para uploads
```

---

## Fase 3: Estructura de Archivos

```text
src/
├── pages/
│   └── DataManagement.tsx           # Nueva página principal
├── components/
│   └── data-management/
│       ├── ImportTab.tsx            # Tab de importación
│       ├── ExportTab.tsx            # Tab de exportación
│       ├── DuplicatesTab.tsx        # Tab de duplicados
│       ├── BulkOperationsTab.tsx    # Tab de operaciones masivas
│       ├── AuditLogTab.tsx          # Tab de auditoría
│       ├── ColumnMappingDialog.tsx  # Modal para mapear columnas
│       ├── MergeDialog.tsx          # Modal para fusionar duplicados
│       └── DataPreviewTable.tsx     # Preview de datos a importar
├── hooks/
│   ├── useImportJobs.ts             # Hook para importaciones
│   ├── useExportJobs.ts             # Hook para exportaciones
│   ├── useDuplicates.ts             # Hook para duplicados
│   └── useAuditLog.ts               # Hook para auditoría
├── types/
│   └── data-management.ts           # Tipos TypeScript
supabase/
└── functions/
    ├── process-import/index.ts      # Edge function para procesar imports
    ├── process-export/index.ts      # Edge function para generar exports
    └── scan-duplicates/index.ts     # Edge function para detectar duplicados
```

---

## Fase 4: Componentes por Tab

### Tab 1: Importar Datos

```text
┌─────────────────────────────────────────────────────────────┐
│ Paso 1: Selecciona tipo de datos                            │
│ ○ Contactos   ○ Empresas   ○ Oportunidades   ○ Tareas      │
│                                                              │
│ Paso 2: Sube tu archivo                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  Arrastra archivo aquí o haz click                     │ │
│ │  Formatos: CSV, Excel (.xlsx)  ·  Máximo: 10 MB        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ Paso 3: Mapeo de columnas (automático + editable)          │
│                                                              │
│ Paso 4: Opciones                                            │
│ ☐ Actualizar existentes  ☐ Saltar duplicados               │
│                                                              │
│ [Iniciar Importación]                                       │
│                                                              │
│ ─────────── Importaciones Recientes ───────────            │
│ contactos.csv  ✓ Completado  156/160 registros             │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Drag & drop de archivos CSV/Excel
- Preview de primeras 5 filas
- Auto-mapeo inteligente de columnas
- Progress bar en tiempo real
- Historial de importaciones

### Tab 2: Exportar Datos

```text
┌─────────────────────────────────────────────────────────────┐
│ ¿Qué deseas exportar?                                       │
│ ☑ Contactos     ☐ Oportunidades                            │
│ ☑ Empresas      ☐ Tareas                                   │
│                                                              │
│ Formato: ○ CSV  ● Excel  ○ JSON                            │
│                                                              │
│ Filtros opcionales:                                         │
│ Fecha: [Desde ▼] [Hasta ▼]                                │
│                                                              │
│ [Exportar Datos]                                            │
│                                                              │
│ ─────────── Exportaciones Recientes ───────────            │
│ export-2024-02-03.xlsx  [Descargar]  Expira en 5 días     │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Selección múltiple de entidades
- Formatos CSV, Excel, JSON
- Filtros por fecha
- Links de descarga con expiración

### Tab 3: Duplicados

```text
┌─────────────────────────────────────────────────────────────┐
│ [Buscar Duplicados]     12 posibles encontrados            │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Juan Pérez              ←→        Juan Perez           │ │
│ │ juan@acme.com                      juan@acme.com        │ │
│ │ +57 300 123 4567                   +573001234567        │ │
│ │                                                         │ │
│ │ Coincidencia: 95%  (email, teléfono)                   │ │
│ │                                                         │ │
│ │ [Fusionar] [No es duplicado] [Ignorar]                 │ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Algoritmo de detección:**
- Email exacto = 100% match
- Teléfono normalizado = 80% match
- Nombre similar + mismo dominio = 70% match

### Tab 4: Operaciones Masivas

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Entidad: ○ Contactos  ○ Empresas  ○ Oportunidades      │
│                                                              │
│ 2. Filtros:                                                  │
│    [Campo ▼] [Operador ▼] [Valor]  [+ Añadir]             │
│                                                              │
│ 3. Vista previa: 45 registros seleccionados                │
│                                                              │
│ 4. Acción:                                                   │
│    ○ Actualizar campo(s)                                    │
│    ○ Eliminar registros                                     │
│                                                              │
│ [Ejecutar]  [Vista Previa]                                  │
│                                                              │
│ ⚠ Esta acción no se puede deshacer                          │
└─────────────────────────────────────────────────────────────┘
```

### Tab 5: Auditoría

```text
┌─────────────────────────────────────────────────────────────┐
│ Filtros: [Acción ▼] [Entidad ▼] [Fecha ▼]                 │
│                                                              │
│ Hace 5 minutos                                              │
│ Usuario actualizó contacto "Ana Pérez"                     │
│ Campo: phone                                                 │
│ Antes: +57 300 111 1111 → Después: +57 300 222 2222        │
│                                                              │
│ Hace 2 horas                                                │
│ Sistema importó 156 contactos                               │
│ Archivo: contactos-enero.csv                                │
│                                                              │
│ [Exportar Log]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 5: Edge Functions

### 1. process-import

Procesa archivos de importación en segundo plano:
- Lee archivo del storage
- Valida datos (emails, teléfonos)
- Inserta registros en lotes
- Actualiza progreso en `import_jobs`
- Registra en `audit_log`

### 2. process-export

Genera archivos de exportación:
- Consulta datos según filtros
- Genera CSV/Excel/JSON
- Sube a storage
- Actualiza `export_jobs` con URL

### 3. scan-duplicates

Detecta duplicados potenciales:
- Compara emails exactos
- Normaliza y compara teléfonos
- Calcula similitud de nombres
- Inserta resultados en `duplicates`

---

## Fase 6: Integración en Navegación

Agregar al Sidebar (sin modificar items existentes):

```typescript
// Añadir después de Settings
{ to: '/data-management', icon: Database, label: 'Datos' }
```

Agregar ruta en App.tsx:

```typescript
<Route path="/data-management" element={<AppLayout><DataManagement /></AppLayout>} />
```

---

## Tipos TypeScript Nuevos

```typescript
interface ImportJob {
  id: string;
  user_id: string;
  filename: string;
  file_size?: number;
  entity_type: 'contacts' | 'companies' | 'opportunities' | 'activities';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors?: ImportError[];
  column_mapping?: Record<string, string>;
  created_at: string;
}

interface Duplicate {
  id: string;
  entity_type: 'contacts' | 'companies';
  entity_id_1: string;
  entity_id_2: string;
  similarity_score: number;
  matching_fields: string[];
  status: 'pending' | 'merged' | 'dismissed';
}

interface AuditLogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export';
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
}
```

---

## Orden de Implementación

| Paso | Tarea | Archivos |
|------|-------|----------|
| 1 | Crear migración con tablas y triggers | SQL Migration |
| 2 | Crear storage bucket | SQL Migration |
| 3 | Agregar nuevos tipos TypeScript | `src/types/data-management.ts` |
| 4 | Crear hooks de datos | `src/hooks/useImportJobs.ts`, etc. |
| 5 | Crear página principal | `src/pages/DataManagement.tsx` |
| 6 | Crear componentes de tabs | `src/components/data-management/*.tsx` |
| 7 | Agregar ruta y navegación | `src/App.tsx`, `src/components/layout/Sidebar.tsx` |
| 8 | Crear edge functions | `supabase/functions/*/index.ts` |
| 9 | Actualizar config.toml | `supabase/config.toml` |

---

## Consideraciones de Seguridad

1. **RLS en todas las tablas nuevas** - Usuarios solo ven sus propios datos
2. **Validación de archivos** - Límite de 10MB, solo CSV/Excel
3. **Sanitización de datos** - Prevenir inyección SQL en imports
4. **Expiración de links** - Exports expiran en 7 días
5. **Confirmación de acciones destructivas** - Modal antes de bulk delete

---

## Dependencias a Instalar

```json
{
  "papaparse": "^5.4.1",
  "xlsx": "^0.18.5",
  "react-dropzone": "^14.2.3"
}
```

Y tipos para desarrollo:
```json
{
  "@types/papaparse": "^5.3.14"
}
```
