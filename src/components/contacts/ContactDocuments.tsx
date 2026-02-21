import { useState } from 'react';
import { Plus, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useContactDocuments, ContactDocument } from '@/hooks/useContactDocuments';
import { DocumentItem } from './DocumentItem';
import { DocumentUploader } from './DocumentUploader';
import { DocumentTypeSelect } from '@/components/documents/DocumentTypeSelect';

interface ContactDocumentsProps {
  contactId: string;
}

export function ContactDocuments({ contactId }: ContactDocumentsProps) {
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { 
    documents, 
    isLoading, 
    uploadDocument, 
    deleteDocument, 
    getDownloadUrl 
  } = useContactDocuments(contactId);

  const filteredDocuments = typeFilter === 'all' 
    ? documents 
    : documents.filter(d => d.document_type === typeFilter);

  const handleUpload = async (params: {
    file: File;
    documentType: string;
    description?: string;
  }) => {
    await uploadDocument.mutateAsync({
      contactId,
      file: params.file,
      documentType: params.documentType,
      description: params.description,
    });
    setUploaderOpen(false);
  };

  const handleDelete = async (document: ContactDocument) => {
    setDeletingId(document.id);
    try {
      await deleteDocument.mutateAsync(document);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <DocumentTypeSelect value={typeFilter} onValueChange={setTypeFilter} includeAll className="w-40" />
        </div>

        <Button onClick={() => setUploaderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Subir documento
        </Button>
      </div>

      {/* Documents list */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Sin documentos"
          description={
            typeFilter === 'all'
              ? "Este contacto no tiene documentos. Sube contratos, propuestas o acuerdos."
              : "No hay documentos de este tipo."
          }
          actionLabel={typeFilter === 'all' ? "Subir primer documento" : undefined}
          onAction={typeFilter === 'all' ? () => setUploaderOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              onDownload={getDownloadUrl}
              onDelete={handleDelete}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <DocumentUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        onUpload={handleUpload}
        isUploading={uploadDocument.isPending}
      />
    </div>
  );
}
