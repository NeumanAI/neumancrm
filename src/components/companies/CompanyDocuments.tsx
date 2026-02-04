import { useState } from 'react';
import { useCompanyDocuments } from '@/hooks/useCompanyDocuments';
import { CompanyDocument } from '@/types/crm';
import { DocumentUploader } from '@/components/contacts/DocumentUploader';
import { DocumentItem } from '@/components/contacts/DocumentItem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  FileText, 
  Plus, 
  Filter 
} from 'lucide-react';

interface CompanyDocumentsProps {
  companyId: string;
}

const documentTypes: { value: CompanyDocument['document_type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'contract', label: 'Contratos' },
  { value: 'proposal', label: 'Propuestas' },
  { value: 'agreement', label: 'Acuerdos' },
  { value: 'invoice', label: 'Facturas' },
  { value: 'other', label: 'Otros' },
];

export function CompanyDocuments({ companyId }: CompanyDocumentsProps) {
  const { documents, isLoading, uploadDocument, deleteDocument, getDownloadUrl } = useCompanyDocuments(companyId);
  const [filter, setFilter] = useState<CompanyDocument['document_type'] | 'all'>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter(d => d.document_type === filter);

  const handleUpload = async (params: {
    file: File;
    documentType: CompanyDocument['document_type'];
    description?: string;
  }) => {
    await uploadDocument.mutateAsync({
      companyId,
      file: params.file,
      documentType: params.documentType,
      description: params.description,
    });
    setIsUploadOpen(false);
  };

  const handleDelete = (doc: any) => {
    const companyDoc = documents.find(d => d.id === doc.id);
    if (companyDoc) {
      deleteDocument.mutate(companyDoc);
    }
  };

  const handleDownload = async (filePath: string): Promise<string | null> => {
    return await getDownloadUrl(filePath);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 rounded-lg border space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {documentTypes.map((type) => (
            <Badge
              key={type.value}
              variant={filter === type.value ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => setFilter(type.value)}
            >
              {type.label}
            </Badge>
          ))}
        </div>
        <Button size="sm" onClick={() => setIsUploadOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Subir documento
        </Button>
      </div>

      {/* Documents list */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Sin documentos"
          description={
            filter === 'all'
              ? "No hay documentos asociados a esta empresa."
              : `No hay ${documentTypes.find(t => t.value === filter)?.label.toLowerCase()} registrados.`
          }
          actionLabel="Subir documento"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={{
                id: doc.id,
                user_id: doc.user_id,
                contact_id: doc.company_id,
                file_name: doc.file_name,
                file_path: doc.file_path,
                file_size: doc.file_size,
                mime_type: doc.mime_type,
                document_type: doc.document_type,
                description: doc.description,
                created_at: doc.created_at,
              }}
              onDownload={handleDownload}
              onDelete={handleDelete}
              isDeleting={deleteDocument.isPending}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <DocumentUploader
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={handleUpload}
        isUploading={uploadDocument.isPending}
      />
    </div>
  );
}
