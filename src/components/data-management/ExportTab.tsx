import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Download, 
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarIcon,
  ExternalLink,
} from 'lucide-react';
import { useExportJobs } from '@/hooks/useExportJobs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ExportFormat, ExportFilters } from '@/types/data-management';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ENTITY_OPTIONS = [
  { id: 'contacts', label: 'Contactos' },
  { id: 'companies', label: 'Empresas' },
  { id: 'opportunities', label: 'Oportunidades' },
  { id: 'activities', label: 'Actividades' },
];

export default function ExportTab() {
  const [selectedEntities, setSelectedEntities] = useState<string[]>(['contacts']);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const { exportJobs, isLoading: loadingJobs, createExportJob } = useExportJobs();
  const { toast } = useToast();

  const toggleEntity = (entityId: string) => {
    setSelectedEntities(prev => 
      prev.includes(entityId)
        ? prev.filter(e => e !== entityId)
        : [...prev, entityId]
    );
  };

  const handleExport = async () => {
    if (selectedEntities.length === 0) {
      toast({
        title: 'Selecciona al menos una entidad',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const filters: ExportFilters = {};
      if (dateFrom) filters.date_from = dateFrom.toISOString();
      if (dateTo) filters.date_to = dateTo.toISOString();

      const job = await createExportJob.mutateAsync({
        entityTypes: selectedEntities,
        format: exportFormat,
        filters,
      });

      // Process export via edge function
      const response = await supabase.functions.invoke('process-export', {
        body: {
          job_id: job.id,
          entity_types: selectedEntities,
          format: exportFormat,
          filters,
        },
      });

      if (response.error) throw response.error;

      if (response.data?.file_url) {
        // Download the file
        window.open(response.data.file_url, '_blank');
        toast({
          title: 'Exportación completada',
          description: 'El archivo se descargará automáticamente.',
        });
      } else {
        toast({
          title: 'Exportación iniciada',
          description: 'Procesando datos...',
        });
      }

    } catch (error: any) {
      toast({
        title: 'Error al exportar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallido</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Procesando</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiresAt: string | undefined) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Datos
          </CardTitle>
          <CardDescription>
            Descarga tus datos en formato CSV, Excel o JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entity Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">¿Qué deseas exportar?</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ENTITY_OPTIONS.map((entity) => (
                <div key={entity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={entity.id}
                    checked={selectedEntities.includes(entity.id)}
                    onCheckedChange={() => toggleEntity(entity.id)}
                  />
                  <Label htmlFor={entity.id}>{entity.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Formato</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx">Excel (.xlsx)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Date Filters */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Filtros (opcional)</Label>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
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
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP", { locale: es }) : "Seleccionar fecha"}
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
              </div>
              {(dateFrom || dateTo) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedEntities.length === 0}
            className="w-full md:w-auto"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar Datos
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle>Exportaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : exportJobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay exportaciones recientes
            </p>
          ) : (
            <div className="space-y-3">
              {exportJobs.map((job) => {
                const daysLeft = getDaysUntilExpiry(job.expires_at);
                return (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          export-{format(new Date(job.created_at), 'yyyy-MM-dd')}.{job.format}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {job.entity_type.split(',').join(', ')} · {job.total_records} registros
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.status === 'completed' && job.file_url && (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <a href={job.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Descargar
                            </a>
                          </Button>
                          {daysLeft !== null && (
                            <span className="text-xs text-muted-foreground">
                              Expira en {daysLeft} días
                            </span>
                          )}
                        </>
                      )}
                      {getStatusBadge(job.status)}
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
