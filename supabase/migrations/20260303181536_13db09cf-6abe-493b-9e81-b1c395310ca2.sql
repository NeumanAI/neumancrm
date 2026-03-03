
-- Table: clinical_notes
CREATE TABLE public.clinical_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  consultation_date timestamp with time zone NOT NULL DEFAULT now(),
  input_mode text NOT NULL DEFAULT 'text',
  raw_transcript text,
  subjective text,
  objective text,
  analysis text,
  plan text,
  full_note text,
  template_used text NOT NULL DEFAULT 'soap',
  audio_url text,
  status text NOT NULL DEFAULT 'draft',
  is_signed boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_clinical_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.input_mode NOT IN ('recording', 'dictation', 'text') THEN
    RAISE EXCEPTION 'Invalid input_mode: %', NEW.input_mode;
  END IF;
  IF NEW.template_used NOT IN ('soap', 'narrative') THEN
    RAISE EXCEPTION 'Invalid template_used: %', NEW.template_used;
  END IF;
  IF NEW.status NOT IN ('draft', 'generating', 'completed', 'signed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_clinical_note
BEFORE INSERT OR UPDATE ON public.clinical_notes
FOR EACH ROW EXECUTE FUNCTION public.validate_clinical_note();

-- Updated_at trigger
CREATE TRIGGER trg_clinical_notes_updated_at
BEFORE UPDATE ON public.clinical_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indices
CREATE INDEX idx_clinical_notes_org ON public.clinical_notes(organization_id);
CREATE INDEX idx_clinical_notes_contact ON public.clinical_notes(contact_id);
CREATE INDEX idx_clinical_notes_created_by ON public.clinical_notes(created_by);
CREATE INDEX idx_clinical_notes_consultation_date ON public.clinical_notes(consultation_date);
CREATE INDEX idx_clinical_notes_status ON public.clinical_notes(status);

-- RLS
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view clinical notes"
ON public.clinical_notes FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert clinical notes"
ON public.clinical_notes FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Creator or admin can update clinical notes"
ON public.clinical_notes FOR UPDATE TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND (created_by = auth.uid() OR user_has_role('admin'::team_role) OR user_has_role('manager'::team_role))
);

CREATE POLICY "Admin can delete clinical notes"
ON public.clinical_notes FOR DELETE TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND user_has_role('admin'::team_role)
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('clinical-audio', 'clinical-audio', false);

-- Storage policies
CREATE POLICY "Users can upload clinical audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clinical-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own clinical audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'clinical-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
