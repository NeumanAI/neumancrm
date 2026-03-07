

# Plan: Mover AI Assistant de vuelta a la derecha

El asistente quedó posicionado a la izquierda (`left-0`) tras el último cambio. Hay que revertirlo a la derecha.

## Cambios en `src/components/ai/AIAssistant.tsx`

| Línea | Actual | Correcto |
|-------|--------|----------|
| 224 | `fixed left-0`, `border-r` | `fixed right-0`, `border-l` |
| 246 | `PanelLeftOpen` | `PanelRightOpen` |
| 253 | `left-6` | `right-6` |
| 257 | `-left-1` | `-right-1` |
| 277 | `border-r` | `border-l` |
| 279 | `md:left-0` | `md:right-0` |
| 320 | `PanelLeftClose` | `PanelRightClose` |
| 148 | default `false` | default `true` (minimizado por defecto) |

## Cambios en `src/components/layout/AppLayout.tsx`

| Línea | Actual | Correcto |
|-------|--------|----------|
| 135 | `md:pl-20` / `md:pl-[27rem]` | `md:pr-20` / `md:pr-[27rem]` |

## Archivos (2)
- `src/components/ai/AIAssistant.tsx`
- `src/components/layout/AppLayout.tsx`

