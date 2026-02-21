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
  Share2,
  Loader2,
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
import { CategoryBadge } from './CategoryBadge';
import { formatFileSize } from '@/types/documents';

interface DocumentCardProps {
  document: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    document_type: string;
    description?: string;
    tags?: string[];
    is_shared?: boolean;
    share_token?: string;
    share_views?: number;
    created_at: string;
  };
  onDownload: (filePath: string) => Promise<string | null>;
  onDelete: (doc: any) => void;
  onShare?: (doc: any) => void;
  isDeleting?: boolean;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-8 w-8 text-blue-500" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('image')) return <Image className="h-8 w-8 text-purple-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

export function DocumentCard({ document, onDownload, onDelete, onShare, isDeleting }: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = await onDownload(document.file_path);
      if (url) window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">{getFileIcon(document.mime_type)}</div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{document.file_name}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
          <CategoryBadge documentType={document.document_type} />
          <span>•</span>
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true, locale: es })}
          </span>
          {document.is_shared && (
            <Badge variant="secondary" className="text-[10px] h-5">
              <Share2 className="h-3 w-3 mr-1" />
              {document.share_views || 0} vistas
            </Badge>
          )}
        </div>
        {document.tags && document.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {document.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] h-5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {document.description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{document.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onShare && (
          <Button variant="ghost" size="icon" onClick={() => onShare(document)}>
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
              <AlertDialogDescription>
                El documento "{document.file_name}" será eliminado permanentemente.
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
