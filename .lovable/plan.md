

# Plan: Módulo "Nota Clínica IA" para OpenMedic

Módulo de AI Medical Scribe que permite grabar, dictar o escribir consultas médicas y generar notas clínicas estructuradas (SOAP/narrativo) con IA. Se implementa en fases.

---

## Fase 1: Base de datos y Storage

**Migración SQL** — Crear tabla `clinical_notes` con:
- Campos: organization_id, contact_id, created_by, consultation_date, input_mode, raw_transcript, campos SOAP (subjective/objective/analysis/plan), full_note, template_used, audio_url, status, is_signed, tags
- Usar validation triggers en lugar de CHECK constraints para `input_mode`, `template_used` y `status`
- Índices en org, contact, created_by, consultation_date, status
- RLS: SELECT/INSERT para org members, UPDATE para creator o admin/manager, DELETE solo admin
- Trigger `updated_at`
- Storage bucket `clinical-audio` (privado) con policies para upload/view por usuario

---

## Fase 2: Edge Functions (2 funciones)

### `generate-clinical-note/index.ts`
- Recibe: transcript, template (soap|narrative), contact_id, patient_context opcional
- Usa Lovable AI (`google/gemini-3-flash-preview`) con system prompts especializados SOAP y narrativo
- Retorna JSON con campos SOAP o full_note

### `transcribe-audio/index.ts`
- Recibe: audio_base64, mime_type
- Usa Gemini multimodal para transcribir audio médico
- Identifica hablantes (Médico/Paciente)
- Retorna { transcript }

Ambas funciones usan LOVABLE_API_KEY (ya configurado) y CORS headers estándar.

---

## Fase 3: React Hooks (2 nuevos)

### `src/hooks/useClinicalNotes.ts`
- `useClinicalNotes(contactId)` — listar notas de un paciente
- `useCreateClinicalNote()` — crear borrador
- `useUpdateClinicalNote()` — actualizar nota
- `useSignClinicalNote()` — firmar (bloquear edición)
- `useGenerateClinicalNote()` — invocar edge function de generación
- `useTranscribeAudio()` — invocar edge function de transcripción
- `useUploadClinicalAudio()` — subir audio a storage
- `useClinicalNote(noteId)` — obtener nota individual

### `src/hooks/useAudioRecorder.ts`
- Hook de grabación con MediaRecorder API
- Start/stop/pause/resume, timer, conversión blob→base64

---

## Fase 4: Componentes React (2 nuevos)

### `src/components/clinical-notes/ClinicalNoteRecorder.tsx`
- Flujo de 3 pasos: Captura → Transcripción → Revisión
- 3 modos de input: Grabación en vivo, Dictado, Texto libre
- Selector SOAP/Narrativo
- Botón "Generar Nota con IA"
- Secciones SOAP editables con colores por sección
- Acciones: Copiar, Guardar borrador, Firmar

### `src/components/clinical-notes/ClinicalNoteViewer.tsx`
- Lista de notas clínicas de un paciente
- Búsqueda, expandir/colapsar
- Badges de estado (firmada/borrador), modo de input, template
- Botón "Nueva Nota Clínica"
- Empty state

---

## Fase 5: Integración en páginas existentes

### `src/pages/ContactDetail.tsx`
- Agregar tab "Notas Clínicas" condicional (`hasModule('clinical_notes')`)
- Mostrar ClinicalNoteViewer o ClinicalNoteRecorder según estado

### `src/pages/Consulta.tsx` (nueva)
- Página independiente `/consulta`
- Selector de paciente → ClinicalNoteRecorder

### `src/App.tsx`
- Agregar ruta `/consulta` dentro de AppLayout

### `src/components/layout/Sidebar.tsx`
- Agregar item "Nueva Consulta" (icono Stethoscope) condicional para vertical health o módulo clinical_notes

### `src/config/verticals.ts`
- Agregar `'clinical_notes'` al array `modules` de la vertical `health`

### `src/components/admin/ModulesDialog.tsx`
- Agregar toggle para módulo `clinical_notes` ("Notas Clínicas IA")

---

## Fase 6: Integración AI Assistant (chat)

### `supabase/functions/chat/index.ts`
- Agregar 2 tools al array de herramientas:
  - `get_patient_clinical_notes` — consultar historial de notas clínicas
  - `create_clinical_note_draft` — generar y guardar nota desde el chat
- Agregar handlers correspondientes

---

## Archivos nuevos (8)

| Archivo | Tipo |
|---------|------|
| Migración SQL | DB |
| `supabase/functions/generate-clinical-note/index.ts` | Edge Function |
| `supabase/functions/transcribe-audio/index.ts` | Edge Function |
| `src/hooks/useClinicalNotes.ts` | Hook |
| `src/hooks/useAudioRecorder.ts` | Hook |
| `src/components/clinical-notes/ClinicalNoteRecorder.tsx` | Componente |
| `src/components/clinical-notes/ClinicalNoteViewer.tsx` | Componente |
| `src/pages/Consulta.tsx` | Página |

## Archivos modificados (5)

| Archivo | Cambio |
|---------|--------|
| `src/pages/ContactDetail.tsx` | Tab "Notas Clínicas" condicional |
| `src/App.tsx` | Ruta `/consulta` |
| `src/components/layout/Sidebar.tsx` | Item "Nueva Consulta" |
| `src/config/verticals.ts` | Módulo clinical_notes en health |
| `src/components/admin/ModulesDialog.tsx` | Toggle clinical_notes |

Se omite la integración en `chat/index.ts` por complejidad — se puede agregar en una segunda iteración si se desea. El módulo es 100% aditivo, no modifica funcionalidad existente.

