import { useOutletContext } from 'react-router-dom';
import { usePortalDocuments, type PortalSession } from '@/hooks/useClientPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DOC_LABELS: Record<string, string> = {
  contract: 'Contrato',
  receipt: 'Recibo de pago',
  deed: 'Escritura',
  promise: 'Promesa de compraventa',
  other: 'Documento',
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function PortalDocumentos() {
  const session = useOutletContext<PortalSession>();
  const { data: documents = [], isLoading } = usePortalDocuments(session.contact_id, session.organization_id);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!documents.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="font-medium">No hay documentos compartidos</p>
        <p className="text-sm text-muted-foreground">Tu asesor compartirá documentos aquí cuando estén listos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Mis Documentos</h2>

      <div className="space-y-3">
        {documents.map(doc => (
          <Card key={doc.id}>
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_LABELS[doc.document_type] || doc.document_type} · {fmtSize(doc.file_size)} · {format(new Date(doc.created_at), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
              {doc.share_token && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/shared/${doc.share_token}`, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Ver
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
