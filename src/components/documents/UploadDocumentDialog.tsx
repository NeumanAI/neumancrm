import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentTypeSelect } from './DocumentTypeSelect';
import { formatFileSize } from '@/types/documents';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (params: { file: File; documentType: string; description?: string; tags?: string[] }) => void;
  isUploading: boolean;
  title?: string;
  description?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onUpload,
  isUploading,
  title = 'Subir documento',
  description: dialogDescription = 'Sube un documento al repositorio.',
}: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('other');
  const [desc, setDesc] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      const r = rejectedFiles[0];
      if (r.errors[0]?.code === 'file-too-large') setError('El archivo es demasiado grande. Máximo 25 MB.');
      else if (r.errors[0]?.code === 'file-invalid-type') setError('Tipo de archivo no permitido.');
      return;
    }
    if (acceptedFiles.length > 0) setSelectedFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    onUpload({ file: selectedFile, documentType, description: desc.trim() || undefined, tags: tags.length > 0 ? tags : undefined });
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setDocumentType('other');
      setDesc('');
      setTagsInput('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-medium">Suelta el archivo aquí...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">Arrastra un archivo o haz click para seleccionar</p>
                  <p className="text-sm text-muted-foreground">PDF, Word, Excel, PowerPoint o imágenes. Máximo 25 MB.</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <FileText className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setError(null); }} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <DocumentTypeSelect value={documentType} onValueChange={setDocumentType} disabled={isUploading} />
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Contrato de servicios firmado" disabled={isUploading} />
          </div>

          <div className="space-y-2">
            <Label>Tags (opcional, separados por coma)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Ej: urgente, Q1, renovación" disabled={isUploading} />
          </div>

          {isUploading && <Progress value={undefined} className="h-2" />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subiendo...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Subir documento</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
