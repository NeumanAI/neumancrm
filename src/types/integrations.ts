// Types for integrations and notifications

export type IntegrationProvider = 'gmail' | 'whatsapp' | 'manychat' | 'webchat';

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  is_active: boolean;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  last_synced_at?: string;
  sync_status: 'idle' | 'syncing' | 'error';
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ManyChat specific configuration
export interface ManyChatConfig {
  api_key_configured: boolean;
  channels_enabled: ManyChatChannel[];
  last_test_at?: string;
  test_status?: 'success' | 'error' | 'pending';
}

export type ManyChatChannel = 'whatsapp' | 'instagram' | 'messenger';

// Webchat specific configuration
export interface WebchatConfig {
  widget_enabled: boolean;
  n8n_webhook_url?: string;
  widget_config: WebchatWidgetConfig;
}

export interface WebchatWidgetConfig {
  position: 'bottom-right' | 'bottom-left';
  primary_color: string;
  welcome_message: string;
  bot_name?: string;
  bot_avatar?: string;
}

// Gmail specific configuration (for reference)
export interface GmailConfig {
  email?: string;
  sync_frequency?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_due' | 'deal_update' | 'new_contact' | 'email_sync' | 'system';
  title: string;
  message?: string;
  entity_type?: 'contact' | 'company' | 'opportunity' | 'task';
  entity_id?: string;
  is_read: boolean;
  action_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  task_reminders: boolean;
  deal_updates: boolean;
  new_contacts: boolean;
  email_sync: boolean;
  browser_notifications: boolean;
  email_notifications: boolean;
  reminder_hours: number;
  created_at: string;
  updated_at: string;
}

// Helper type to extract config based on provider
export type IntegrationConfigMap = {
  gmail: GmailConfig;
  manychat: ManyChatConfig;
  webchat: WebchatConfig;
  whatsapp: Record<string, any>; // Legacy support
};
