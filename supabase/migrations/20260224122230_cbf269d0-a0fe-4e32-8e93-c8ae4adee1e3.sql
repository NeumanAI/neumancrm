
-- =============================================
-- PORTFOLIO CONTRACTS
-- =============================================
CREATE TABLE public.portfolio_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.real_estate_projects(id),
  contact_id UUID NOT NULL REFERENCES public.contacts(id),
  unit_id UUID REFERENCES public.real_estate_unit_types(id),
  contract_number TEXT NOT NULL,
  fiducia_number TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  signing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_price NUMERIC NOT NULL DEFAULT 0,
  separation_amount NUMERIC NOT NULL DEFAULT 0,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  subsidy_amount NUMERIC NOT NULL DEFAULT 0,
  financed_amount NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  term_months INTEGER NOT NULL DEFAULT 1,
  payment_day INTEGER NOT NULL DEFAULT 1,
  first_payment_date DATE,
  monthly_payment NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_contracts_org ON public.portfolio_contracts(organization_id);
CREATE INDEX idx_portfolio_contracts_project ON public.portfolio_contracts(project_id);
CREATE INDEX idx_portfolio_contracts_contact ON public.portfolio_contracts(contact_id);
CREATE INDEX idx_portfolio_contracts_status ON public.portfolio_contracts(status);

ALTER TABLE public.portfolio_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view portfolio contracts"
  ON public.portfolio_contracts FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can insert portfolio contracts"
  ON public.portfolio_contracts FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can update portfolio contracts"
  ON public.portfolio_contracts FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete portfolio contracts"
  ON public.portfolio_contracts FOR DELETE
  USING (organization_id = public.get_user_organization_id() 
    AND (public.user_has_role('admin') OR public.user_has_role('manager')));

-- =============================================
-- PORTFOLIO PAYMENT SCHEDULE
-- =============================================
CREATE TABLE public.portfolio_payment_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.portfolio_contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  interest_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  late_fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_schedule_contract ON public.portfolio_payment_schedule(contract_id);
CREATE INDEX idx_portfolio_schedule_org ON public.portfolio_payment_schedule(organization_id);
CREATE INDEX idx_portfolio_schedule_due ON public.portfolio_payment_schedule(due_date);
CREATE INDEX idx_portfolio_schedule_status ON public.portfolio_payment_schedule(status);

ALTER TABLE public.portfolio_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view payment schedule"
  ON public.portfolio_payment_schedule FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can insert payment schedule"
  ON public.portfolio_payment_schedule FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can update payment schedule"
  ON public.portfolio_payment_schedule FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

-- =============================================
-- PORTFOLIO PAYMENTS (log de cobros)
-- =============================================
CREATE TABLE public.portfolio_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.portfolio_contracts(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES public.portfolio_payment_schedule(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'transferencia',
  bank_reference TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_payments_contract ON public.portfolio_payments(contract_id);
CREATE INDEX idx_portfolio_payments_org ON public.portfolio_payments(organization_id);

ALTER TABLE public.portfolio_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view payments"
  ON public.portfolio_payments FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can insert payments"
  ON public.portfolio_payments FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

-- =============================================
-- PORTFOLIO COLLECTION ACTIONS
-- =============================================
CREATE TABLE public.portfolio_collection_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.portfolio_contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  action_type TEXT NOT NULL DEFAULT 'nota',
  result TEXT,
  notes TEXT,
  promise_date DATE,
  promise_amount NUMERIC,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_actions_contract ON public.portfolio_collection_actions(contract_id);
CREATE INDEX idx_portfolio_actions_org ON public.portfolio_collection_actions(organization_id);

ALTER TABLE public.portfolio_collection_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view collection actions"
  ON public.portfolio_collection_actions FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can insert collection actions"
  ON public.portfolio_collection_actions FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

-- Updated at triggers
CREATE TRIGGER update_portfolio_contracts_updated_at
  BEFORE UPDATE ON public.portfolio_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_schedule_updated_at
  BEFORE UPDATE ON public.portfolio_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
