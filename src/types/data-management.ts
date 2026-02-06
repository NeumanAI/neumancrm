// Data Management Types

export type EntityType = 'contacts' | 'companies' | 'opportunities' | 'activities';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
export type ExportFormat = 'csv' | 'xlsx' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DuplicateStatus = 'pending' | 'merged' | 'dismissed' | 'ignored';
export type DuplicateEntityType = 'contacts' | 'companies';
export type AuditAction = 'create' | 'update' | 'delete' | 'merge' | 'bulk_update' | 'bulk_delete' | 'import' | 'export';
export type BackupType = 'manual' | 'automatic' | 'scheduled';
export type BackupStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportError {
  row: number;
  field: string;
  error: string;
  value?: string;
}

export interface ImportSettings {
  update_existing: boolean;
  skip_duplicates: boolean;
  validate_emails: boolean;
  validate_phones: boolean;
}

export interface ImportJob {
  id: string;
  user_id: string;
  filename: string;
  file_size?: number;
  entity_type: EntityType;
  status: ImportStatus;
  progress: number;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  errors?: ImportError[];
  import_settings?: ImportSettings;
  column_mapping?: Record<string, string>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExportFilters {
  date_from?: string;
  date_to?: string;
  modified_recently?: boolean;
}

export interface ExportJob {
  id: string;
  user_id: string;
  entity_type: string;
  format: ExportFormat;
  filters?: ExportFilters;
  status: ExportStatus;
  progress: number;
  total_records: number;
  file_url?: string;
  file_size?: number;
  expires_at?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface Duplicate {
  id: string;
  user_id: string;
  entity_type: DuplicateEntityType;
  entity_id_1: string;
  entity_id_2: string;
  similarity_score: number;
  matching_fields: string[];
  status: DuplicateStatus;
  merged_into?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  // Populated from joins
  entity_1?: Record<string, unknown>;
  entity_2?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Backup {
  id: string;
  user_id: string;
  backup_type: BackupType;
  includes: string[];
  file_url: string;
  file_size?: number;
  status: BackupStatus;
  total_records?: number;
  created_at: string;
  expires_at?: string;
}

// Column mapping for imports
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  isRequired: boolean;
  sample?: string;
}

// Field definitions for each entity
export const ENTITY_FIELDS: Record<EntityType, { field: string; label: string; required: boolean }[]> = {
  contacts: [
    { field: 'first_name', label: 'Nombre', required: false },
    { field: 'last_name', label: 'Apellido', required: false },
    { field: 'email', label: 'Email', required: true },
    { field: 'phone', label: 'Teléfono', required: false },
    { field: 'mobile', label: 'Celular', required: false },
    { field: 'job_title', label: 'Cargo', required: false },
    { field: 'department', label: 'Departamento', required: false },
    { field: 'notes', label: 'Notas', required: false },
    { field: 'linkedin_url', label: 'LinkedIn', required: false },
    { field: 'twitter_url', label: 'Twitter', required: false },
  ],
  companies: [
    { field: 'name', label: 'Nombre', required: true },
    { field: 'domain', label: 'Dominio', required: false },
    { field: 'website', label: 'Sitio Web', required: false },
    { field: 'industry', label: 'Industria', required: false },
    { field: 'phone', label: 'Teléfono', required: false },
    { field: 'address', label: 'Dirección', required: false },
    { field: 'city', label: 'Ciudad', required: false },
    { field: 'country', label: 'País', required: false },
    { field: 'employee_count', label: 'Empleados', required: false },
    { field: 'revenue', label: 'Ingresos', required: false },
    { field: 'description', label: 'Descripción', required: false },
  ],
  opportunities: [
    { field: 'title', label: 'Título', required: true },
    { field: 'value', label: 'Valor', required: false },
    { field: 'currency', label: 'Moneda', required: false },
    { field: 'probability', label: 'Probabilidad', required: false },
    { field: 'status', label: 'Estado', required: false },
    { field: 'expected_close_date', label: 'Fecha Cierre Esperada', required: false },
    { field: 'description', label: 'Descripción', required: false },
  ],
  activities: [
    { field: 'title', label: 'Título', required: true },
    { field: 'type', label: 'Tipo', required: true },
    { field: 'description', label: 'Descripción', required: false },
    { field: 'due_date', label: 'Fecha Vencimiento', required: false },
    { field: 'priority', label: 'Prioridad', required: false },
    { field: 'completed', label: 'Completado', required: false },
  ],
};

// Auto-mapping dictionary for column names
export const COLUMN_MAPPING_DICTIONARY: Record<string, string> = {
  // Spanish mappings
  'nombre': 'first_name',
  'apellido': 'last_name',
  'correo': 'email',
  'correo electrónico': 'email',
  'teléfono': 'phone',
  'telefono': 'phone',
  'celular': 'mobile',
  'móvil': 'mobile',
  'movil': 'mobile',
  'cargo': 'job_title',
  'puesto': 'job_title',
  'departamento': 'department',
  'empresa': 'company_name',
  'compañía': 'company_name',
  'compania': 'company_name',
  'notas': 'notes',
  'comentarios': 'notes',
  'sitio web': 'website',
  'página web': 'website',
  'pagina web': 'website',
  'industria': 'industry',
  'sector': 'industry',
  'dirección': 'address',
  'direccion': 'address',
  'ciudad': 'city',
  'país': 'country',
  'pais': 'country',
  'empleados': 'employee_count',
  'número de empleados': 'employee_count',
  'ingresos': 'revenue',
  'descripción': 'description',
  'descripcion': 'description',
  'título': 'title',
  'titulo': 'title',
  'valor': 'value',
  'monto': 'value',
  'moneda': 'currency',
  'probabilidad': 'probability',
  'estado': 'status',
  'fecha cierre': 'expected_close_date',
  'fecha de cierre': 'expected_close_date',
  'tipo': 'type',
  'prioridad': 'priority',
  'fecha vencimiento': 'due_date',
  'fecha de vencimiento': 'due_date',
  'completado': 'completed',
  
  // English mappings
  'first name': 'first_name',
  'firstname': 'first_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'name': 'name',
  'email': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'telephone': 'phone',
  'mobile': 'mobile',
  'cell': 'mobile',
  'cellphone': 'mobile',
  'job title': 'job_title',
  'position': 'job_title',
  'role': 'job_title',
  'department': 'department',
  'company': 'company_name',
  'organization': 'company_name',
  'notes': 'notes',
  'comments': 'notes',
  'website': 'website',
  'web': 'website',
  'url': 'website',
  'industry': 'industry',
  'address': 'address',
  'street': 'address',
  'city': 'city',
  'country': 'country',
  'employees': 'employee_count',
  'employee count': 'employee_count',
  'revenue': 'revenue',
  'annual revenue': 'revenue',
  'description': 'description',
  'title': 'title',
  'deal name': 'title',
  'opportunity name': 'title',
  'value': 'value',
  'amount': 'value',
  'deal value': 'value',
  'currency': 'currency',
  'probability': 'probability',
  'status': 'status',
  'stage': 'status',
  'close date': 'expected_close_date',
  'expected close date': 'expected_close_date',
  'type': 'type',
  'priority': 'priority',
  'due date': 'due_date',
  'deadline': 'due_date',
  'completed': 'completed',
  'done': 'completed',
  'linkedin': 'linkedin_url',
  'linkedin url': 'linkedin_url',
  'twitter': 'twitter_url',
  'twitter url': 'twitter_url',
  'domain': 'domain',
};
