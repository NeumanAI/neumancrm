
-- Fase 1: Atribucion Comercial por Asesor

-- 1. Add advisor columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS assigned_advisor_id uuid,
  ADD COLUMN IF NOT EXISTS capture_advisor_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- 2. Add closing advisor columns to real_estate_unit_types
ALTER TABLE public.real_estate_unit_types
  ADD COLUMN IF NOT EXISTS closing_advisor_id uuid,
  ADD COLUMN IF NOT EXISTS closing_advisor_at timestamptz;

-- 3. Create contact_advisor_history table
CREATE TABLE IF NOT EXISTS public.contact_advisor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  previous_advisor_id uuid,
  new_advisor_id uuid NOT NULL,
  transferred_by uuid NOT NULL,
  reason text,
  transfer_type text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.contact_advisor_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for contact_advisor_history
CREATE POLICY "Org members can view advisor history"
  ON public.contact_advisor_history
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert advisor history"
  ON public.contact_advisor_history
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_advisor ON public.contacts(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_contacts_capture_advisor ON public.contacts(capture_advisor_id);
CREATE INDEX IF NOT EXISTS idx_contact_advisor_history_contact ON public.contact_advisor_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_advisor_history_advisor ON public.contact_advisor_history(new_advisor_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_units_closing_advisor ON public.real_estate_unit_types(closing_advisor_id);

-- 7. Data migration: assign created_by as initial advisor for existing contacts
UPDATE public.contacts
SET assigned_advisor_id = created_by,
    capture_advisor_id = created_by,
    assigned_at = created_at
WHERE created_by IS NOT NULL
  AND assigned_advisor_id IS NULL;
