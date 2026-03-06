
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
