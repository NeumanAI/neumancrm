-- Crear tabla company_documents
CREATE TABLE public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios solo ven sus documentos
CREATE POLICY "Users see own company documents"
  ON public.company_documents
  FOR ALL
  USING (auth.uid() = user_id);