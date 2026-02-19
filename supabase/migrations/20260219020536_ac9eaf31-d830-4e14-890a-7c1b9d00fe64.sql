
-- ============================================================
-- PRICING SYSTEM MIGRATION
-- ============================================================

-- 1. plan_catalog: Master plan catalog (super admin editable)
CREATE TABLE public.plan_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' | 'bundle'
  description TEXT,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_ai_conversations INTEGER NOT NULL DEFAULT 0, -- 0 = no AI
  max_contacts INTEGER NOT NULL DEFAULT 5000,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. organization_subscriptions: Active subscription per org
CREATE TABLE public.organization_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plan_catalog(id),
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  activated_by UUID, -- super admin or reseller who activated
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_subscription UNIQUE (organization_id)
);

-- 3. organization_pricing: Custom prices per org (reseller markup)
CREATE TABLE public.organization_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plan_catalog(id),
  custom_price_usd NUMERIC(10,2),
  custom_max_users INTEGER,
  custom_max_ai_conversations INTEGER,
  custom_max_contacts INTEGER,
  set_by UUID, -- reseller who set this
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_pricing UNIQUE (organization_id)
);

-- 4. usage_records: Monthly snapshot of consumption
CREATE TABLE public.usage_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  ai_conversations_used INTEGER NOT NULL DEFAULT 0,
  users_count INTEGER NOT NULL DEFAULT 0,
  contacts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_usage_period UNIQUE (organization_id, period_year, period_month)
);

-- 5. usage_events: Granular append-only event log
CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL, -- 'ai_conversation' | 'contact_created' | etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- plan_catalog: anyone authenticated can read, only super admins write
CREATE POLICY "Anyone can view active plans" ON public.plan_catalog
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Super admins can manage plans" ON public.plan_catalog
  FOR ALL USING (is_super_admin());

-- organization_subscriptions: org members can read their own
CREATE POLICY "Org members can view subscription" ON public.organization_subscriptions
  FOR SELECT USING (organization_id = get_user_organization_id() OR is_super_admin() OR (organization_id IN (SELECT id FROM public.organizations WHERE parent_organization_id = get_reseller_organization_id())));

CREATE POLICY "Super admins can manage subscriptions" ON public.organization_subscriptions
  FOR ALL USING (is_super_admin());

CREATE POLICY "Resellers can manage sub-client subscriptions" ON public.organization_subscriptions
  FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE parent_organization_id = get_reseller_organization_id()) AND is_reseller_admin());

-- organization_pricing
CREATE POLICY "Org members can view their pricing" ON public.organization_pricing
  FOR SELECT USING (organization_id = get_user_organization_id() OR is_super_admin() OR (organization_id IN (SELECT id FROM public.organizations WHERE parent_organization_id = get_reseller_organization_id())));

CREATE POLICY "Super admins can manage pricing" ON public.organization_pricing
  FOR ALL USING (is_super_admin());

CREATE POLICY "Resellers can manage sub-client pricing" ON public.organization_pricing
  FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE parent_organization_id = get_reseller_organization_id()) AND is_reseller_admin());

-- usage_records
CREATE POLICY "Org members can view usage" ON public.usage_records
  FOR SELECT USING (organization_id = get_user_organization_id() OR is_super_admin() OR (organization_id IN (SELECT id FROM public.organizations WHERE parent_organization_id = get_reseller_organization_id())));

CREATE POLICY "Service role can write usage" ON public.usage_records
  FOR ALL USING (is_super_admin());

-- usage_events
CREATE POLICY "Org members can view events" ON public.usage_events
  FOR SELECT USING (organization_id = get_user_organization_id() OR is_super_admin());

CREATE POLICY "Service role can insert events" ON public.usage_events
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- SQL FUNCTIONS
-- ============================================================

