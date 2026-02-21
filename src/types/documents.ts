// Base document category definitions
export interface BaseDocumentCategory {
  value: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const BASE_DOCUMENT_CATEGORIES: BaseDocumentCategory[] = [
  { value: 'contract', label: 'Contrato', color: '#3B82F6', bgClass: 'bg-blue-500/10', textClass: 'text-blue-600', borderClass: 'border-blue-500/20' },
  { value: 'proposal', label: 'Propuesta', color: '#8B5CF6', bgClass: 'bg-purple-500/10', textClass: 'text-purple-600', borderClass: 'border-purple-500/20' },
  { value: 'quote', label: 'Cotización', color: '#EC4899', bgClass: 'bg-pink-500/10', textClass: 'text-pink-600', borderClass: 'border-pink-500/20' },
  { value: 'invoice', label: 'Factura', color: '#F97316', bgClass: 'bg-orange-500/10', textClass: 'text-orange-600', borderClass: 'border-orange-500/20' },
  { value: 'presentation', label: 'Presentación', color: '#14B8A6', bgClass: 'bg-teal-500/10', textClass: 'text-teal-600', borderClass: 'border-teal-500/20' },
  { value: 'nda', label: 'NDA', color: '#EF4444', bgClass: 'bg-red-500/10', textClass: 'text-red-600', borderClass: 'border-red-500/20' },
  { value: 'agreement', label: 'Acuerdo', color: '#22C55E', bgClass: 'bg-green-500/10', textClass: 'text-green-600', borderClass: 'border-green-500/20' },
  { value: 'other', label: 'Otro', color: '#6B7280', bgClass: 'bg-muted', textClass: 'text-muted-foreground', borderClass: 'border-muted' },
];

export interface CustomDocumentCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrgDocument {
  id: string;
  user_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  description?: string;
  tags: string[];
  is_shared: boolean;
  share_token?: string;
  share_expires_at?: string;
  share_views: number;
  created_at: string;
  updated_at: string;
}

export interface SharedDocumentInfo {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  description?: string;
  share_expires_at?: string;
  source_table: string;
}

export function getCategoryInfo(documentType: string, customCategories: CustomDocumentCategory[] = []): BaseDocumentCategory {
  const base = BASE_DOCUMENT_CATEGORIES.find(c => c.value === documentType);
  if (base) return base;

  const custom = customCategories.find(c => c.slug === documentType);
  if (custom) {
    return {
      value: custom.slug,
      label: custom.name,
      color: custom.color,
      bgClass: 'bg-muted',
      textClass: 'text-foreground',
      borderClass: 'border-muted',
    };
  }

  return BASE_DOCUMENT_CATEGORIES[BASE_DOCUMENT_CATEGORIES.length - 1]; // 'other'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
