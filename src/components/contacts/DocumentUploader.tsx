import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContactDocument } from '@/hooks/useContactDocuments';

interface DocumentUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (params: {
    file: File;
    documentType: ContactDocument['document_type'];
    description?: string;
  }) => void;
  isUploading: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const documentTypes = [
  { value: 'contract', label: 'Contrato' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'agreement', label: 'Acuerdo' },
  { value: 'invoice', label: 'Factura' },
  { value: 'other', label: 'Otro' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DocumentUploader({ open, onOpenChange, onUpload, isUploading }: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<ContactDocument['document_type']>('other');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('El archivo es demasiado grande. Máximo 10 MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Tipo de archivo no permitido. Use PDF, Word, Excel o imágenes.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    onUpload({
      file: selectedFile,
      documentType,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setDocumentType('other');
      setDescription('');
      setError(null);
      onOpenChange(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            Sube un contrato, propuesta, acuerdo u otro documento asociado a este contacto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-medium">Suelta el archivo aquí...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    Arrastra un archivo o haz click para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, Word, Excel o imágenes. Máximo 10 MB.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <FileText className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="document-type">Tipo de documento</Label>
            <Select 
              value={documentType} 
              onValueChange={(v) => setDocumentType(v as ContactDocument['document_type'])}
              disabled={isUploading}
            >
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Contrato de servicios firmado"
              disabled={isUploading}
            />
          </div>

          {isUploading && (
            <Progress value={undefined} className="h-2" />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir documento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
