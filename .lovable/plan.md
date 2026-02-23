

# Fix: Los segmentos no se abren al hacer clic

## Problema detectado

En el componente `ProjectCard.tsx`, al hacer clic en una tarjeta de segmento, navega a `/projects/{id}`. Sin embargo, en `App.tsx` esa ruta esta configurada como un redirect generico a `/segmentos` (sin conservar el ID), por lo que nunca se llega al detalle del segmento.

## Solucion

### Archivo: `src/components/projects/ProjectCard.tsx`

Cambiar las 2 referencias de navegacion de `/projects/${project.id}` a `/segmentos/${project.id}`:

- **Linea 80**: `onClick={() => navigate('/segmentos/${project.id}'))`
- **Linea 116**: `navigate('/segmentos/${project.id}')`

### Archivo: `src/App.tsx` (opcional, mejora)

Actualizar el redirect de `/projects/:projectId` para que conserve el parametro:

- Cambiar `<Navigate to="/segmentos" replace />` por un componente que extraiga el `projectId` y redirija a `/segmentos/:projectId`

---

## Resumen tecnico

Solo se necesita cambiar 2 lineas en `ProjectCard.tsx` para corregir la navegacion. Opcionalmente se mejora el redirect en `App.tsx` para que enlaces antiguos con `/projects/:id` tambien funcionen correctamente.