-- Function 1: get_effective_plan_limits
CREATE OR REPLACE FUNCTION public.get_effective_plan_limits(p_org_id UUID)
RETURNS TABLE(
  max_users INTEGER,
  max_ai_conversations INTEGER,
  max_contacts INTEGER,
  plan_name TEXT,
  plan_slug TEXT,
  subscription_status TEXT,
  price_usd NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custom_pricing RECORD;
  v_subscription RECORD;
  v_plan RECORD;
BEGIN
  -- Check for custom pricing first
  SELECT op.* INTO v_custom_pricing
  FROM public.organization_pricing op
  WHERE op.organization_id = p_org_id
  LIMIT 1;

  -- Get subscription
  SELECT os.*, pc.* INTO v_subscription
  FROM public.organization_subscriptions os
  JOIN public.plan_catalog pc ON pc.id = os.plan_id
  WHERE os.organization_id = p_org_id
  LIMIT 1;

  IF v_subscription IS NULL THEN
    -- No subscription: return trial defaults
    RETURN QUERY SELECT 3, 100, 1000, 'Trial'::TEXT, 'trial'::TEXT, 'trial'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get plan
  SELECT * INTO v_plan FROM public.plan_catalog WHERE id = v_subscription.plan_id LIMIT 1;

  IF v_custom_pricing IS NOT NULL THEN
    -- Return custom pricing limits, falling back to plan for nulls
    RETURN QUERY SELECT
      COALESCE(v_custom_pricing.custom_max_users, v_plan.max_users),
      COALESCE(v_custom_pricing.custom_max_ai_conversations, v_plan.max_ai_conversations),
      COALESCE(v_custom_pricing.custom_max_contacts, v_plan.max_contacts),
      v_plan.name,
      v_plan.slug,
      v_subscription.status,
      COALESCE(v_custom_pricing.custom_price_usd, v_plan.price_usd);
  ELSE
    -- Return catalog plan limits
    RETURN QUERY SELECT
      v_plan.max_users,
      v_plan.max_ai_conversations,
      v_plan.max_contacts,
      v_plan.name,
      v_plan.slug,
      v_subscription.status,
      v_plan.price_usd;
  END IF;
END;
$$;

-- Function 2: get_current_usage
CREATE OR REPLACE FUNCTION public.get_current_usage(p_org_id UUID)
RETURNS TABLE(
  ai_conversations_used INTEGER,
  ai_conversations_limit INTEGER,
  users_count INTEGER,
  users_limit INTEGER,
  contacts_count INTEGER,
  contacts_limit INTEGER,
  can_use_ai BOOLEAN,
  subscription_status TEXT,
  plan_name TEXT,
  plan_slug TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
  v_ai_used INTEGER := 0;
  v_users INTEGER := 0;
  v_contacts INTEGER := 0;
  v_limits RECORD;
BEGIN
  -- Get effective limits
  SELECT * INTO v_limits FROM public.get_effective_plan_limits(p_org_id) LIMIT 1;

  -- Get AI usage this month
  SELECT COALESCE(ai_conversations_used, 0) INTO v_ai_used
  FROM public.usage_records
  WHERE organization_id = p_org_id
    AND period_year = v_year
    AND period_month = v_month;

  -- Get current users count
  SELECT COUNT(*)::INTEGER INTO v_users
  FROM public.team_members
  WHERE organization_id = p_org_id AND is_active = true;

  -- Get contacts count
  SELECT COUNT(*)::INTEGER INTO v_contacts
  FROM public.contacts
  WHERE organization_id = p_org_id;

  RETURN QUERY SELECT
    v_ai_used,
    v_limits.max_ai_conversations,
    v_users,
    v_limits.max_users,
    v_contacts,
    v_limits.max_contacts,
    -- can_use_ai: true if limit is -1 (unlimited) OR used < limit
    CASE 
      WHEN v_limits.max_ai_conversations = 0 THEN false -- CRM Base: no AI
      WHEN v_limits.max_ai_conversations = -1 THEN true  -- unlimited
      ELSE v_ai_used < v_limits.max_ai_conversations
    END,
    COALESCE(v_limits.subscription_status, 'trial'),
    COALESCE(v_limits.plan_name, 'Trial'),
    COALESCE(v_limits.plan_slug, 'trial');
END;
$$;

-- Function 3: increment_ai_usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_org_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
  v_can_use BOOLEAN;
BEGIN
  -- Check if can use AI
  SELECT can_use_ai INTO v_can_use
  FROM public.get_current_usage(p_org_id)
  LIMIT 1;

  IF NOT v_can_use THEN
    RETURN false;
  END IF;

  -- Upsert usage record
  INSERT INTO public.usage_records (organization_id, period_year, period_month, ai_conversations_used)
  VALUES (p_org_id, v_year, v_month, 1)
  ON CONFLICT (organization_id, period_year, period_month)
  DO UPDATE SET
    ai_conversations_used = usage_records.ai_conversations_used + 1,
    updated_at = now();

  -- Insert event log
  INSERT INTO public.usage_events (organization_id, user_id, event_type)
  VALUES (p_org_id, p_user_id, 'ai_conversation');

  RETURN true;
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER update_plan_catalog_updated_at
  BEFORE UPDATE ON public.plan_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_pricing_updated_at
  BEFORE UPDATE ON public.organization_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_records_updated_at
  BEFORE UPDATE ON public.usage_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED: 6 INITIAL PLANS
-- ============================================================

INSERT INTO public.plan_catalog (name, slug, plan_type, description, price_usd, max_users, max_ai_conversations, sort_order, features) VALUES
(
  'CRM Base', 'crm-base', 'individual',
  'CRM completo sin asistente IA. Ideal para equipos que gestionan contactos y pipeline.',
  79, 5, 0, 1,
  '["Contactos ilimitados","Pipeline de ventas","Gestión de tareas","Reportes básicos","Hasta 5 usuarios"]'::jsonb
),
(
  'Agente Starter', 'agente-starter', 'individual',
  'CRM + Asistente IA para 1 usuario. Perfecto para emprendedores.',
  79, 1, 1000, 2,
  '["Todo en CRM Base","Asistente IA (1,000 conv/mes)","1 usuario","Automatizaciones básicas"]'::jsonb
),
(
  'Agente Professional', 'agente-professional', 'individual',
  'CRM + IA avanzada para profesionales con alto volumen de conversaciones.',
  199, 1, 5000, 3,
  '["Todo en Agente Starter","5,000 conversaciones IA/mes","Automatizaciones avanzadas","Soporte prioritario"]'::jsonb
),
(
  'Essential', 'essential', 'bundle',
  'CRM + IA para equipos pequeños. La mejor relación precio-valor para empezar.',
  134, 5, 1000, 4,
  '["Todo en CRM Base","Asistente IA (1,000 conv/mes)","Hasta 5 usuarios","Panel de equipo","Integraciones"]'::jsonb
),
(
  'Growth', 'growth', 'bundle',
  'El plan más popular. Escala tu equipo con IA potente y hasta 10 usuarios.',
  228, 10, 5000, 5,
  '["Todo en Essential","5,000 conversaciones IA/mes","Hasta 10 usuarios","Analytics avanzados","White-label básico"]'::jsonb
),
(
  'Complete', 'complete', 'bundle',
  'Solución empresarial completa. Máximos usuarios e IA sin restricciones.',
  286, 20, 5000, 6,
  '["Todo en Growth","Hasta 20 usuarios","Soporte dedicado","Configuración avanzada","SLA garantizado"]'::jsonb
);

-- Mark Growth as featured
UPDATE public.plan_catalog SET is_featured = true WHERE slug = 'growth';
