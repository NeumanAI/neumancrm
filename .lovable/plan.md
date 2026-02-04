

# Plan: Documentos de Contacto (Contratos, Acuerdos, etc.)

## Objetivo

Agregar la capacidad de cargar, visualizar y gestionar documentos asociados a cada contacto, como contratos firmados, acuerdos, propuestas, etc.

---

## Arquitectura de la Solucion

```text
┌─────────────────────────────────────────────────────────────────┐
│                    /contacts/:contactId                          │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Timeline] [Actividades] [Deals] [Documentos]            │
│                                          ▲ NUEVO                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    TAB DOCUMENTOS                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  [+] Subir documento     [Filtrar por tipo ▼]       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌──────┐  contrato_firmado.pdf                           │  │
│  │  │ PDF  │  Contrato • 2.3 MB • hace 3 dias                │  │
│  │  └──────┘  [Descargar] [Eliminar]                         │  │
│  │                                                            │  │
│  │  ┌──────┐  propuesta_comercial.docx                       │  │
│  │  │ DOCX │  Propuesta • 1.1 MB • hace 1 semana             │  │
│  │  └──────┘  [Descargar] [Eliminar]                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### Nueva Tabla: `contact_documents`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | uuid | Clave primaria |
| `user_id` | uuid | FK al usuario propietario |
| `contact_id` | uuid | FK al contacto asociado |
| `file_name` | text | Nombre original del archivo |
| `file_path` | text | Ruta en storage bucket |
| `file_size` | integer | Tamano en bytes |
| `mime_type` | text | Tipo MIME del archivo |
| `document_type` | text | Categoria: contrato, propuesta, acuerdo, otro |
| `description` | text | Descripcion opcional |
| `created_at` | timestamp | Fecha de subida |

### Nuevo Storage Bucket: `contact-documents`

- Bucket privado (solo usuarios autenticados)
- Estructura: `{user_id}/{contact_id}/{file_name}`
- Politicas RLS para que cada usuario solo vea sus documentos

---

## Archivos a Crear

| Archivo | Proposito |
|---------|-----------|
| `src/components/contacts/ContactDocuments.tsx` | Tab principal de documentos |
| `src/components/contacts/DocumentUploader.tsx` | Componente de upload con dropzone |
| `src/components/contacts/DocumentItem.tsx` | Item individual de documento |
| `src/hooks/useContactDocuments.ts` | Hook para CRUD de documentos |
| `src/types/crm.ts` | Agregar tipo ContactDocument |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/ContactDetail.tsx` | Agregar tab "Documentos" |

---

## Implementacion Detallada

### 1. Tipo ContactDocument

Agregar al archivo `src/types/crm.ts`:

```typescript
export interface ContactDocument {
  id: string;
  user_id: string;
  contact_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'contract' | 'proposal' | 'agreement' | 'invoice' | 'other';
  description?: string;
  created_at: string;
}
```

### 2. Hook useContactDocuments

Funcionalidades del hook:
- Query: Obtener documentos por contact_id
- Mutation: Subir documento (archivo + metadata)
- Mutation: Eliminar documento (storage + registro DB)
- Funcion auxiliar: Generar URL firmada para descarga

### 3. Componente DocumentUploader

Caracteristicas:
- Dropzone usando `react-dropzone` (ya instalado)
- Tipos permitidos: PDF, Word, Excel, imagenes
- Limite: 10 MB por archivo
- Selector de tipo de documento (contrato, propuesta, etc)
- Campo opcional de descripcion
- Preview antes de subir
- Barra de progreso durante upload

### 4. Componente DocumentItem

Muestra cada documento con:
- Icono segun tipo de archivo (PDF, DOCX, XLSX, imagen)
- Nombre del archivo
- Badge de categoria (Contrato, Propuesta, etc)
- Tamano formateado (KB/MB)
- Fecha relativa de subida
- Boton descargar (genera URL firmada)
- Boton eliminar con confirmacion

### 5. Componente ContactDocuments

Tab principal que incluye:
- Header con boton "Subir documento"
- Filtro por tipo de documento
- Lista de documentos ordenados por fecha
- Empty state cuando no hay documentos
- Dialog para subir nuevo documento

### 6. Modificar ContactDetail

Agregar cuarto tab "Documentos":
- Nuevo TabsTrigger con icono FileText
- Nuevo TabsContent con ContactDocuments

---

## Migracion SQL

```sql
-- Crear tabla contact_documents
CREATE TABLE public.contact_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios solo ven sus documentos
CREATE POLICY "Users see own contact documents"
  ON public.contact_documents
  FOR ALL
  USING (auth.uid() = user_id);

-- Crear bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-documents', 'contact-documents', false);

-- Politicas de storage
CREATE POLICY "Users can upload contact documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contact-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own contact documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contact-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own contact documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contact-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Flujo de Usuario

1. Usuario navega a `/contacts/:contactId`
2. Hace click en tab "Documentos"
3. Ve lista de documentos existentes (o empty state)
4. Click en "Subir documento"
5. Arrastra archivo o hace click para seleccionar
6. Selecciona tipo de documento
7. Opcionalmente agrega descripcion
8. Click en "Subir"
9. Archivo se sube a storage
10. Registro se crea en base de datos
11. Lista se actualiza automaticamente
12. Puede descargar o eliminar documentos

---

## Iconos por Tipo de Archivo

| Extension | Icono | Color |
|-----------|-------|-------|
| .pdf | FileText | Red |
| .doc/.docx | FileText | Blue |
| .xls/.xlsx | FileSpreadsheet | Green |
| .jpg/.png | Image | Purple |
| otros | File | Gray |

---

## Tipos de Documento

| Valor | Etiqueta | Color Badge |
|-------|----------|-------------|
| contract | Contrato | Blue |
| proposal | Propuesta | Purple |
| agreement | Acuerdo | Green |
| invoice | Factura | Orange |
| other | Otro | Gray |

---

## Secuencia de Implementacion

1. Crear migracion SQL (tabla + bucket + RLS)
2. Agregar tipo ContactDocument a types/crm.ts
3. Crear hook useContactDocuments.ts
4. Crear componente DocumentItem.tsx
5. Crear componente DocumentUploader.tsx
6. Crear componente ContactDocuments.tsx
7. Modificar ContactDetail.tsx para agregar tab

---

## Consideraciones Tecnicas

- **Limite de archivo**: 10 MB maximo
- **Tipos permitidos**: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
- **Seguridad**: URLs firmadas con expiracion de 1 hora
- **Performance**: Paginacion si hay muchos documentos
- **UX**: Toast de confirmacion al subir/eliminar

