
-- Function to mark overdue installments
CREATE OR REPLACE FUNCTION public.update_overdue_installments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.portfolio_payment_schedule
  SET status = 'overdue', updated_at = now()
  WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_overdue_installments() TO authenticated;

-- View for portfolio KPIs aggregated by organization
CREATE OR REPLACE VIEW public.portfolio_kpis AS
SELECT
  pc.organization_id,
  COUNT(DISTINCT pc.id) AS total_contracts,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'active') AS active_contracts,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'completed') AS completed_contracts,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'defaulted') AS defaulted_contracts,
  COALESCE(SUM(pc.financed_amount) FILTER (WHERE pc.status = 'active'), 0) AS active_portfolio_amount,
  COALESCE(SUM(pps.total_amount) FILTER (WHERE pps.status = 'paid'), 0) AS total_collected,
  COALESCE(SUM(pps.total_amount - pps.paid_amount) FILTER (WHERE pps.status = 'overdue'), 0) AS total_overdue_amount,
  COUNT(pps.id) FILTER (WHERE pps.status = 'overdue') AS overdue_installments_count,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.id IN (
    SELECT contract_id FROM public.portfolio_payment_schedule WHERE status = 'overdue'
  )) AS contracts_with_overdue
FROM public.portfolio_contracts pc
LEFT JOIN public.portfolio_payment_schedule pps ON pps.contract_id = pc.id
GROUP BY pc.organization_id;

GRANT SELECT ON public.portfolio_kpis TO authenticated;
