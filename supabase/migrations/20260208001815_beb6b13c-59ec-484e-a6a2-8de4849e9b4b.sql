
-- ============================================================
-- TABLA: user_actions (Tracking de comportamiento)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  page_url TEXT,
  previous_page_url TEXT,
  method TEXT,
  metadata JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user ON public.user_actions(user_id);
CREATE INDEX idx_user_actions_org ON public.user_actions(organization_id);
CREATE INDEX idx_user_actions_type ON public.user_actions(action_type);
CREATE INDEX idx_user_actions_created ON public.user_actions(created_at DESC);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions" ON public.user_actions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own actions" ON public.user_actions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TABLA: user_behavior_patterns (Patrones aprendidos)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1,
  confidence DECIMAL(5,2),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_behavior_patterns_user ON public.user_behavior_patterns(user_id);
CREATE INDEX idx_behavior_patterns_type ON public.user_behavior_patterns(pattern_type);

ALTER TABLE public.user_behavior_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns" ON public.user_behavior_patterns
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own patterns" ON public.user_behavior_patterns
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own patterns" ON public.user_behavior_patterns
  FOR UPDATE USING (user_id = auth.uid());
