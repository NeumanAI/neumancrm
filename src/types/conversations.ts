// Types for Omnichannel Conversations Module

export type ConversationChannel = 'webchat' | 'whatsapp' | 'instagram' | 'messenger' | 'email';

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'archived';

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'sticker';

export interface Conversation {
  id: string;
  user_id: string;
  organization_id?: string;
  contact_id?: string;
  channel: ConversationChannel;
  external_id?: string;
  external_name?: string;
  external_email?: string;
  external_phone?: string;
  external_avatar?: string;
  status: ConversationStatus;
  assigned_to?: string;
  unread_count: number;
  last_message_at?: string;
  last_message_preview?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  contacts?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    avatar_url?: string;
  };
  assigned_member?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  content?: string;
  message_type: MessageType;
  attachment_url?: string;
  is_from_contact: boolean;
  sender_name?: string;
  sender_id?: string;
  is_bot: boolean;
  is_internal_note: boolean;
  read_at?: string;
  delivered_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ConversationFilters {
  channel?: ConversationChannel;
  status?: ConversationStatus;
  assigned_to?: string;
  search?: string;
}

// Channel display configuration
export const CHANNEL_CONFIG: Record<ConversationChannel, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  webchat: {
    label: 'Webchat',
    icon: 'MessageCircle',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'MessageSquare',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  instagram: {
    label: 'Instagram',
    icon: 'Instagram',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  messenger: {
    label: 'Messenger',
    icon: 'Facebook',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

export const STATUS_CONFIG: Record<ConversationStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  open: {
    label: 'Abierta',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  resolved: {
    label: 'Resuelta',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  archived: {
    label: 'Archivada',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
};
