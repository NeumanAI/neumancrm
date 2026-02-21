

# Modulo de Gestion Documental Completo

## Resumen

Implementar un sistema completo de gestion documental para NeumanCRM, expandiendo la base existente (documentos de contactos y empresas) con un repositorio central de organizacion, categorias personalizables, links compartidos para clientes, y busqueda con IA.

## Alcance

### Nuevos archivos a crear (13)

| Archivo | Descripcion |
|---|---|
| Migracion SQL | Expandir tablas existentes, crear `org_documents`, `document_categories`, funcion publica `get_shared_document`, bucket `org-documents` |
| `src/types/documents.ts` | Tipos compartidos, constantes de categorias base, helpers de formato |
| `src/hooks/useOrgDocuments.ts` | CRUD repositorio general, compartir links, estadisticas |
| `src/hooks/useDocumentCategories.ts` | CRUD categorias personalizadas, tipos combinados (base + custom) |
| `src/components/documents/CategoryBadge.tsx` | Badge unificado que muestra categorias base y custom con colores |
| `src/components/documents/DocumentTypeSelect.tsx` | Select reutilizable con categorias base + personalizadas |
| `src/components/documents/ShareDocumentDialog.tsx` | Dialog para generar/revocar links de descarga para clientes |
| `src/components/documents/DocumentCard.tsx` | Tarjeta de documento con acciones (descargar, compartir, eliminar) |
| `src/components/documents/UploadDocumentDialog.tsx` | Dialog de subida con tags, tipo expandido, 25MB |
| `src/components/documents/ManageCategoriesDialog.tsx` | Panel CRUD categorias con preview, colores e iconos |
| `src/components/documents/AIDocumentSearch.tsx` | Busqueda en lenguaje natural usando la edge function chat |
| `src/pages/Documents.tsx` | Pagina `/documents` con repositorio, stats y busqueda IA |
| `src/pages/SharedDocument.tsx` | Pagina publica `/shared/:token` para clientes sin auth |

### Archivos existentes a modificar (8)

| Archivo | Cambio |
|---|---|
| `src/hooks/useContactDocuments.ts` | `document_type` de union a `string`, agregar campos de sharing |
| `src/hooks/useCompanyDocuments.ts` | Mismo cambio que contactos |
| `src/components/contacts/DocumentUploader.tsx` | Usar `DocumentTypeSelect`, subir limite a 25MB |
| `src/components/contacts/DocumentItem.tsx` | Usar `CategoryBadge`, agregar boton compartir |
| `src/components/contacts/ContactDocuments.tsx` | Usar `DocumentTypeSelect` para filtros |
| `src/components/companies/CompanyDocuments.tsx` | Usar `DocumentTypeSelect` para filtros |
| `src/App.tsx` | Rutas `/documents` y `/shared/:token` |
| `src/components/layout/Sidebar.tsx` | Agregar "Documentos" al menu de navegacion |

### Edge function a actualizar (1)

| Archivo | Cambio |
|---|---|
| `supabase/functions/chat/index.ts` | 3 tools nuevas: `search_documents`, `list_recent_documents`, `get_document_stats` |

## Detalles tecnicos

### Migracion SQL

1. Expandir `contact_documents` y `company_documents` con: `organization_id`, `tags TEXT[]`, `is_shared`, `share_token`, `share_expires_at`, `share_views`, `updated_at`
2. Crear tabla `org_documents` (repositorio central) con RLS por organizacion
3. Crear tabla `document_categories` (categorias personalizadas) con RLS por organizacion
4. Crear funcion `get_shared_document(p_token)` SECURITY DEFINER que busca en las 3 tablas de documentos
5. Crear bucket de storage `org-documents` (privado) con politicas para usuarios autenticados

### Dependencia: nanoid

El hook `useShareDocument` usa `nanoid` para generar tokens. Se necesita instalar como dependencia (`nanoid`). Alternativa: usar `crypto.randomUUID()` para evitar la dependencia extra, ya que esta disponible en todos los navegadores modernos. Se usara `crypto.randomUUID()` para evitar agregar dependencias.

### Categorias base (8 tipos predefinidos)

Contrato, Propuesta, Cotizacion, Factura, Presentacion, NDA/Acuerdo, Acuerdo, Otro -- cada uno con color y estilo Tailwind.

### Orden de implementacion

1. Migracion SQL (tablas + bucket + funcion)
2. Tipos compartidos (`documents.ts`)
3. Hooks nuevos (`useOrgDocuments`, `useDocumentCategories`)
4. Componentes nuevos (6 componentes en `documents/`)
5. Actualizar componentes existentes (DocumentUploader, DocumentItem, ContactDocuments, CompanyDocuments)
6. Actualizar hooks existentes (useContactDocuments, useCompanyDocuments)
7. Paginas nuevas (Documents, SharedDocument)
8. Rutas en App.tsx + Sidebar
9. Tools de documentos en chat edge function

