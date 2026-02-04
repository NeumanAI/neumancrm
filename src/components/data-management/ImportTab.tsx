import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileSpreadsheet, 
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useImportJobs } from '@/hooks/useImportJobs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  EntityType, 
  ENTITY_FIELDS, 
  COLUMN_MAPPING_DICTIONARY,
  ImportSettings 
} from '@/types/data-management';
import ColumnMappingDialog from './ColumnMappingDialog';
import DataPreviewTable from './DataPreviewTable';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ImportTab() {
  const [selectedType, setSelectedType] = useState<EntityType>('contacts');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    update_existing: false,
    skip_duplicates: true,
    validate_emails: true,
    validate_phones: false,
  });

  const { importJobs, isLoading: loadingJobs, createImportJob } = useImportJobs();
  const { toast } = useToast();

  const autoMapColumns = useCallback((fileHeaders: string[]) => {
    const mapping: Record<string, string> = {};
    
    fileHeaders.forEach(header => {
      const normalized = header.toLowerCase().trim();
      if (COLUMN_MAPPING_DICTIONARY[normalized]) {
        mapping[header] = COLUMN_MAPPING_DICTIONARY[normalized];
      }
    });
    
    setColumnMapping(mapping);
  }, []);

  const parseFile = useCallback((file: File) => {
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    
    if (isCSV) {
      Papa.parse(file, {
        preview: 6,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(results.meta.fields || []);
          setPreview(results.data as Record<string, unknown>[]);
          autoMapColumns(results.meta.fields || []);
        },
        error: (error) => {
          toast({
            title: 'Error al leer archivo',
            description: error.message,
            variant: 'destructive',
          });
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
          
          if (rawData.length > 0) {
            const fileHeaders = (rawData[0] as unknown[]).map(String);
            const rows = rawData.slice(1, 6).map(row => {
              const obj: Record<string, unknown> = {};
              fileHeaders.forEach((header, index) => {
                obj[header] = (row as unknown[])[index];
              });
              return obj;
            });
            
            setHeaders(fileHeaders);
            setPreview(rows);
            autoMapColumns(fileHeaders);
          }
        } catch (error) {
          toast({
            title: 'Error al leer archivo Excel',
            description: 'El archivo no tiene un formato válido.',
            variant: 'destructive',
          });
        }
      };
      reader.readAsBinaryString(file);
    }
  }, [autoMapColumns, toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      parseFile(file);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024, // 10 MB
    multiple: false,
  });

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);

    try {
      // Get full data from file
      const fullData = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        if (file.name.toLowerCase().endsWith('.csv')) {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data as Record<string, unknown>[]),
            error: reject,
          });
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            const workbook = XLSX.read(e.target?.result, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
            resolve(data);
          };
          reader.onerror = reject;
          reader.readAsBinaryString(file);
        }
      });

      // Create import job
      const job = await createImportJob.mutateAsync({
        filename: file.name,
        fileSize: file.size,
        entityType: selectedType,
        columnMapping,
        importSettings,
        totalRows: fullData.length,
      });

      // Process import via edge function
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('process-import', {
        body: {
          job_id: job.id,
          entity_type: selectedType,
          data: fullData,
          column_mapping: columnMapping,
          settings: importSettings,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Importación iniciada',
        description: `Procesando ${fullData.length} registros...`,
      });

      // Reset form
      setFile(null);
      setPreview([]);
      setHeaders([]);
      setColumnMapping({});

    } catch (error: any) {
      toast({
        title: 'Error al importar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
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
      case 'cancelled':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  const downloadTemplate = () => {
    const fields = ENTITY_FIELDS[selectedType];
    const headers = fields.map(f => f.label);
    const csv = Papa.unparse([headers, Array(headers.length).fill('')]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla_${selectedType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Datos
          </CardTitle>
          <CardDescription>
            Sube un archivo CSV o Excel para importar datos a tu CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Entity Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Paso 1: Selecciona qué quieres importar</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as EntityType)}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contacts" id="contacts" />
                <Label htmlFor="contacts">Contactos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="companies" id="companies" />
                <Label htmlFor="companies">Empresas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="opportunities" id="opportunities" />
                <Label htmlFor="opportunities">Oportunidades</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="activities" id="activities" />
                <Label htmlFor="activities">Actividades</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Step 2: File Upload */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Paso 2: Sube tu archivo</Label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra archivo aquí o haz click'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formatos: CSV, Excel (.xlsx, .xls) · Máximo: 10 MB
                  </p>
                </div>
              )}
            </div>
            <Button variant="link" onClick={downloadTemplate} className="p-0 h-auto">
              <Download className="h-4 w-4 mr-1" />
              Descargar plantilla de ejemplo
            </Button>
          </div>

          {/* Step 3: Preview */}
          {preview.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Paso 3: Vista previa y mapeo de columnas</Label>
                  <Button variant="outline" size="sm" onClick={() => setShowMappingDialog(true)}>
                    Editar mapeo
                  </Button>
                </div>
                <DataPreviewTable 
                  data={preview} 
                  headers={headers}
                  columnMapping={columnMapping}
                  entityType={selectedType}
                />
                <p className="text-sm text-muted-foreground">
                  Mostrando {preview.length} de las primeras filas. {Object.keys(columnMapping).length} columnas mapeadas automáticamente.
                </p>
              </div>
            </>
          )}

          {/* Step 4: Options */}
          {preview.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold">Paso 4: Opciones de importación</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="update_existing"
                      checked={importSettings.update_existing}
                      onCheckedChange={(checked) => 
                        setImportSettings(prev => ({ ...prev, update_existing: !!checked }))
                      }
                    />
                    <Label htmlFor="update_existing">Actualizar registros existentes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skip_duplicates"
                      checked={importSettings.skip_duplicates}
                      onCheckedChange={(checked) => 
                        setImportSettings(prev => ({ ...prev, skip_duplicates: !!checked }))
                      }
                    />
                    <Label htmlFor="skip_duplicates">Saltar duplicados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="validate_emails"
                      checked={importSettings.validate_emails}
                      onCheckedChange={(checked) => 
                        setImportSettings(prev => ({ ...prev, validate_emails: !!checked }))
                      }
                    />
                    <Label htmlFor="validate_emails">Validar formato de emails</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="validate_phones"
                      checked={importSettings.validate_phones}
                      onCheckedChange={(checked) => 
                        setImportSettings(prev => ({ ...prev, validate_phones: !!checked }))
                      }
                    />
                    <Label htmlFor="validate_phones">Validar formato de teléfonos</Label>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleImport} 
                disabled={isImporting || Object.keys(columnMapping).length === 0}
                className="w-full md:w-auto"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Iniciar Importación
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Importaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : importJobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay importaciones recientes
            </p>
          ) : (
            <div className="space-y-3">
              {importJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{job.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.successful_rows}/{job.total_rows} registros · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'processing' && (
                      <Progress value={job.progress} className="w-24" />
                    )}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping Dialog */}
      <ColumnMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        headers={headers}
        columnMapping={columnMapping}
        onMappingChange={setColumnMapping}
        entityType={selectedType}
      />
    </div>
  );
}
