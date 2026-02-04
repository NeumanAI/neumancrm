

# Plan: Vista de Detalle de Contacto con Timeline

## Objetivo

Implementar una vista de detalle completa para cada contacto que muestre:
- Informacion completa del contacto
- Historial de interacciones (timeline_entries)
- Oportunidades asociadas
- Actividades pendientes
- Acciones rapidas

---

## Arquitectura de la Solucion

```text
┌─────────────────────────────────────────────────────────────────┐
│                    /contacts/:contactId                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐   ┌─────────────────────────────────┐  │
│  │   SIDEBAR IZQUIERDO │   │         CONTENIDO PRINCIPAL     │  │
│  │                     │   │                                 │  │
│  │  Avatar + Nombre    │   │  Tabs:                          │  │
│  │  Cargo + Empresa    │   │  ┌───────┬──────────┬─────────┐ │  │
│  │  ────────────────   │   │  │Timeline│Actividades│Deals   │ │  │
│  │  Email              │   │  └───────┴──────────┴─────────┘ │  │
│  │  Telefono           │   │                                 │  │
│  │  WhatsApp           │   │  Timeline Tab:                  │  │
│  │  LinkedIn           │   │  ┌─────────────────────────┐    │  │
│  │  ────────────────   │   │  │ Email - hace 2h         │    │  │
│  │  Notas              │   │  │ Resumen IA...           │    │  │
│  │  ────────────────   │   │  ├─────────────────────────┤    │  │
│  │  Acciones:          │   │  │ Meeting - hace 1d       │    │  │
│  │  [Editar] [Llamar]  │   │  │ Discutieron precios...  │    │  │
│  │  [Email] [Chat IA]  │   │  └─────────────────────────┘    │  │
│  │                     │   │                                 │  │
│  └─────────────────────┘   └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear

| Archivo | Proposito |
|---------|-----------|
| `src/pages/ContactDetail.tsx` | Pagina principal de detalle |
| `src/components/contacts/ContactSidebar.tsx` | Panel lateral con info del contacto |
| `src/components/contacts/ContactTimeline.tsx` | Componente de timeline visual |
| `src/components/contacts/TimelineEntry.tsx` | Item individual del timeline |
| `src/components/contacts/ContactActivities.tsx` | Tab de actividades del contacto |
| `src/components/contacts/ContactDeals.tsx` | Tab de oportunidades asociadas |
| `src/hooks/useTimelineEntries.ts` | Hook para gestionar timeline_entries |
| `src/types/crm.ts` | Agregar tipo TimelineEntry |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar ruta `/contacts/:contactId` |
| `src/pages/Contacts.tsx` | Hacer click en fila navegue al detalle |
| `src/hooks/useContacts.ts` | Agregar funcion para obtener contacto individual |

---

## Implementacion Detallada

### 1. Tipo TimelineEntry

Agregar al archivo `src/types/crm.ts`:

```typescript
export interface TimelineEntry {
  id: string;
  user_id: string;
  contact_id?: string;
  company_id?: string;
  opportunity_id?: string;
  entry_type: 'email' | 'call' | 'meeting' | 'note' | 'whatsapp' | 'task';
  source?: string;
  subject?: string;
  body?: string;
  summary?: string;
  participants?: { name: string; email?: string }[];
  action_items?: { text: string; completed: boolean }[];
  metadata?: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}
```

### 2. Hook useTimelineEntries

Nuevo hook para gestionar entradas de timeline:

- Query: Obtener timeline por contact_id
- Mutation: Crear nueva entrada manual (nota)
- Filtros: Por tipo de entrada, rango de fechas

### 3. Pagina ContactDetail

Layout con dos columnas:
- **Columna izquierda (1/3)**: Sidebar con informacion del contacto
- **Columna derecha (2/3)**: Tabs con Timeline, Actividades, Deals

Tabs implementados:
- **Timeline**: Historial de interacciones ordenado por fecha
- **Actividades**: Tareas/llamadas/reuniones asociadas al contacto
- **Deals**: Oportunidades donde el contacto esta involucrado

### 4. ContactSidebar

Componente que muestra:
- Avatar con iniciales
- Nombre completo
- Cargo y empresa (con link a empresa)
- Datos de contacto (email, telefono, WhatsApp, LinkedIn)
- Notas del contacto
- Botones de accion rapida:
  - Editar contacto (abre dialog)
  - Enviar email (mailto)
  - Llamar (tel:)
  - Agregar nota al timeline

### 5. ContactTimeline

Vista vertical del historial:
- Linea de tiempo visual con iconos por tipo
- Cada entrada muestra:
  - Icono segun tipo (email, call, meeting, etc)
  - Fecha/hora relativa
  - Subject o titulo
  - Resumen generado por IA (si existe)
  - Expandible para ver body completo
- Filtros por tipo de entrada
- Boton para agregar nota manual

### 6. TimelineEntry

Componente individual con:
- Icono segun entry_type
- Timestamp con fecha relativa
- Titulo/subject
- Preview del contenido
- Badge de source (Gmail, WhatsApp, Manual)
- Expansion para ver detalles completos
- Action items si existen

### 7. Navegacion desde lista

Modificar `Contacts.tsx`:
- Click en fila navega a `/contacts/:id`
- Mantener botones de editar/eliminar en acciones
- Agregar indicador visual de que la fila es clickeable

---

## Flujo de Usuario

1. Usuario navega a `/contacts`
2. Ve lista de contactos en tabla
3. Click en cualquier contacto
4. Navega a `/contacts/:contactId`
5. Ve informacion completa del contacto
6. Puede navegar entre tabs: Timeline, Actividades, Deals
7. Puede agregar notas manuales al timeline
8. Puede editar el contacto desde el sidebar
9. Puede navegar a empresa asociada
10. Boton "Volver" regresa a la lista

---

## Iconos por Tipo de Timeline

| Tipo | Icono | Color |
|------|-------|-------|
| email | Mail | Blue |
| call | Phone | Green |
| meeting | Calendar | Purple |
| note | StickyNote | Yellow |
| whatsapp | MessageCircle | Green |
| task | CheckSquare | Gray |

---

## Secuencia de Implementacion

1. Agregar tipo TimelineEntry a `src/types/crm.ts`
2. Crear hook `useTimelineEntries.ts`
3. Crear componente `TimelineEntry.tsx`
4. Crear componente `ContactTimeline.tsx`
5. Crear componente `ContactActivities.tsx`
6. Crear componente `ContactDeals.tsx`
7. Crear componente `ContactSidebar.tsx`
8. Crear pagina `ContactDetail.tsx`
9. Modificar `App.tsx` para agregar ruta
10. Modificar `Contacts.tsx` para navegacion

---

## Consideraciones Tecnicas

- **RLS**: timeline_entries ya tiene RLS configurado
- **Performance**: Paginacion del timeline (limite 50 por pagina)
- **Empty States**: Mostrar estados vacios elegantes cuando no hay datos
- **Loading States**: Skeletons mientras cargan los datos
- **Responsive**: Layout adaptable a mobile (sidebar colapsa a tabs)

