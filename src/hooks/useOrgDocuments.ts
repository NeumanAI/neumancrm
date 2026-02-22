import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { OrgDocument } from '@/types/documents';
import { toast } from 'sonner';

interface UploadOrgDocumentParams {
  file: File;
  documentType: string;
  description?: string;
  tags?: string[];
}

export function useOrgDocuments() {
  const { user } = useAuth();
  const { organization } = useTeam();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const documentsQuery = useQuery({
    queryKey: ['org-documents', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_documents')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrgDocument[];
    },
    enabled: !!orgId && !!user,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, documentType, description, tags }: UploadOrgDocumentParams) => {
      if (!user || !orgId) throw new Error('No autenticado');

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${orgId}/${user.id}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('org-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('org_documents')
        .insert({
          user_id: user.id,
          organization_id: orgId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: documentType,
          description: description || null,
          tags: tags || [],
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from('org-documents').remove([filePath]);
        throw dbError;
      }

      return data as OrgDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-documents', orgId] });
      toast.success('Documento subido correctamente');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: OrgDocument) => {
      const { error: storageError } = await supabase.storage
        .from('org-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('org_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-documents', orgId] });
      toast.success('Documento eliminado');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
    },
  });

  const shareDocument = useMutation({
    mutationFn: async ({ documentId, expiresInDays }: { documentId: string; expiresInDays?: number }) => {
      const shareToken = crypto.randomUUID();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('org_documents')
        .update({
          is_shared: true,
          share_token: shareToken,
          share_expires_at: expiresAt,
          share_views: 0,
        })
        .eq('id', documentId);

      if (error) throw error;
      return shareToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-documents', orgId] });
      toast.success('Link de descarga generado');
    },
    onError: () => {
      toast.error('Error al generar link');
    },
  });

  const revokeShare = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('org_documents')
        .update({
          is_shared: false,
          share_token: null,
          share_expires_at: null,
        })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-documents', orgId] });
      toast.success('Link revocado');
    },
    onError: () => {
      toast.error('Error al revocar link');
    },
  });

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('org-documents')
      .createSignedUrl(filePath, 3600);

    if (error) {
      if (import.meta.env.DEV) console.error('Error getting download URL:', error);
      toast.error('Error al generar enlace de descarga');
      return null;
    }

    return data.signedUrl;
  };

  // Stats
  const stats = {
    total: documentsQuery.data?.length || 0,
    shared: documentsQuery.data?.filter(d => d.is_shared).length || 0,
    totalSize: documentsQuery.data?.reduce((sum, d) => sum + d.file_size, 0) || 0,
  };

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    uploadDocument,
    deleteDocument,
    shareDocument,
    revokeShare,
    getDownloadUrl,
    stats,
  };
}
