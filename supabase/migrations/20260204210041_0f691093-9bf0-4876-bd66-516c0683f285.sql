-- Agregar campos de origen y tracking a contacts para auto-creación de leads
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_id text,
ADD COLUMN IF NOT EXISTS instagram_username text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Índices para búsqueda rápida en matching de contactos
CREATE INDEX IF NOT EXISTS idx_contacts_source_id ON public.contacts(source_id);
CREATE INDEX IF NOT EXISTS idx_contacts_instagram_username ON public.contacts(instagram_username);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_number ON public.contacts(whatsapp_number);