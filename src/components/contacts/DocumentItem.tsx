import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, 
  FileSpreadsheet, 
  Image, 
  File, 
  Download, 
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ContactDocument } from '@/hooks/useContactDocuments';

interface DocumentItemProps {
  document: ContactDocument;
  onDownload: (filePath: string) => Promise<string | null>;
  onDelete: (document: ContactDocument) => void;
  isDeleting: boolean;
}

const documentTypeLabels: Record<string, { label: string; className: string }> = {
  contract: { label: 'Contrato', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  proposal: { label: 'Propuesta', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  agreement: { label: 'Acuerdo', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  invoice: { label: 'Factura', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  other: { label: 'Otro', className: 'bg-muted text-muted-foreground' },
};

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className="h-8 w-8 text-blue-500" />;
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  }
  if (mimeType.includes('image')) {
    return <Image className="h-8 w-8 text-purple-500" />;
  }
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DocumentItem({ document, onDownload, onDelete, isDeleting }: DocumentItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = await onDownload(document.file_path);
      if (url) {
        window.open(url, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const typeInfo = documentTypeLabels[document.document_type] || documentTypeLabels.other;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">
        {getFileIcon(document.mime_type)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{document.file_name}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <Badge variant="outline" className={typeInfo.className}>
            {typeInfo.label}
          </Badge>
          <span>•</span>
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(document.created_at), { 
              addSuffix: true, 
              locale: es 
            })}
          </span>
        </div>
        {document.description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {document.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El documento "{document.file_name}" 
                será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(document)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
