-- 1. Agregar campo whatsapp_number a contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 2. Crear tabla timeline_entries para historial de interacciones
CREATE TABLE IF NOT EXISTS timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('email', 'call', 'meeting', 'note', 'whatsapp', 'slack_message')),
  subject TEXT,
  body TEXT,
  summary TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT CHECK (source IN ('gmail', 'manual', 'whatsapp', 'slack', 'calendar')),
  participants JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_timeline_entries_user_id ON timeline_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_contact_id ON timeline_entries(contact_id);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_company_id ON timeline_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_opportunity_id ON timeline_entries(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_occurred_at ON timeline_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_entry_type ON timeline_entries(entry_type);

-- 4. Habilitar RLS
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

-- 5. Política RLS para que usuarios solo vean sus propias entradas
CREATE POLICY "Users see own timeline entries" ON timeline_entries
  FOR ALL USING (auth.uid() = user_id);

-- 6. Habilitar realtime para timeline_entries
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_entries;