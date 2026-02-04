import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuditLogEntry, AuditAction } from '@/types/data-management';

interface AuditLogFilters {
  action?: AuditAction;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export function useAuditLog(filters: AuditLogFilters = {}) {
  const { action, entityType, dateFrom, dateTo, limit = 50 } = filters;

  const { data: auditLog = [], isLoading, error, refetch } = useQuery({
    queryKey: ['audit-log', action, entityType, dateFrom, dateTo, limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (action) {
        query = query.eq('action', action);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as AuditLogEntry[];
    },
  });

  const getEntityName = (entry: AuditLogEntry): string => {
    if (entry.new_values) {
      const values = entry.new_values as Record<string, unknown>;
      if (values.name) return String(values.name);
      if (values.title) return String(values.title);
      if (values.first_name && values.last_name) {
        return `${values.first_name} ${values.last_name}`;
      }
      if (values.email) return String(values.email);
    }
    if (entry.old_values) {
      const values = entry.old_values as Record<string, unknown>;
      if (values.name) return String(values.name);
      if (values.title) return String(values.title);
      if (values.first_name && values.last_name) {
        return `${values.first_name} ${values.last_name}`;
      }
      if (values.email) return String(values.email);
    }
    return entry.entity_id || 'Desconocido';
  };

  const getChangedFields = (entry: AuditLogEntry): { field: string; oldValue: unknown; newValue: unknown }[] => {
    if (entry.action !== 'update' || !entry.old_values || !entry.new_values) {
      return [];
    }

    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    const oldValues = entry.old_values as Record<string, unknown>;
    const newValues = entry.new_values as Record<string, unknown>;

    for (const key of Object.keys(newValues)) {
      if (key === 'updated_at') continue;
      
      const oldVal = oldValues[key];
      const newVal = newValues[key];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    return changes;
  };

  const formatAction = (action: AuditAction): string => {
    const actionLabels: Record<AuditAction, string> = {
      create: 'creó',
      update: 'actualizó',
      delete: 'eliminó',
      merge: 'fusionó',
      bulk_update: 'actualizó masivamente',
      bulk_delete: 'eliminó masivamente',
      import: 'importó',
      export: 'exportó',
    };
    return actionLabels[action] || action;
  };

  const formatEntityType = (entityType: string): string => {
    const entityLabels: Record<string, string> = {
      contacts: 'contacto',
      companies: 'empresa',
      opportunities: 'oportunidad',
      activities: 'actividad',
    };
    return entityLabels[entityType] || entityType;
  };

  return {
    auditLog,
    isLoading,
    error,
    refetch,
    getEntityName,
    getChangedFields,
    formatAction,
    formatEntityType,
  };
}
