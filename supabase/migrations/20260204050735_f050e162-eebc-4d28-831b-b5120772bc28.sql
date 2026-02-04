-- ============================================================
-- TABLA: import_jobs (Trabajos de importación)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Job info
  filename TEXT NOT NULL,
  file_size INTEGER,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'companies', 'opportunities', 'activities')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0,
  
  -- Results
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  
  -- Errors
  errors JSONB,
  
  -- Settings
  import_settings JSONB,
  column_mapping JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_user ON public.import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own import jobs" ON public.import_jobs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: export_jobs (Trabajos de exportación)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Export info
  entity_type TEXT NOT NULL,
  format TEXT DEFAULT 'csv' CHECK (format IN ('csv', 'xlsx', 'json')),
  
  -- Filters
  filters JSONB,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  
  -- Results
  total_records INTEGER DEFAULT 0,
  file_url TEXT,
  file_size INTEGER,
  expires_at TIMESTAMPTZ,
  
  -- Error
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_export_jobs_user ON public.export_jobs(user_id);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own export jobs" ON public.export_jobs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: duplicates (Duplicados detectados)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Duplicate info
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'companies')),
  entity_id_1 UUID NOT NULL,
  entity_id_2 UUID NOT NULL,
  
  -- Similarity
  similarity_score INTEGER CHECK (similarity_score BETWEEN 0 AND 100),
  matching_fields TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'dismissed', 'ignored')),
  merged_into UUID,
  
  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id_1, entity_id_2)
);

CREATE INDEX idx_duplicates_user ON public.duplicates(user_id);
CREATE INDEX idx_duplicates_status ON public.duplicates(status);

ALTER TABLE public.duplicates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own duplicates" ON public.duplicates
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: audit_log (Registro de cambios)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'merge', 'bulk_update', 'bulk_delete', 'import', 'export')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLA: backups (Respaldos automáticos)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Backup info
  backup_type TEXT DEFAULT 'manual' CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
  
  -- Content
  includes TEXT[],
  file_url TEXT NOT NULL,
  file_size INTEGER,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Stats
  total_records INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_backups_user ON public.backups(user_id);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own backups" ON public.backups
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET: data-files
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('data-files', 'data-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for data-files bucket
CREATE POLICY "Users can upload their own data files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'data-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own data files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'data-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own data files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'data-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- TRIGGERS para Audit Log
-- ============================================================

-- Trigger para contactos
CREATE OR REPLACE FUNCTION public.log_contacts_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'delete', 'contacts', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'update', 'contacts', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'create', 'contacts', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER contacts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_contacts_changes();

-- Trigger para empresas
CREATE OR REPLACE FUNCTION public.log_companies_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'delete', 'companies', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'update', 'companies', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'create', 'companies', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER companies_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_companies_changes();

-- Trigger para oportunidades
CREATE OR REPLACE FUNCTION public.log_opportunities_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'delete', 'opportunities', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'update', 'opportunities', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'create', 'opportunities', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER opportunities_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.log_opportunities_changes();

-- Auto-actualizar updated_at en tablas de jobs
CREATE TRIGGER update_import_jobs_updated_at 
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_export_jobs_updated_at 
  BEFORE UPDATE ON public.export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();