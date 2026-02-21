

# Agregar Herramientas de Documentos a la IA

## Situacion actual

La edge function `chat/index.ts` tiene 74 herramientas pero **ninguna relacionada con documentos**. Las tablas `org_documents`, `contact_documents`, `company_documents` y `document_categories` ya existen con datos y RLS configurado.

## Herramientas a agregar (6 tools)

| Tool | Descripcion | Tabla(s) |
|---|---|---|
| `search_documents` | Buscar documentos por nombre, tipo o tags en las 3 tablas | org, contact, company documents |
| `list_recent_documents` | Listar documentos recientes del repositorio central | org_documents |
| `get_document_stats` | Estadisticas: total, por tipo, almacenamiento, compartidos | org_documents |
| `list_contact_documents` | Documentos de un contacto especifico | contact_documents |
| `list_company_documents` | Documentos de una empresa especifica | company_documents |
| `share_document` | Generar link de descarga publica para un documento | org_documents |

## Cambios en un solo archivo

**`supabase/functions/chat/index.ts`** -- 3 secciones a modificar:

### 1. Tool Definitions (despues de linea ~1348)
Agregar 6 definiciones de tools con sus parametros (nombre, tipo de documento, tags, limite, etc.)

### 2. Tool Implementations (nuevas funciones)
- `searchDocuments()` -- Busca en las 3 tablas con `ilike` por file_name y document_type
- `listRecentDocuments()` -- Query a org_documents con limit y filtro por tipo
- `getDocumentStats()` -- Conteos agrupados por tipo, suma de file_size, conteo de shared
- `listContactDocuments()` -- Busca por email del contacto, luego sus documentos
- `listCompanyDocuments()` -- Busca por nombre de empresa, luego sus documentos
- `shareDocument()` -- Genera `crypto.randomUUID()` como token y actualiza `is_shared`

### 3. executeTool switch (despues de linea ~3027)
Agregar 6 cases nuevos que llaman a las funciones implementadas.

## Detalles tecnicos

- Todas las funciones usan `getOrgId()` para filtrar por organizacion
- La busqueda cruzada en 3 tablas se hace con 3 queries paralelas usando `Promise.all`
- `share_document` genera token con `crypto.randomUUID()` (disponible en Deno)
- Los resultados formatean el tamano de archivo con un helper similar al del frontend
- No se requieren cambios de base de datos ni nuevas migraciones

