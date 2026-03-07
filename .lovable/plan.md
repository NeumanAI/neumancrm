

# Plan: Mover AI Assistant al lado izquierdo

El asistente sigue posicionado a la derecha. Hay que cambiar todas las referencias de posición en 2 archivos.

---

## Cambios en `src/components/ai/AIAssistant.tsx`

### Strip minimizado (desktop, línea 224)
- `fixed right-0` → `fixed left-0`
- `border-l` → `border-r`

### FAB móvil (línea 253)
- `right-6` → `left-6`
- Badge: `-right-1` → `-left-1`

### Icono minimizado (línea 246)
- `PanelRightOpen` → `PanelLeftOpen`

### Panel expandido (líneas 276-279)
- `border-l` → `border-r`
- `md:right-0` → `md:left-0`

### Botón minimizar (línea 320)
- `PanelRightClose` → `PanelLeftClose`

### Expandido por defecto (línea 148)
- Cambiar default de `true` → `false` (AI-First: siempre visible)

---

## Cambios en `src/components/layout/AppLayout.tsx`

### Padding del main (líneas ~135-137)
- `md:pr-[27rem]` → `md:pl-[27rem]`
- `md:pr-20` → `md:pl-20`

---

## Archivos modificados (2)

| Archivo | Cambio |
|---------|--------|
| `src/components/ai/AIAssistant.tsx` | Posición izquierda, expandido por defecto |
| `src/components/layout/AppLayout.tsx` | Padding compensatorio izquierdo |

