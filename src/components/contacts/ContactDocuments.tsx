import { useState } from 'react';
import { Plus, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useContactDocuments, ContactDocument, REAL_ESTATE_DOC_TYPES } from '@/hooks/useContactDocuments';
import { DocumentItem } from './DocumentItem';
import { DocumentUploader } from './DocumentUploader';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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

  // Group documents by type
  const groupedDocuments = filteredDocuments.reduce<Record<string, ContactDocument[]>>((acc, doc) => {
    const type = doc.document_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

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

  const getDocTypeInfo = (type: string) => {
    return REAL_ESTATE_DOC_TYPES.find(t => t.value === type) || { value: type, label: type, color: 'bg-gray-500/10 text-gray-600' };
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {REAL_ESTATE_DOC_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setUploaderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Subir documento
        </Button>
      </div>

      {/* Documents grouped by type */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Sin documentos"
          description={
            typeFilter === 'all'
              ? "Este contacto no tiene documentos. Sube contratos, promesas o soportes de pago."
              : "No hay documentos de este tipo."
          }
          actionLabel={typeFilter === 'all' ? "Subir primer documento" : undefined}
          onAction={typeFilter === 'all' ? () => setUploaderOpen(true) : undefined}
        />
      ) : typeFilter !== 'all' ? (
        // Flat list when filtering
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
      ) : (
        // Grouped by type
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([type, docs]) => {
            const typeInfo = getDocTypeInfo(type);
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={typeInfo.color}>
                    {typeInfo.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({docs.length})</span>
                </div>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <DocumentItem
                      key={doc.id}
                      document={doc}
                      onDownload={getDownloadUrl}
                      onDelete={handleDelete}
                      isDeleting={deletingId === doc.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
