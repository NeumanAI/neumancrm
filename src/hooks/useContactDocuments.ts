import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ContactDocument {
  id: string;
  user_id: string;
  contact_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: 'contract' | 'proposal' | 'agreement' | 'invoice' | 'other';
  description?: string;
  created_at: string;
}

interface UploadDocumentParams {
  contactId: string;
  file: File;
  documentType: ContactDocument['document_type'];
  description?: string;
}

export function useContactDocuments(contactId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['contact-documents', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_documents')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactDocument[];
    },
    enabled: !!contactId && !!user,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ contactId, file, documentType, description }: UploadDocumentParams) => {
      if (!user) throw new Error('No autenticado');

      // Generate unique file path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${contactId}/${timestamp}_${safeName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('contact-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error: dbError } = await supabase
        .from('contact_documents')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: documentType,
          description: description || null,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback storage upload if DB insert fails
        await supabase.storage.from('contact-documents').remove([filePath]);
        throw dbError;
      }

      return data as ContactDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-documents', contactId] });
      toast.success('Documento subido correctamente');
    },
    onError: (error) => {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: ContactDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contact-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('contact_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-documents', contactId] });
      toast.success('Documento eliminado');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
    },
  });

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('contact-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting download URL:', error);
      toast.error('Error al generar enlace de descarga');
      return null;
    }

    return data.signedUrl;
  };

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    uploadDocument,
    deleteDocument,
    getDownloadUrl,
  };
}
