
Objetivo: corregir por qué Cartera sigue vacía aunque sí existen datos de prueba.

Diagnóstico confirmado:
- Sí hay datos en backend para tu organización (`5179...`): 3 contratos y 30 cuotas.
- El frontend está recibiendo error de API `PGRST201` (relación ambigua).
- Causa raíz: se duplicaron Foreign Keys en tablas de cartera (ya existían desde la migración inicial y luego se volvieron a crear con nombres `fk_*`).
- Al haber 2 FKs para la misma relación, los `select(..., portfolio_contracts(...))` y joins anidados no se pueden resolver automáticamente y retornan error.

Plan de implementación (fix definitivo):

1) Migración SQL de saneamiento (schema)
- Crear una nueva migración que elimine SOLO las FKs duplicadas agregadas recientemente:
  - `fk_portfolio_contracts_contact`
  - `fk_portfolio_contracts_project`
  - `fk_portfolio_contracts_unit`
  - `fk_portfolio_contracts_org`
  - `fk_portfolio_schedule_contract`
  - `fk_portfolio_schedule_org`
  - `fk_portfolio_payments_contract`
  - `fk_portfolio_payments_org`
- Mantener intactas las FKs originales (`*_fkey`) que ya estaban bien y algunas incluyen `ON DELETE CASCADE`.

2) Validación posterior a migración
- Verificar por consulta que quede 1 sola FK por relación en:
  - `portfolio_contracts`
  - `portfolio_payment_schedule`
  - `portfolio_payments`
- Confirmar que desaparece el error `PGRST201` en requests de:
  - `usePortfolioOverdue` / `usePortfolioUpcoming`
  - `usePortfolioContracts`

3) Validación funcional en UI (/cartera)
- Confirmar que se visualicen:
  - KPIs con montos/contador
  - Lista de contratos
  - Panel de mora
  - Alertas de próximos vencimientos
- Confirmar que el detalle `/cartera/:id` carga cronograma y datos del comprador.

4) Hardening opcional (recomendado)
- En queries con joins críticos, usar relación explícita `!constraint_name` para blindar contra futuras ambigüedades si alguien vuelve a duplicar FKs accidentalmente.
- Mantener como estándar: no volver a agregar FKs manuales si ya existen en migración base.

Detalles técnicos (para implementación):
- El error actual exacto en red: “Could not embed because more than one relationship was found for `portfolio_payment_schedule` and `portfolio_contracts`”.
- Esto confirma que el problema no es RLS ni ausencia de datos, sino metadata de relaciones duplicadas en esquema.
- No se requieren inserts nuevos ni cambios de datos de prueba; solo limpieza de constraints duplicadas.
