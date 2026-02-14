
-- =============================================
-- 1. Tabla calendar_events
-- =============================================
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  meeting_url TEXT,
  color TEXT DEFAULT '#3B82F6',
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  reminders JSONB DEFAULT '[]'::jsonb,
  recurrence_rule TEXT,
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  google_event_id TEXT,
  synced_with_google BOOLEAN DEFAULT false,
  google_calendar_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org calendar events"
  ON public.calendar_events FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own calendar events"
  ON public.calendar_events FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar events"
  ON public.calendar_events FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for event_type
CREATE OR REPLACE FUNCTION public.validate_calendar_event()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.event_type NOT IN ('meeting', 'call', 'demo', 'follow_up', 'closing', 'other') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  IF NEW.end_time <= NEW.start_time AND NEW.all_day = false THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_calendar_event_trigger
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_calendar_event();

-- =============================================
-- 2. Tabla calendar_goals
-- =============================================
CREATE TABLE public.calendar_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'revenue',
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT DEFAULT '#10B981',
  show_in_calendar BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org goals"
  ON public.calendar_goals FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create goals"
  ON public.calendar_goals FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own goals"
  ON public.calendar_goals FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own goals"
  ON public.calendar_goals FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_calendar_goals_updated_at
  BEFORE UPDATE ON public.calendar_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for goal_type
CREATE OR REPLACE FUNCTION public.validate_calendar_goal()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.goal_type NOT IN ('revenue', 'calls', 'deals_closed', 'meetings', 'new_contacts', 'other') THEN
    RAISE EXCEPTION 'Invalid goal_type: %', NEW.goal_type;
  END IF;
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_calendar_goal_trigger
  BEFORE INSERT OR UPDATE ON public.calendar_goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_calendar_goal();

-- =============================================
-- 3. Tabla google_calendar_sync
-- =============================================
CREATE TABLE public.google_calendar_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  selected_calendars JSONB DEFAULT '[]'::jsonb,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional',
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google sync"
  ON public.google_calendar_sync FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_google_calendar_sync_updated_at
  BEFORE UPDATE ON public.google_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. Modificar activities
-- =============================================
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS show_in_calendar BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS calendar_color TEXT DEFAULT '#f59e0b';

-- =============================================
-- 5. Función get_calendar_items
-- =============================================
CREATE OR REPLACE FUNCTION public.get_calendar_items(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_org_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  item_type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN,
  color TEXT,
  metadata JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Calendar events
  SELECT 
    ce.id, ce.title, 'event'::TEXT as item_type,
    ce.start_time, ce.end_time, ce.all_day,
    ce.color,
    jsonb_build_object(
      'event_type', ce.event_type, 'location', ce.location,
      'meeting_url', ce.meeting_url, 'contact_id', ce.contact_id,
      'company_id', ce.company_id, 'opportunity_id', ce.opportunity_id,
      'participants', ce.participants, 'synced_with_google', ce.synced_with_google,
      'description', ce.description
    ) as metadata
  FROM public.calendar_events ce
  WHERE ce.organization_id = p_org_id
    AND ce.start_time <= p_end_date
    AND ce.end_time >= p_start_date

  UNION ALL

  -- Activities (tasks) with due dates
  SELECT 
    a.id, a.title, 'task'::TEXT as item_type,
    a.due_date as start_time, a.due_date as end_time,
    true as all_day,
    COALESCE(a.calendar_color, '#f59e0b') as color,
    jsonb_build_object(
      'priority', a.priority, 'completed', a.completed,
      'type', a.type, 'contact_id', a.contact_id,
      'company_id', a.company_id, 'description', a.description
    ) as metadata
  FROM public.activities a
  WHERE a.user_id = auth.uid()
    AND a.due_date IS NOT NULL
    AND a.show_in_calendar = true
    AND a.due_date BETWEEN p_start_date AND p_end_date

  UNION ALL

  -- Goals
  SELECT 
    g.id, g.title, 'goal'::TEXT as item_type,
    g.start_date::TIMESTAMP WITH TIME ZONE as start_time,
    g.end_date::TIMESTAMP WITH TIME ZONE as end_time,
    true as all_day,
    g.color,
    jsonb_build_object(
      'goal_type', g.goal_type, 'target_value', g.target_value,
      'current_value', g.current_value,
      'progress_percentage', CASE WHEN g.target_value > 0 
        THEN ROUND((g.current_value / g.target_value) * 100, 1) ELSE 0 END
    ) as metadata
  FROM public.calendar_goals g
  WHERE g.organization_id = p_org_id
    AND g.show_in_calendar = true
    AND g.start_date::TIMESTAMP WITH TIME ZONE <= p_end_date
    AND g.end_date::TIMESTAMP WITH TIME ZONE >= p_start_date;
$$;

-- =============================================
-- 6. Trigger para actualizar progreso de metas al cerrar oportunidades
-- =============================================
CREATE OR REPLACE FUNCTION public.update_goal_progress_on_opportunity()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    UPDATE public.calendar_goals
    SET current_value = current_value + COALESCE(NEW.value, 0),
        updated_at = now()
    WHERE goal_type = 'revenue'
      AND organization_id = NEW.organization_id
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_goal_on_opportunity_won
  AFTER UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress_on_opportunity();
