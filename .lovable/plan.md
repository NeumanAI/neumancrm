# Plan: Expandir Tools del Chat IA (Parte C)

## ✅ COMPLETADO

### Cambios de Base de Datos
- ✅ Columna `whatsapp_number` agregada a tabla `contacts`
- ✅ Tabla `timeline_entries` creada con RLS y Realtime habilitados
- ✅ Índices optimizados para búsquedas eficientes

### Tools del Chat (15 total)
| Tool | Estado | Descripción |
|------|--------|-------------|
| `create_contact` | ✅ Mejorado | Ahora soporta `whatsapp_number` y `company_name` |
| `update_contact` | ✅ Nuevo | Actualiza contactos existentes por email |
| `search_contacts` | ✅ Mejorado | Filtros avanzados: empresa, WhatsApp |
| `create_company` | ✅ Existente | Sin cambios |
| `search_companies` | ✅ Existente | Sin cambios |
| `create_task` | ✅ Existente | Sin cambios |
| `schedule_meeting` | ✅ Existente | Sin cambios |
| `create_opportunity` | ✅ Existente | Sin cambios |
| `update_opportunity_stage` | ✅ Existente | Sin cambios |
| `get_pipeline_summary` | ✅ Mejorado | Ahora incluye deals en riesgo y valor ponderado |
| `analyze_deal_health` | ✅ Nuevo | Score de salud 0-100 con advertencias |
| `search_timeline` | ✅ Nuevo | Busca en historial de interacciones |
| `find_promises` | ✅ Nuevo | Encuentra action items pendientes |
| `get_next_best_action` | ✅ Nuevo | Sugiere siguiente mejor acción |
| `add_note` | ✅ Existente | Sin cambios |

### System Prompt
- ✅ Actualizado con descripción de nuevas capacidades
- ✅ Documentación de todos los 15 tools

### Tipos TypeScript
- ✅ `Contact` actualizado con `whatsapp_number`
- ✅ Fix de tipo para `companies` (Pick<Company, ...>)

## Próximos Pasos Sugeridos
1. Probar los nuevos tools en el chat
2. Poblar `timeline_entries` con datos de ejemplo
3. Configurar integración Gmail para auto-captura
