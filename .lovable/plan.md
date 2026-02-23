

# Plan: Agregar AI Tools para Modulos Inmobiliario + Tipos de Contacto + Documentos

Agregar 11 herramientas nuevas al AI Assistant (edge function `chat`) para que pueda operar las funcionalidades inmobiliarias, tipos de contacto y documentos desde el chat.

---

## Archivo unico a modificar

`supabase/functions/chat/index.ts`

---

## Cambio 1: Agregar definiciones de tools nuevos

Agregar al array `tools` (antes del cierre `]` en linea ~1452) las siguientes 9 definiciones nuevas. Se omiten `convert_contact_type` y `list_contact_documents` porque ya existen:

1. **update_project_stage** -- Cambia etapa de proyecto inmobiliario
2. **get_project_inventory_summary** -- Resumen inventario por proyecto
3. **search_units** -- Busca unidades por nomenclatura, tipo, piso, precio, estado
4. **get_unit_detail** -- Detalle completo de una unidad
5. **update_unit_status** -- Cambia estado comercial y asigna comprador
6. **get_contacts_by_type** -- Lista contactos por tipo (prospecto/comprador/empresa/inactivo)
7. **get_contact_full_profile** -- Perfil completo: unidades, documentos, tipo
8. **check_document_completeness** -- Verifica carpeta documental basica
9. **get_real_estate_master_report** -- Reporte ejecutivo de todo el negocio inmobiliario

---

## Cambio 2: Agregar handlers en executeTool

Antes del `default:` case (linea ~3409), agregar los 9 handlers nuevos siguiendo la logica del documento. Ajustes importantes vs. el documento original:

- **portfolio_contracts / portfolio_payment_schedule no existen** en la base de datos. Se omitiran las queries a esas tablas en `get_unit_detail`, `get_contact_full_profile` y `get_real_estate_master_report`. En su lugar, esos campos retornaran `null` o mensajes de "no disponible".
- Los handlers usaran `orgId` (obtenido via `getOrgId()`) para filtrar por organizacion, no `user_id`, ya que las tablas `real_estate_unit_types` y `real_estate_projects` usan RLS basado en organizacion.
- `contact_type_history` usa columnas `previous_type` y `new_type` (no `from_type`/`to_type` como dice el documento). Se ajustara el handler de `update_unit_status`.

---

## Cambio 3: Actualizar system prompt

En `buildSystemPrompt()`, agregar seccion de capacidades inmobiliarias completas al final del prompt, explicando:
- Proyectos: cambiar etapas, consultar inventario
- Unidades individuales: buscar por nomenclatura, tipo, piso, precio, estado
- Compradores vs Prospectos
- Documentacion: verificar carpeta completa
- Reporte maestro: resumen ejecutivo en una llamada
- Actualizar contador de herramientas de 80 a 91

---

## Cambio 4: Actualizar list_contact_documents existente

El handler existente (`listContactDocumentsTool`) usa parametros `contact_email`/`contact_name`. El nuevo tool en el documento usa `contact_name_or_email` y `document_type`. Se reemplazara la definicion del tool existente para soportar ambos parametros y agregar filtro por tipo de documento inmobiliario.

---

## Tabla de cambios concretos

| Ubicacion en archivo | Que se hace |
|---------------------|-------------|
| Lineas ~1435-1452 (antes de `];`) | Agregar 9 definiciones de tools nuevos |
| Linea ~1394 (list_contact_documents def) | Actualizar parametros para incluir document_type |
| Lineas ~1533-1570 (system prompt) | Agregar seccion inmobiliaria + actualizar conteo |
| Lineas ~3407-3409 (antes de default) | Agregar 9 case handlers nuevos |

---

## Tablas que NO existen y se omiten

- `portfolio_contracts` -- Se omite en get_unit_detail, get_contact_full_profile, get_real_estate_master_report
- `portfolio_payment_schedule` -- Se omite en get_real_estate_master_report

Los handlers retornaran `null` para esos campos en lugar de fallar.

