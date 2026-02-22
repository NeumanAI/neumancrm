

# Integrar Plataforma IA en el menu lateral como una sola unidad

## Problema actual
La seccion "Plataforma IA" esta separada visualmente del menu principal con un `border-t` y es un bloque `flex-shrink-0` fijo, lo que la hace parecer un componente aparte del sidebar.

## Solucion
Mover los items de `platformAINavItems` dentro del `<nav>` principal, justo despues de los items de admin/reseller. Se agrega un label "Plataforma IA" como separador visual sutil (sin bordes), y los items usan el mismo estilo de navegacion que el resto del menu pero conservando el color violeta.

## Cambio en un solo archivo

**`src/components/layout/Sidebar.tsx`**

1. Eliminar el bloque separado de "Plataforma IA" (lineas 231-266) -- el `div` con `border-t` y `flex-shrink-0`
2. Dentro del `<nav>` existente (linea 181-229), despues del `.map(allNavItems)`, agregar:
   - Un label "Plataforma IA" con texto violeta (solo visible cuando no esta colapsado)
   - Los 3 items de `platformAINavItems` con su estilo violeta, usando la misma estructura de `NavLink` + `AnimatePresence`
3. Todo queda dentro del mismo bloque scrollable, como una seccion continua del menu

