-- Crear tabla contact_documents
CREATE TABLE public.contact_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios solo ven sus documentos
CREATE POLICY "Users see own contact documents"
  ON public.contact_documents
  FOR ALL
  USING (auth.uid() = user_id);

-- Crear bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-documents', 'contact-documents', false);

-- Politicas de storage
CREATE POLICY "Users can upload contact documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contact-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own contact documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contact-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own contact documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contact-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);