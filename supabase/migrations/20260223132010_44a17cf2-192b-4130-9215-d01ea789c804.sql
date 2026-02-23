
-- Add contact_type column to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'prospecto';

-- Validation trigger for contact_type
CREATE OR REPLACE FUNCTION public.validate_contact_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contact_type NOT IN ('prospecto', 'comprador', 'empresa', 'inactivo') THEN
    RAISE EXCEPTION 'Invalid contact_type: %. Must be one of: prospecto, comprador, empresa, inactivo', NEW.contact_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contact_type_trigger
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contact_type();

-- Index for filtering by type within org
CREATE INDEX IF NOT EXISTS idx_contacts_org_type ON public.contacts (organization_id, contact_type);

-- Auto-migrate existing buyers (contacts linked to sold/reserved units)
UPDATE public.contacts
SET contact_type = 'comprador'
WHERE id IN (
  SELECT DISTINCT buyer_contact_id
  FROM public.real_estate_unit_types
  WHERE buyer_contact_id IS NOT NULL
    AND commercial_status IN ('Separado', 'Vendido')
);

-- Contact type history table
CREATE TABLE public.contact_type_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  previous_type TEXT NOT NULL,
  new_type TEXT NOT NULL,
  reason TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_type_history ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read history
CREATE POLICY "Org members can view type history"
  ON public.contact_type_history
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- RLS: active team members can insert history
CREATE POLICY "Team members can insert type history"
  ON public.contact_type_history
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Index for lookups
CREATE INDEX idx_contact_type_history_contact ON public.contact_type_history (contact_id);
