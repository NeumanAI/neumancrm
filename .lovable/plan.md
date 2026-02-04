
# Plan: Vista de Detalle de Empresa con Timeline, Contactos, Deals y Documentos

## Objetivo

Implementar para Empresas las mismas funcionalidades que ya existen para Contactos:
- Vista de detalle completa con sidebar
- Timeline de interacciones
- Contactos asociados a la empresa
- Oportunidades/Deals asociados
- Gestión de documentos

---

## Arquitectura de la Solucion

```text
┌─────────────────────────────────────────────────────────────────┐
│                    /companies/:companyId                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐   ┌─────────────────────────────────┐  │
│  │   SIDEBAR IZQUIERDO │   │         CONTENIDO PRINCIPAL     │  │
│  │                     │   │                                 │  │
│  │  Logo + Nombre      │   │  Tabs:                          │  │
│  │  Industria          │   │  ┌────────┬──────────┬────────┐ │  │
│  │  ────────────────   │   │  │Timeline│Contactos │Deals   │ │  │
│  │  Website            │   │  ├────────┴──────────┴────────┤ │  │
│  │  Telefono           │   │  │         Documentos          │ │  │
│  │  Ubicacion          │   │  └─────────────────────────────┘ │  │
│  │  LinkedIn/Twitter   │   │                                 │  │
│  │  ────────────────   │   │  (Contenido del tab activo)     │  │
│  │  Descripcion        │   │                                 │  │
│  │  ────────────────   │   │                                 │  │
│  │  Acciones:          │   │                                 │  │
│  │  [Editar] [Web]     │   │                                 │  │
│  │  [Llamar]           │   │                                 │  │
│  │                     │   │                                 │  │
│  └─────────────────────┘   └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### Nueva Tabla: `company_documents`

Crear tabla identica a `contact_documents` pero para empresas:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | uuid | Clave primaria |
| `user_id` | uuid | FK al usuario propietario |
| `company_id` | uuid | FK a la empresa asociada |
| `file_name` | text | Nombre original del archivo |
| `file_path` | text | Ruta en storage bucket |
| `file_size` | integer | Tamano en bytes |
| `mime_type` | text | Tipo MIME del archivo |
| `document_type` | text | Categoria: contrato, propuesta, acuerdo, otro |
| `description` | text | Descripcion opcional |
| `created_at` | timestamp | Fecha de subida |

### Storage

Reutilizar el bucket existente `contact-documents` con estructura extendida:
- Contactos: `{user_id}/{contact_id}/{file_name}`
- Empresas: `{user_id}/company_{company_id}/{file_name}`

---

## Archivos a Crear

| Archivo | Proposito |
|---------|-----------|
| `src/pages/CompanyDetail.tsx` | Pagina principal de detalle de empresa |
| `src/components/companies/CompanySidebar.tsx` | Panel lateral con info de la empresa |
| `src/components/companies/CompanyTimeline.tsx` | Timeline de interacciones de la empresa |
| `src/components/companies/CompanyContacts.tsx` | Contactos asociados a la empresa |
| `src/components/companies/CompanyDeals.tsx` | Oportunidades asociadas a la empresa |
| `src/components/companies/CompanyDocuments.tsx` | Documentos de la empresa |
| `src/hooks/useCompanyDocuments.ts` | Hook para CRUD de documentos de empresa |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar ruta `/companies/:companyId` |
| `src/pages/Companies.tsx` | Hacer click en fila navegue al detalle |
| `src/types/crm.ts` | Agregar tipo `CompanyDocument` |

---

## Implementacion Detallada

### 1. Tipo CompanyDocument

Agregar a `src/types/crm.ts`:

```typescript
export interface CompanyDocument {
  id: string;
  user_id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'contract' | 'proposal' | 'agreement' | 'invoice' | 'other';
  description?: string;
  created_at: string;
}
```

### 2. Pagina CompanyDetail

Layout similar a ContactDetail:
- Boton volver a lista de empresas
- Grid de 2 columnas: sidebar (1/3) y contenido (2/3)
- 4 tabs: Timeline, Contactos, Deals, Documentos

### 3. CompanySidebar

Mostrar informacion de la empresa:
- Logo/inicial con nombre
- Industria como badge
- Website, telefono, ubicacion
- Redes sociales (LinkedIn, Twitter)
- Descripcion
- Acciones rapidas: Editar, Abrir web, Llamar

### 4. CompanyTimeline

Reutilizar la logica del hook `useTimelineEntries` con `companyId`:
- Mismos filtros por tipo de entrada
- Misma funcionalidad de agregar notas
- Mostrar interacciones asociadas a la empresa

### 5. CompanyContacts

Mostrar contactos que pertenecen a esta empresa:
- Lista de contactos con avatar, nombre, cargo
- Click navega al detalle del contacto
- Mostrar total de contactos

### 6. CompanyDeals

Oportunidades asociadas a la empresa:
- Resumen: total deals, ganados, valor total
- Lista de deals con estado, etapa, valor
- Similar a ContactDeals pero filtrando por company_id

### 7. CompanyDocuments

Reutilizar componentes `DocumentItem` y `DocumentUploader`:
- Hook separado `useCompanyDocuments`
- Misma logica de filtros y upload
- Bucket compartido con estructura diferenciada

### 8. Navegacion desde lista

Modificar Companies.tsx:
- Click en fila navega a `/companies/:id`
- Mantener botones de editar/eliminar en acciones

---

## Migracion SQL

```sql
-- Crear tabla company_documents
CREATE TABLE public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios solo ven sus documentos
CREATE POLICY "Users see own company documents"
  ON public.company_documents
  FOR ALL
  USING (auth.uid() = user_id);
```

---

## Secuencia de Implementacion

1. Crear migracion SQL para tabla `company_documents`
2. Agregar tipo `CompanyDocument` a `src/types/crm.ts`
3. Crear hook `useCompanyDocuments.ts`
4. Crear componente `CompanySidebar.tsx`
5. Crear componente `CompanyTimeline.tsx`
6. Crear componente `CompanyContacts.tsx`
7. Crear componente `CompanyDeals.tsx`
8. Crear componente `CompanyDocuments.tsx`
9. Crear pagina `CompanyDetail.tsx`
10. Modificar `App.tsx` para agregar ruta
11. Modificar `Companies.tsx` para navegacion

---

## Componentes Reutilizados

Los siguientes componentes existentes se reutilizaran:

- `DocumentItem.tsx` - Ya es generico, funciona con cualquier documento
- `DocumentUploader.tsx` - Ya es generico, funciona para subir cualquier archivo
- `TimelineEntryItem.tsx` - Ya renderiza cualquier entrada de timeline
- `useTimelineEntries.ts` - Ya soporta `companyId` como parametro

---

## Consideraciones Tecnicas

- **RLS**: La tabla `company_documents` tendra RLS similar a `contact_documents`
- **Storage**: Reutilizar el bucket `contact-documents` con prefijo diferente para empresas
- **Timeline**: El hook existente ya soporta `companyId`, solo hay que usarlo
- **Navegacion**: Click en fila de tabla navega al detalle, botones de accion se mantienen
