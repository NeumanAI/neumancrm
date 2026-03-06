

# Fix: Cartera no muestra datos — Faltan Foreign Keys

## Problema raíz

Las tablas `portfolio_contracts`, `portfolio_payment_schedule`, y `portfolio_payments` fueron creadas **sin foreign keys**. PostgREST (el API de la base de datos) necesita foreign keys para resolver los joins en queries como:

```
.select('*, contacts(...), real_estate_projects(...), real_estate_unit_types(...)')
```

Sin FKs, estas queries fallan silenciosamente y retornan arrays vacíos.

## Solución

### Migración SQL — Agregar foreign keys a las 3 tablas de cartera

```sql
-- portfolio_contracts
ALTER TABLE portfolio_contracts
  ADD CONSTRAINT fk_portfolio_contracts_contact FOREIGN KEY (contact_id) REFERENCES contacts(id),
  ADD CONSTRAINT fk_portfolio_contracts_project FOREIGN KEY (project_id) REFERENCES real_estate_projects(id),
  ADD CONSTRAINT fk_portfolio_contracts_unit FOREIGN KEY (unit_id) REFERENCES real_estate_unit_types(id),
  ADD CONSTRAINT fk_portfolio_contracts_org FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- portfolio_payment_schedule
ALTER TABLE portfolio_payment_schedule
  ADD CONSTRAINT fk_portfolio_schedule_contract FOREIGN KEY (contract_id) REFERENCES portfolio_contracts(id),
  ADD CONSTRAINT fk_portfolio_schedule_org FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- portfolio_payments
ALTER TABLE portfolio_payments
  ADD CONSTRAINT fk_portfolio_payments_contract FOREIGN KEY (contract_id) REFERENCES portfolio_contracts(id),
  ADD CONSTRAINT fk_portfolio_payments_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
```

### Sin cambios en código frontend

El código ya hace los joins correctos — solo necesita que las FKs existan en la base de datos para que PostgREST los resuelva.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Agregar 8 foreign keys |

