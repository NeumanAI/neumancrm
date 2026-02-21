import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Download, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { SharedDocumentInfo, formatFileSize, getCategoryInfo } from '@/types/documents';
import { CategoryBadge } from '@/components/documents/CategoryBadge';

export default function SharedDocument() {
  const { token } = useParams<{ token: string }>();
  const [document, setDocument] = useState<SharedDocumentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_shared_document', { p_token: token });
        if (rpcError) throw rpcError;
        if (!data || data.length === 0) {
          setError('Documento no encontrado o enlace expirado.');
          return;
        }
        setDocument(data[0] as SharedDocumentInfo);
      } catch (err) {
        console.error('Error fetching shared document:', err);
        setError('Error al cargar el documento.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [token]);

  const handleDownload = async () => {
    if (!document) return;
    setIsDownloading(true);
    try {
      // Determine bucket based on source_table
      const bucket = document.source_table === 'org_documents' ? 'org-documents' : 'contact-documents';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(document.file_path, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Documento no disponible</h2>
            <p className="text-muted-foreground">{error || 'El enlace no es válido o ha expirado.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/neuman-logo.png" alt="NeumanCRM" className="h-10 w-10 mx-auto rounded-xl" />
          </div>
          <CardTitle className="text-lg">Documento compartido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
            <FileText className="h-10 w-10 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{document.file_name}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <CategoryBadge documentType={document.document_type} />
                <span>•</span>
                <span>{formatFileSize(document.file_size)}</span>
              </div>
              {document.description && (
                <p className="text-sm text-muted-foreground mt-2">{document.description}</p>
              )}
            </div>
          </div>

          {document.share_expires_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expira: {new Date(document.share_expires_at).toLocaleDateString('es')}</span>
            </div>
          )}

          <Button className="w-full" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparando descarga...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Descargar documento</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
