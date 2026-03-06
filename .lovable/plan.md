

# Fix: Error "Sin organización" en Mensajería

## Problema
El error ocurre en `useTwilio.ts` línea 107-114. La consulta a `team_members` usa `.single()` pero el usuario pertenece a múltiples organizaciones, lo que causa que `.single()` falle (retorna error cuando hay más de una fila). Al fallar, `teamMember` es null y se lanza "Sin organización".

## Solución
Usar la función RPC `get_user_organization_id()` que ya existe en la base de datos y respeta la organización activa del usuario (tabla `user_active_organization`). Esto es consistente con el patrón usado en el resto de la aplicación.

## Cambios

### `src/hooks/useTwilio.ts`
En `createCampaign`, reemplazar la consulta a `team_members` con `.single()` por una llamada RPC:

```typescript
// Antes (falla con múltiples orgs):
const { data: teamMember } = await supabase
  .from('team_members')
  .select('organization_id')
  .eq('user_id', currentUser.id)
  .eq('is_active', true)
  .single();
if (!teamMember) throw new Error('Sin organización');

// Después:
const { data: orgId } = await supabase.rpc('get_user_organization_id');
if (!orgId) throw new Error('Sin organización');
```

Y luego usar `orgId` directamente en lugar de `teamMember.organization_id`.

Un solo archivo modificado, un cambio de 6 líneas.

