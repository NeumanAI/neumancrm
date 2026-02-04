

# Plan: Corregir Imports de Edge Functions

## Problema Detectado

Algunas Edge Functions aún tienen imports inconsistentes que pueden causar el error de bundling `troika-three-utils`. El error ocurre cuando `esm.sh` intenta resolver dependencias sin el target `deno` especificado.

## Archivos a Corregir

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/chat/index.ts` | Cambiar `@2.43.4` → `@2.43.4?target=deno` |
| `supabase/functions/process-import/index.ts` | Cambiar `@2` → `@2.43.4?target=deno` |
| `supabase/functions/process-export/index.ts` | Cambiar `@2` → `@2.43.4?target=deno` |
| `supabase/functions/check-notifications/index.ts` | Cambiar `@2.43.4` → `@2.43.4?target=deno` |
| `supabase/functions/gmail-auth/index.ts` | Verificar y corregir si es necesario |

## Cambio Específico

En cada archivo, la línea 2 debe quedar así:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";
```

## Por Qué Funciona

- `?target=deno` le indica a esm.sh que genere el bundle específico para Deno runtime
- Esto evita dependencias problemáticas como `troika-three-utils` que son para browsers
- La versión fija `@2.43.4` garantiza consistencia entre todas las funciones

## Pasos de Implementación

1. Actualizar import en `chat/index.ts` (línea 2)
2. Actualizar import en `process-import/index.ts` (línea 2)
3. Actualizar import en `process-export/index.ts` (línea 2)
4. Actualizar import en `check-notifications/index.ts` (línea 2)
5. Verificar `gmail-auth/index.ts` y corregir si falta
6. Redesplegar todas las Edge Functions

