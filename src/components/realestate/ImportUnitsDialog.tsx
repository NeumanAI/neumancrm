import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useRealEstateUnitTypes, PROPERTY_TYPE_OPTIONS, COMMERCIAL_STATUS_OPTIONS } from '@/hooks/useRealEstateUnitTypes';
import { toast } from 'sonner';

interface ParsedRow {
  name: string;
  property_type: string;
  nomenclature: string;
  floor_number: number | null;
  typology: string;
  bedrooms: number;
  bathrooms: number;
  area_m2: number | null;
  price: number | null;
  commercial_status: string;
  error?: string;
  isDuplicate?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const validPropertyTypes: string[] = PROPERTY_TYPE_OPTIONS.map(o => o.value);
const validStatuses: string[] = COMMERCIAL_STATUS_OPTIONS.map(o => o.value);

export function ImportUnitsDialog({ open, onOpenChange, projectId }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [resultSummary, setResultSummary] = useState({ success: 0, errors: 0 });
  const { unitTypes, createUnitType } = useRealEstateUnitTypes(projectId);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setProgress(0);
    setResultSummary({ success: 0, errors: 0 });
  };

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      const existingNomenclatures = new Set(unitTypes.map(u => u.nomenclature?.toLowerCase()).filter(Boolean));

      const parsed: ParsedRow[] = json.map((row) => {
        const name = String(row['Nombre'] || row['name'] || '').trim();
        const propertyType = String(row['Tipo'] || row['property_type'] || '').trim().toUpperCase();
        const nomenclature = String(row['Nomenclatura'] || row['nomenclature'] || '').trim();
        const floorNumber = row['Piso'] != null ? Number(row['Piso']) : (row['floor_number'] != null ? Number(row['floor_number']) : null);
        const typology = String(row['Tipología'] || row['typology'] || '').trim();
        const bedrooms = Number(row['Recámaras'] || row['bedrooms'] || 0);
        const bathrooms = Number(row['Baños'] || row['bathrooms'] || 0);
        const area = row['Área m²'] != null ? Number(row['Área m²']) : (row['area_m2'] != null ? Number(row['area_m2']) : null);
        const price = row['Precio'] != null ? Number(row['Precio']) : (row['price'] != null ? Number(row['price']) : null);
        const status = String(row['Estado'] || row['commercial_status'] || 'Disponible').trim();

        let error: string | undefined;
        if (!name) error = 'Nombre requerido';
        else if (propertyType && !validPropertyTypes.includes(propertyType)) error = `Tipo inválido: ${propertyType}`;
        else if (status && !validStatuses.includes(status)) error = `Estado inválido: ${status}`;

        const isDuplicate = nomenclature ? existingNomenclatures.has(nomenclature.toLowerCase()) : false;

        return {
          name, property_type: propertyType || '', nomenclature,
          floor_number: floorNumber, typology, bedrooms, bathrooms,
          area_m2: area, price, commercial_status: status || 'Disponible',
          error, isDuplicate,
        };
      });

      setRows(parsed);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  }, [unitTypes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const template = [
      { Nombre: 'Apto 101', Tipo: 'APTO', Nomenclatura: 'A-101', Piso: 1, 'Tipología': '2 Hab', 'Recámaras': 2, 'Baños': 2, 'Área m²': 65, Precio: 250000, Estado: 'Disponible' },
      { Nombre: 'Apto 201', Tipo: 'APTO', Nomenclatura: 'A-201', Piso: 2, 'Tipología': '3 Hab', 'Recámaras': 3, 'Baños': 2, 'Área m²': 85, Precio: 350000, Estado: 'Disponible' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Unidades');
    XLSX.writeFile(wb, 'plantilla_unidades.xlsx');
  };

  const validRows = rows.filter(r => !r.error && !r.isDuplicate);
  const errorRows = rows.filter(r => r.error);
  const duplicateRows = rows.filter(r => r.isDuplicate && !r.error);

  const handleImport = async () => {
    setStep('importing');
    let success = 0;
    let errors = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createUnitType.mutateAsync({
          project_id: projectId,
          name: row.name,
          property_type: row.property_type || null,
          nomenclature: row.nomenclature || null,
          floor_number: row.floor_number,
          typology: row.typology || null,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          area_m2: row.area_m2,
          price: row.price,
          commercial_status: row.commercial_status,
          total_count: 1,
          available_count: row.commercial_status === 'Disponible' ? 1 : 0,
        } as any);
        success++;
      } catch {
        errors++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResultSummary({ success, errors });
    setStep('done');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Unidades desde Excel</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Arrastra un archivo .xlsx aquí</p>
              <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
            </div>
            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Descargar plantilla Excel
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {validRows.length} válidas
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                  <X className="h-3 w-3 mr-1" /> {errorRows.length} con errores
                </Badge>
              )}
              {duplicateRows.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {duplicateRows.length} duplicadas
                </Badge>
              )}
            </div>

            <div className="max-h-64 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nomenclatura</TableHead>
                    <TableHead>Piso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row.error ? 'bg-red-500/5' : row.isDuplicate ? 'bg-amber-500/5' : ''}>
                      <TableCell className="text-sm">{row.name || '—'}</TableCell>
                      <TableCell className="text-sm">{row.property_type || '—'}</TableCell>
                      <TableCell className="text-sm">{row.nomenclature || '—'}</TableCell>
                      <TableCell className="text-sm">{row.floor_number ?? '—'}</TableCell>
                      <TableCell className="text-sm">{row.commercial_status}</TableCell>
                      <TableCell className="text-xs text-destructive">{row.error || (row.isDuplicate ? 'Duplicada' : '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar {validRows.length} unidades
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <p className="text-center font-medium">Importando unidades...</p>
            <Progress value={progress} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">{progress}%</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg font-semibold">Importación completada</p>
            <div className="flex justify-center gap-4">
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-sm">
                {resultSummary.success} exitosas
              </Badge>
              {resultSummary.errors > 0 && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 text-sm">
                  {resultSummary.errors} fallidas
                </Badge>
              )}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
