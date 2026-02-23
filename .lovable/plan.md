

# Plan: Mejoras al Modulo de Proyectos Inmobiliarios (5 Prompts consolidados)

Este plan consolida los 5 prompts del documento en una sola ejecucion. A continuacion se detalla que se hara, en que orden, y que archivos se modifican o crean.

---

## Estado actual de la base de datos

Antes de empezar, esto es lo que ya existe y lo que falta:

| Elemento | Estado |
|----------|--------|
| `real_estate_projects.status` (default 'planning') | Ya existe |
| `real_estate_projects.cover_image_url` | Ya existe |
| Columnas nuevas en `real_estate_unit_types` (property_type, nomenclature, floor_number, etc.) | **NO existen** - hay que crearlas |
| Tabla `contact_documents` | Ya existe con esquema diferente al propuesto |
| Storage bucket `contact-documents` | Ya existe |
| Tab "Documentos" en ContactDetail | Ya existe (usa `ContactDocuments` existente) |

---

## Fase 1: Migracion SQL (Prompts 1 y 2)

**Migracion unica** que agrega los campos nuevos a `real_estate_unit_types`:

- `property_type` TEXT con CHECK constraint (APTO, CASA, LOCAL COMERCIAL, BURBUJA, CUARTO UTIL, PARQUEADERO)
- `nomenclature` TEXT
- `floor_number` INTEGER
- `typology` TEXT
- `commercial_status` TEXT NOT NULL DEFAULT 'Disponible' con CHECK
- `buyer_contact_id` UUID referencia a contacts
- `separation_date` DATE
- `sale_date` DATE
- `separation_value` NUMERIC
- `sale_balance` NUMERIC
- `organization_id` UUID (necesario para los queries del hook)
- Indices para nomenclature, commercial_status, buyer_contact_id
- Indice unico para (project_id, nomenclature) donde nomenclature no es null

**Nota:** No se necesita SQL para Prompt 1 ya que `status` y `cover_image_url` ya existen en `real_estate_projects`. Tampoco para Prompt 5 ya que `contact_documents` y el bucket ya existen.

---

## Fase 2: Prompt 1 - Etapa editable + Imagen del proyecto

### Archivo: `src/components/realestate/CreateRealEstateProjectDialog.tsx`
- Agregar campo `status` como Select obligatorio con las 6 etapas (planning, pre_sale, construction, delivery, completed, cancelled)
- Valor inicial vacio para forzar seleccion
- Agregar campo `cover_image_url` con input de URL y preview de imagen
- Deshabilitar boton si no hay nombre o status seleccionado

### Archivo: `src/pages/RealEstateProjects.tsx`
- Agregar etapas faltantes a `statusLabels` y `statusColors` (pre_sale, cancelled)
- Mejorar ProjectCard: mostrar fallback "Sin etapa" si status no reconocido
- Mostrar placeholder con icono Building2 cuando no hay imagen

### Archivo: `src/pages/RealEstateProjectDetail.tsx`
- Reemplazar badge de status por Select editable inline (cambiar etapa en el detalle)
- Agregar seccion de imagen editable en tab Resumen (con boton Cambiar/Agregar)
- Importar `useRealEstateProjects` para acceder a `updateProject`

---

## Fase 3: Prompts 2+3 - Hook y UI de unidades mejoradas

### Archivo: `src/hooks/useRealEstateUnitTypes.ts`
- Ampliar interfaz `RealEstateUnitType` con todos los campos nuevos
- Actualizar query para hacer JOIN con `contacts` (buyer_contact)
- Ordenar por floor_number, nomenclature, sort_order
- Exportar constantes: `PROPERTY_TYPE_OPTIONS`, `COMMERCIAL_STATUS_OPTIONS`, `COMMERCIAL_STATUS_COLORS`

### Archivo: `src/pages/RealEstateProjectDetail.tsx`
- Reemplazar tab "Unidades" completo: de cards a tabla con columnas (Tipo, Nomenclatura, Piso, Tipologia, Area, Precio, Estado, Comprador)
- Agregar filtros rapidos por estado comercial (Todas/Disponible/Separado/Vendido)
- Botones de editar y eliminar por fila
- Columna Comprador clickeable que navega al contacto
- Actualizar dialog de crear/editar unidad con todos los campos nuevos
- Crear componente `BuyerContactSearch` para busqueda typeahead de contactos
- Seccion condicional de datos de comprador cuando estado es Separado o Vendido

### Dependencia nueva: `use-debounce`
- Se usara para el debounce en la busqueda de contactos

---

## Fase 4: Prompt 4 - Importacion masiva desde Excel

### Archivo nuevo: `src/components/realestate/ImportUnitsDialog.tsx`
- Dialog con 4 pasos: Upload, Preview, Importing, Done
- Dropzone para arrastrar archivos .xlsx/.xls
- Boton para descargar plantilla Excel pre-llenada
- Parsing y validacion de filas (tipo valido, nomenclatura requerida, deteccion de duplicados)
- Preview con tabla de filas validas/errores/duplicadas
- Importacion con barra de progreso
- Resumen final con conteo de exitos y errores

### Archivo: `src/pages/RealEstateProjectDetail.tsx`
- Agregar estado `importUnitsOpen` y boton "Importar Excel" en tab Unidades
- Renderizar `ImportUnitsDialog`

---

## Fase 5: Prompt 5 - Documentos del comprador

La tabla `contact_documents` y el tab "Documentos" en `ContactDetail.tsx` ya existen. Sin embargo, el esquema actual difiere del propuesto (no tiene `document_type` con los valores inmobiliarios, ni `project_id`, ni `unit_id`).

### Opcion elegida: Adaptar lo existente
- Verificar si `contact_documents` ya tiene los campos necesarios (`document_type` con CHECK, `project_id`, `unit_id`, `title`, `file_url`)
- Si faltan columnas, agregarlas via migracion (ADD COLUMN IF NOT EXISTS)
- Actualizar el componente `ContactDocuments` existente para soportar los tipos de documento inmobiliarios (promesa, hoja_negocio, cedula, certificado, soporte_pago, contrato, poder, otro)
- Agregar agrupacion por tipo y mejoras visuales

### Archivo: `src/hooks/useContactDocuments.ts`
- Actualizar interfaz y agregar constantes de tipos de documento con labels y colores

### Archivo: `src/components/contacts/ContactDocuments.tsx`
- Mejorar UI con agrupacion por tipo, iconos por tipo de archivo, y dialog de carga mejorado

---

## Resumen de archivos modificados/creados

| Archivo | Accion |
|---------|--------|
| Migracion SQL | Crear (columnas unit_types + columnas contact_documents) |
| `src/components/realestate/CreateRealEstateProjectDialog.tsx` | Modificar |
| `src/pages/RealEstateProjects.tsx` | Modificar |
| `src/pages/RealEstateProjectDetail.tsx` | Modificar (cambios mayores) |
| `src/hooks/useRealEstateUnitTypes.ts` | Modificar |
| `src/components/realestate/ImportUnitsDialog.tsx` | Crear |
| `src/hooks/useContactDocuments.ts` | Modificar |
| `src/components/contacts/ContactDocuments.tsx` | Modificar |

## Dependencias
- `use-debounce` (nueva, para BuyerContactSearch)
- `xlsx` y `react-dropzone` ya estan instalados

