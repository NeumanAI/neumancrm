export interface Company {
  id: string;
  user_id: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  employee_count?: number;
  revenue?: number;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  linkedin_url?: string;
  twitter_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  company_id?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  whatsapp_number?: string;
  job_title?: string;
  department?: string;
  linkedin_url?: string;
  twitter_url?: string;
  avatar_url?: string;
  notes?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
  companies?: Pick<Company, 'id' | 'name' | 'logo_url'>;
}

export interface Pipeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string;
  probability: number;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
}

export interface Opportunity {
  id: string;
  user_id: string;
  company_id?: string;
  contact_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  closed_at?: string;
  status: 'open' | 'won' | 'lost';
  lost_reason?: string;
  created_at: string;
  updated_at: string;
  companies?: Company;
  contacts?: Contact;
  stages?: Stage;
}

export interface Activity {
  id: string;
  user_id: string;
  type: 'task' | 'call' | 'email' | 'meeting' | 'note';
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contact_id?: string;
  company_id?: string;
  opportunity_id?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact;
  companies?: Company;
  opportunities?: Opportunity;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title?: string;
  messages: ChatMessage[];
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Branding {
  id: string;
  user_id: string;
  company_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  id: string;
  user_id: string;
  contact_id?: string;
  company_id?: string;
  opportunity_id?: string;
  entry_type: 'email' | 'call' | 'meeting' | 'note' | 'whatsapp' | 'task';
  source?: string;
  subject?: string;
  body?: string;
  summary?: string;
  participants?: { name: string; email?: string }[];
  action_items?: { text: string; completed: boolean }[];
  metadata?: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  contacts?: Contact;
  companies?: Company;
  opportunities?: Opportunity;
}

export interface ContactDocument {
  id: string;
  user_id: string;
  contact_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'contract' | 'proposal' | 'agreement' | 'invoice' | 'other';
  description?: string;
  created_at: string;
}

export interface CompanyDocument {
  id: string;
  user_id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'contract' | 'proposal' | 'agreement' | 'invoice' | 'other';
  description?: string;
  created_at: string;
}
