
-- Table: broadcast_campaigns
CREATE TABLE public.broadcast_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_filters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: broadcast_messages
CREATE TABLE public.broadcast_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  twilio_sid TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: whatsapp_templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'utility',
  variables TEXT[] DEFAULT '{}'::text[],
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_broadcast_campaign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid campaign status: %', NEW.status;
  END IF;
  IF NEW.target_type NOT IN ('all', 'contact_type', 'tag', 'project', 'custom') THEN
    RAISE EXCEPTION 'Invalid target_type: %', NEW.target_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_broadcast_campaign
BEFORE INSERT OR UPDATE ON public.broadcast_campaigns
FOR EACH ROW EXECUTE FUNCTION public.validate_broadcast_campaign();

CREATE OR REPLACE FUNCTION public.validate_broadcast_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'sent', 'delivered', 'failed') THEN
    RAISE EXCEPTION 'Invalid message status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_broadcast_message
BEFORE INSERT OR UPDATE ON public.broadcast_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_broadcast_message();

CREATE OR REPLACE FUNCTION public.validate_whatsapp_template()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.category NOT IN ('utility', 'marketing', 'authentication') THEN
    RAISE EXCEPTION 'Invalid template category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_whatsapp_template
BEFORE INSERT OR UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.validate_whatsapp_template();

-- Increment function
CREATE OR REPLACE FUNCTION public.increment_campaign_sent(campaign_id_param UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.broadcast_campaigns
  SET sent_count = sent_count + 1, updated_at = now()
  WHERE id = campaign_id_param;
END;
$$;

-- RLS
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- broadcast_campaigns policies
CREATE POLICY "Org members can view campaigns"
ON public.broadcast_campaigns FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert campaigns"
ON public.broadcast_campaigns FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Org members can update campaigns"
ON public.broadcast_campaigns FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete campaigns"
ON public.broadcast_campaigns FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND (user_has_role('admin') OR user_has_role('manager')));

-- broadcast_messages policies (via campaign org)
CREATE POLICY "Org members can view broadcast messages"
ON public.broadcast_messages FOR SELECT TO authenticated
USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE organization_id = get_user_organization_id()));

CREATE POLICY "Org members can insert broadcast messages"
ON public.broadcast_messages FOR INSERT TO authenticated
WITH CHECK (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE organization_id = get_user_organization_id()));

CREATE POLICY "Org members can update broadcast messages"
ON public.broadcast_messages FOR UPDATE TO authenticated
USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE organization_id = get_user_organization_id()));

-- whatsapp_templates policies
CREATE POLICY "Org members can view templates"
ON public.whatsapp_templates FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage templates"
ON public.whatsapp_templates FOR ALL TO authenticated
USING (organization_id = get_user_organization_id() AND user_has_role('admin'));
