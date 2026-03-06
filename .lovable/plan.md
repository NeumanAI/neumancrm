
Objetivo: corregir el error real que está bloqueando Cartera y quitar el estado vacío falso.

Diagnóstico confirmado
- El error visible en UI es: `supabase.rpc(...).catch is not a function`.
- Esto pasa porque `supabase.rpc()` devuelve un builder/thenable, no un objeto con `.catch()` encadenable en este contexto.
- Al fallar esa línea, se corta el `queryFn` antes de cargar contratos, por eso Cartera queda en error y KPIs en cero.
- Los requests 200 con `[]` en cuotas “pending” no son el problema principal; pueden ser válidos según fechas/estado.
- Do I know what the issue is? Sí: el bloqueo actual es el manejo incorrecto de `rpc` en hooks de cartera.

Archivos a corregir
- `src/hooks/usePortfolioContracts.ts`
- `src/hooks/usePortfolioOverdue.ts`
- `src/hooks/usePortfolioSchedule.ts`
- (opcional de robustez) `src/hooks/usePortfolioOverdue.ts` en `usePortfolioUpcoming` para logging contextual

Plan de implementación
1) Reemplazar patrón roto de RPC
- Cambiar en los 3 hooks:
  - De: `await (supabase.rpc as any)('update_overdue_installments').catch(() => {});`
  - A: llamada segura con `await supabase.rpc('update_overdue_installments')` y manejo explícito:
    - si hay `rpcError`, hacer `console.warn(...)` y continuar
    - nunca lanzar por ese RPC (es mantenimiento, no bloqueo funcional)

2) Estandarizar helper interno (opcional pero recomendado)
- Crear una función local reutilizable por hook:
  - `runOverdueRefreshSafely(contextName)`
  - evita duplicar lógica y evita que vuelva a aparecer `.catch is not a function`

3) Mantener carga de datos principal independiente
- Asegurar que aunque falle el refresh de mora:
  - contratos igual se consulten
  - cronograma del detalle igual cargue
  - mora/próximos vencimientos sigan consultando datos

4) Endurecer visibilidad de errores
- Mantener error card actual en `Portfolio.tsx`
- Mejorar mensaje cuando falle solo el RPC de actualización (warning técnico en consola, no error fatal en UI)

5) Validación final
- `/cartera`:
  - desaparece mensaje `supabase.rpc(...).catch is not a function`
  - carga lista de contratos y KPIs
- `/cartera/:id`:
  - carga plan de pagos sin romper por RPC
- Red:
  - aparece consulta a `portfolio_contracts` exitosa
  - no se interrumpe la ejecución por TypeError de RPC

Resultado esperado
- Se elimina el error bloqueante actual.
- Cartera vuelve a renderizar contratos existentes.
- El módulo queda estable aunque falle temporalmente la actualización automática de mora.
