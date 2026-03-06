

# Plan: Eliminar campañas

## Cambios

### 1. `src/hooks/useTwilio.ts`
Agregar mutation `deleteCampaign` que elimine primero los `broadcast_messages` asociados y luego la campaña de `broadcast_campaigns`.

### 2. `src/components/messaging/BroadcastTab.tsx`
- Importar `Trash2` de lucide-react y `AlertDialog` components
- Agregar botón de eliminar (icono papelera) en cada fila de la tabla, al lado del botón "Lanzar"
- Diálogo de confirmación antes de eliminar
- Conectar con la mutation `deleteCampaign`

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `src/hooks/useTwilio.ts` | Agregar mutation `deleteCampaign` |
| `src/components/messaging/BroadcastTab.tsx` | Botón eliminar + confirmación |

