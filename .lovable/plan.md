

# Fix: Error en Pipeline por violacion de reglas de Hooks

## Problema

En `src/pages/Pipeline.tsx`, el hook `useMemo` (linea ~280) se llama DESPUES de un `return` condicional por `isLoading` (linea ~268). Esto viola las reglas de React Hooks que exigen que todos los hooks se llamen siempre en el mismo orden, sin importar condiciones.

```text
Pipeline component
  ├── useState, useSensor, useEffect  ← OK
  ├── if (isLoading) return <Loader/>  ← EARLY RETURN
  └── useMemo(openOpportunities)       ← ERROR: hook despues de return condicional
```

## Solucion

### Archivo: `src/pages/Pipeline.tsx`

Mover el `useMemo` de `openOpportunities` ANTES del bloque `if (isLoading)`. Tambien mover las variables derivadas (`totalValue`, `advisors`, `formatCurrency`) que no dependen de hooks para que esten antes del return condicional.

Cambios concretos:
1. Mover `const advisors = ...` antes del `if (isLoading)`
2. Mover `const openOpportunities = useMemo(...)` antes del `if (isLoading)`
3. Mover `const totalValue = ...` y `formatCurrency` antes del `if (isLoading)`

Esto garantiza que todos los hooks se ejecuten en cada render, independientemente del estado de carga.

