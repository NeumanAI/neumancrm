import { useState } from 'react';
import { FileText, Plus, FolderOpen, Share2, HardDrive, Settings2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useOrgDocuments } from '@/hooks/useOrgDocuments';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { UploadDocumentDialog } from '@/components/documents/UploadDocumentDialog';
import { ShareDocumentDialog } from '@/components/documents/ShareDocumentDialog';
import { ManageCategoriesDialog } from '@/components/documents/ManageCategoriesDialog';
import { DocumentTypeSelect } from '@/components/documents/DocumentTypeSelect';
import { AIDocumentSearch } from '@/components/documents/AIDocumentSearch';
import { OrgDocument, formatFileSize } from '@/types/documents';

export default function Documents() {
  const { documents, isLoading, uploadDocument, deleteDocument, shareDocument, revokeShare, getDownloadUrl, stats } = useOrgDocuments();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sharingDoc, setSharingDoc] = useState<OrgDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocuments = typeFilter === 'all'
    ? documents
    : documents.filter(d => d.document_type === typeFilter);

  const handleUpload = async (params: { file: File; documentType: string; description?: string; tags?: string[] }) => {
    await uploadDocument.mutateAsync(params);
    setUploadOpen(false);
  };

  const handleDelete = async (doc: OrgDocument) => {
    setDeletingId(doc.id);
    try { await deleteDocument.mutateAsync(doc); } finally { setDeletingId(null); }
  };

  const handleShare = async (expiresInDays?: number) => {
    if (!sharingDoc) return '';
    const token = await shareDocument.mutateAsync({ documentId: sharingDoc.id, expiresInDays });
    setSharingDoc({ ...sharingDoc, is_shared: true, share_token: token, share_views: 0 });
    return token;
  };

  const handleRevoke = async () => {
    if (!sharingDoc) return;
    await revokeShare.mutateAsync(sharingDoc.id);
    setSharingDoc(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Repositorio central de documentos de tu organización</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Categorías
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Subir documento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total documentos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compartidos</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shared}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Search */}
      <AIDocumentSearch />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <DocumentTypeSelect value={typeFilter} onValueChange={setTypeFilter} includeAll className="w-48" />
      </div>

      {/* Documents list */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Sin documentos"
          description={typeFilter === 'all' ? 'No hay documentos en el repositorio.' : 'No hay documentos de este tipo.'}
          actionLabel="Subir documento"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDownload={getDownloadUrl}
              onDelete={() => handleDelete(doc)}
              onShare={() => setSharingDoc(doc)}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        isUploading={uploadDocument.isPending}
        title="Subir documento al repositorio"
        description="Sube un documento al repositorio central de tu organización."
      />

      <ManageCategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />

      {sharingDoc && (
        <ShareDocumentDialog
          open={!!sharingDoc}
          onOpenChange={(open) => !open && setSharingDoc(null)}
          documentName={sharingDoc.file_name}
          isShared={sharingDoc.is_shared}
          shareToken={sharingDoc.share_token}
          shareViews={sharingDoc.share_views}
          onShare={handleShare}
          onRevoke={handleRevoke}
          isLoading={shareDocument.isPending || revokeShare.isPending}
        />
      )}
    </div>
  );
}
