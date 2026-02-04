import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ClipboardList, 
  Loader2,
  CalendarIcon,
  Download,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AuditAction, AuditLogEntry } from '@/types/data-management';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'create', label: 'Crear' },
  { value: 'update', label: 'Actualizar' },
  { value: 'delete', label: 'Eliminar' },
  { value: 'merge', label: 'Fusionar' },
  { value: 'bulk_update', label: 'Actualización masiva' },
  { value: 'bulk_delete', label: 'Eliminación masiva' },
  { value: 'import', label: 'Importar' },
  { value: 'export', label: 'Exportar' },
];

const ENTITY_OPTIONS = [
  { value: 'contacts', label: 'Contactos' },
  { value: 'companies', label: 'Empresas' },
  { value: 'opportunities', label: 'Oportunidades' },
  { value: 'activities', label: 'Actividades' },
];

export default function AuditLogTab() {
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>();
  const [entityFilter, setEntityFilter] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { auditLog, isLoading, getEntityName, getChangedFields, formatAction, formatEntityType } = useAuditLog({
    action: actionFilter,
    entityType: entityFilter,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
    limit: 100,
  });

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'update':
      case 'bulk_update':
        return <Pencil className="h-4 w-4 text-blue-500" />;
      case 'delete':
      case 'bulk_delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'merge':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'import':
        return <Download className="h-4 w-4 text-orange-500 rotate-180" />;
      case 'export':
        return <Download className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'contacts':
        return <Users className="h-4 w-4" />;
      case 'companies':
        return <Building2 className="h-4 w-4" />;
      case 'opportunities':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleExportLog = () => {
    const data = auditLog.map(entry => ({
      'Fecha': format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Acción': formatAction(entry.action),
      'Entidad': formatEntityType(entry.entity_type),
      'Nombre': getEntityName(entry),
      'Campos modificados': entry.action === 'update' 
        ? getChangedFields(entry).map(c => c.field).join(', ')
        : '',
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setActionFilter(undefined);
    setEntityFilter(undefined);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = actionFilter || entityFilter || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Registro de Auditoría
              </CardTitle>
              <CardDescription>
                Historial completo de cambios en tu CRM
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportLog} disabled={auditLog.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Log
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select
              value={actionFilter}
              onValueChange={(value) => setActionFilter(value as AuditAction)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={entityFilter}
              onValueChange={setEntityFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP", { locale: es }) : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP", { locale: es }) : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>

          <Separator />

          {/* Log Entries */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auditLog.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay registros de auditoría</p>
              <p className="text-sm text-muted-foreground mt-1">
                Los cambios en el CRM aparecerán aquí automáticamente
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLog.map((entry) => {
                const changedFields = getChangedFields(entry);
                
                return (
                  <div key={entry.id} className="flex gap-4 p-4 rounded-lg border">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(entry.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium capitalize">
                          {formatAction(entry.action)}
                        </span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getEntityIcon(entry.entity_type)}
                          {formatEntityType(entry.entity_type)}
                        </Badge>
                        <span className="font-medium text-primary">
                          "{getEntityName(entry)}"
                        </span>
                      </div>
                      
                      {changedFields.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {changedFields.slice(0, 3).map((change, i) => (
                            <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="font-medium">{change.field}:</span>
                              <span className="line-through">{String(change.oldValue || '(vacío)')}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{String(change.newValue || '(vacío)')}</span>
                            </div>
                          ))}
                          {changedFields.length > 3 && (
                            <span className="text-sm text-muted-foreground">
                              +{changedFields.length - 3} campos más
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
