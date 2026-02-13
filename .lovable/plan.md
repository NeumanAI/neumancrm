
# Desactivar Onboarding Conversacional con IA

## Resumen

Eliminar la redireccion forzada al onboarding y desactivar la ruta, para que los usuarios accedan directamente al dashboard sin pasar por el flujo conversacional que esta fallando.

## Cambios

### 1. `src/components/layout/AppLayout.tsx`
- Eliminar el `useEffect` (lineas 49-54) que redirige a `/onboarding` cuando `onboarding_completed` no esta en los metadatos del usuario

### 2. `src/App.tsx`
- Eliminar el import de `Onboarding` y la ruta `/onboarding`

## Resultado

- Los usuarios nuevos entraran directamente al dashboard sin bloqueos
- La ruta `/onboarding` dejara de existir
- El archivo `src/pages/Onboarding.tsx` y el hook `src/hooks/useOnboarding.ts` se mantienen por si se quiere reactivar en el futuro
- La edge function `process-onboarding-step` sigue desplegada pero no sera invocada
