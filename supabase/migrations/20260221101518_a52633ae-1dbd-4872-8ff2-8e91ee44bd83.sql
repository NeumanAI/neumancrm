
-- 1. Expand contact_documents with sharing + org fields
ALTER TABLE public.contact_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Expand company_documents with sharing + org fields
ALTER TABLE public.company_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Create org_documents table (central repository)
CREATE TABLE public.org_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  description text,
  tags text[] DEFAULT '{}',
  is_shared boolean DEFAULT false,
  share_token text UNIQUE,
  share_expires_at timestamptz,
  share_views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org documents"
  ON public.org_documents FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org documents"
  ON public.org_documents FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org documents"
  ON public.org_documents FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete org documents"
  ON public.org_documents FOR DELETE
  USING (organization_id = get_user_organization_id() AND (user_id = auth.uid() OR user_has_role('admin'::team_role)));

-- 4. Create document_categories table
CREATE TABLE public.document_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  slug text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  icon text DEFAULT 'file-text',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, slug)
);

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org categories"
  ON public.document_categories FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert categories"
  ON public.document_categories FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND user_has_role('admin'::team_role));

CREATE POLICY "Admins can update categories"
  ON public.document_categories FOR UPDATE
  USING (organization_id = get_user_organization_id() AND user_has_role('admin'::team_role));

CREATE POLICY "Admins can delete categories"
  ON public.document_categories FOR DELETE
  USING (organization_id = get_user_organization_id() AND user_has_role('admin'::team_role));

-- 5. Create get_shared_document function
CREATE OR REPLACE FUNCTION public.get_shared_document(p_token text)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_path text,
  file_size integer,
  mime_type text,
  document_type text,
  description text,
  share_expires_at timestamptz,
  source_table text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Search in contact_documents
  RETURN QUERY
  SELECT cd.id, cd.file_name, cd.file_path, cd.file_size, cd.mime_type, cd.document_type, cd.description, cd.share_expires_at, 'contact_documents'::text
  FROM public.contact_documents cd
  WHERE cd.share_token = p_token AND cd.is_shared = true
    AND (cd.share_expires_at IS NULL OR cd.share_expires_at > now());

  IF FOUND THEN
    UPDATE public.contact_documents SET share_views = COALESCE(share_views, 0) + 1 WHERE share_token = p_token;
    RETURN;
  END IF;

  -- Search in company_documents
  RETURN QUERY
  SELECT cd2.id, cd2.file_name, cd2.file_path, cd2.file_size, cd2.mime_type, cd2.document_type, cd2.description, cd2.share_expires_at, 'company_documents'::text
  FROM public.company_documents cd2
  WHERE cd2.share_token = p_token AND cd2.is_shared = true
    AND (cd2.share_expires_at IS NULL OR cd2.share_expires_at > now());

  IF FOUND THEN
    UPDATE public.company_documents SET share_views = COALESCE(share_views, 0) + 1 WHERE share_token = p_token;
    RETURN;
  END IF;

  -- Search in org_documents
  RETURN QUERY
  SELECT od.id, od.file_name, od.file_path, od.file_size, od.mime_type, od.document_type, od.description, od.share_expires_at, 'org_documents'::text
  FROM public.org_documents od
  WHERE od.share_token = p_token AND od.is_shared = true
    AND (od.share_expires_at IS NULL OR od.share_expires_at > now());

  IF FOUND THEN
    UPDATE public.org_documents SET share_views = COALESCE(share_views, 0) + 1 WHERE share_token = p_token;
    RETURN;
  END IF;
END;
$$;

-- 6. Create org-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-documents', 'org-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for org-documents bucket
CREATE POLICY "Authenticated users can upload org docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view org docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update org docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete org docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'org-documents' AND auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_documents_org_id ON public.org_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_documents_share_token ON public.org_documents(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_documents_share_token ON public.contact_documents(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_documents_share_token ON public.company_documents(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_categories_org_id ON public.document_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_documents_tags ON public.org_documents USING GIN(tags);
