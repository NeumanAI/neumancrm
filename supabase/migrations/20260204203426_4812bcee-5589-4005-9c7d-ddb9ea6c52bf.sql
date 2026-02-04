-- ============================================
-- MÓDULO DE CONVERSACIONES OMNICANAL
-- ============================================

-- Tabla principal de conversaciones
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Canal de comunicación
  channel TEXT NOT NULL CHECK (channel IN ('webchat', 'whatsapp', 'instagram', 'messenger', 'email')),
  
  -- Identificadores externos
  external_id TEXT, -- session_id, subscriber_id, thread_id, etc.
  external_name TEXT,
  external_email TEXT,
  external_phone TEXT,
  external_avatar TEXT,
  
  -- Estado de la conversación
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  assigned_to UUID,
  
  -- Métricas
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  
  -- Datos adicionales
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX idx_conversations_channel ON public.conversations(channel);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_external_id ON public.conversations(external_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- Índice único para evitar duplicados por canal + external_id + user_id
CREATE UNIQUE INDEX idx_conversations_unique_external 
  ON public.conversations(user_id, channel, external_id) 
  WHERE external_id IS NOT NULL;

-- Tabla de mensajes
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  
  -- Contenido
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'location', 'sticker')),
  attachment_url TEXT,
  
  -- Origen del mensaje
  is_from_contact BOOLEAN NOT NULL DEFAULT true, -- true = cliente, false = agente/bot
  sender_name TEXT,
  sender_id TEXT, -- ID del agente o bot que envió
  
  -- Flags
  is_bot BOOLEAN DEFAULT false,
  is_internal_note BOOLEAN DEFAULT false, -- Notas internas no visibles al cliente
  
  -- Estado de lectura
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Datos adicionales (respuestas rápidas, botones, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mensajes
CREATE INDEX idx_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.conversation_messages(created_at DESC);
CREATE INDEX idx_messages_is_from_contact ON public.conversation_messages(is_from_contact);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para conversations (multi-tenant por organización)
CREATE POLICY "Users can view org conversations"
  ON public.conversations
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org conversations"
  ON public.conversations
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org conversations"
  ON public.conversations
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND user_has_role('admin'::team_role));

-- Políticas para conversation_messages (basado en conversación)
CREATE POLICY "Users can view messages of org conversations"
  ON public.conversation_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert messages to org conversations"
  ON public.conversation_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can update messages of org conversations"
  ON public.conversation_messages
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE organization_id = get_user_organization_id()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para actualizar last_message en conversation cuando llega un mensaje
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    unread_count = CASE 
      WHEN NEW.is_from_contact = true THEN unread_count + 1 
      ELSE unread_count 
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_conversation_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_new_message();

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;