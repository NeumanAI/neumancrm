
Objetivo: corregir definitivamente que /cartera siga vacío aunque sí existen contratos y cuotas.

Diagnóstico confirmado (con evidencia)
- En backend sí hay datos para tu organización: `3` contratos y `30` cuotas.
- El frontend está recibiendo `PGRST201` en `/portfolio_payment_schedule?...select=...,portfolio_contracts(...)`.
- El error actual sigue diciendo relación ambigua entre:
  - `fk_portfolio_schedule_contract`
  - `portfolio_payment_schedule_contract_id_fkey`
- En esquema actual, por SQL solo aparece la FK original (`portfolio_payment_schedule_contract_id_fkey`), por lo que el problema activo es caché de relaciones del API + queries sin relación explícita (frágiles ante ambigüedad).

Plan de implementación
1) Blindar queries de Cartera con relaciones explícitas (fix principal en frontend)
- Actualizar selects en:
  - `src/hooks/usePortfolioOverdue.ts`
  - `src/hooks/usePortfolioContracts.ts`
- Cambiar joins anidados para usar `!constraint_name` en todas las relaciones de cartera:
  - `portfolio_contracts!portfolio_payment_schedule_contract_id_fkey(...)`
  - `contacts!portfolio_contracts_contact_id_fkey(...)`
  - `real_estate_projects!portfolio_contracts_project_id_fkey(...)`
  - `real_estate_unit_types!portfolio_contracts_unit_id_fkey(...)`
- Esto elimina la ambigüedad incluso si el API conserva metadata vieja temporalmente.

2) Mejorar manejo de errores para no “silenciar vacío”
- En hooks de cartera, si hay error de query:
  - registrar `console.error` con código/mensaje
  - exponer estado `error` al componente
- En `src/pages/Portfolio.tsx`:
  - si hay error, mostrar card de error (“No se pudo cargar cartera, reintenta”) en lugar de “No hay contratos”.

3) Refuerzo opcional backend (recomendado)
- Crear migración mínima para forzar recarga de metadata del API:
  - `NOTIFY pgrst, 'reload schema';`
- No toca datos ni RLS; solo evita que persista caché antigua de FKs.

4) Validación funcional (obligatoria)
- Verificar en `/cartera`:
  - KPIs con valores > 0
  - lista de contratos visible
  - panel de mora visible (si aplica)
  - alertas de próximos vencimientos visibles
- Verificar en `/cartera/:id`:
  - cronograma y pagos cargan correctamente.

Detalles técnicos
- No se requieren nuevos datos de prueba (ya existen).
- No se requiere cambiar políticas RLS para este bug (el fallo observado es de embedding/relaciones, no de permisos).
- Beneficio del enfoque: queda estable aunque en el futuro alguien vuelva a introducir FKs duplicadas por error; las queries seguirán resolviendo la relación correcta.
