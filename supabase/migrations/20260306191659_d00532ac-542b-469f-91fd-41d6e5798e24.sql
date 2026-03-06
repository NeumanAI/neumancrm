-- Drop duplicate FKs added in previous migration (originals with *_fkey suffix remain)
ALTER TABLE portfolio_contracts
  DROP CONSTRAINT IF EXISTS fk_portfolio_contracts_contact,
  DROP CONSTRAINT IF EXISTS fk_portfolio_contracts_project,
  DROP CONSTRAINT IF EXISTS fk_portfolio_contracts_unit,
  DROP CONSTRAINT IF EXISTS fk_portfolio_contracts_org;

ALTER TABLE portfolio_payment_schedule
  DROP CONSTRAINT IF EXISTS fk_portfolio_schedule_contract,
  DROP CONSTRAINT IF EXISTS fk_portfolio_schedule_org;

ALTER TABLE portfolio_payments
  DROP CONSTRAINT IF EXISTS fk_portfolio_payments_contract,
  DROP CONSTRAINT IF EXISTS fk_portfolio_payments_org;