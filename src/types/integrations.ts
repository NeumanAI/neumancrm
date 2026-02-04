// Types for integrations and notifications

export interface Integration {
  id: string;
  user_id: string;
  provider: 'gmail' | 'whatsapp';
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
