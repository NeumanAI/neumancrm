import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const REAL_ESTATE_DOC_TYPES = [
  { value: 'promesa', label: 'Promesa de compraventa', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'hoja_negocio', label: 'Hoja de negocio', color: 'bg-green-500/10 text-green-600' },
  { value: 'cedula', label: 'Cédula / ID', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'certificado', label: 'Certificado', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'soporte_pago', label: 'Soporte de pago', color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'contrato', label: 'Contrato', color: 'bg-indigo-500/10 text-indigo-600' },
  { value: 'poder', label: 'Poder notarial', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'other', label: 'Otro', color: 'bg-gray-500/10 text-gray-600' },
] as const;

export interface ContactDocument {
  id: string;
  user_id: string;
  contact_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  description?: string;
  created_at: string;
}

interface UploadDocumentParams {
  contactId: string;
  file: File;
  documentType: string;
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

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${contactId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('contact-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

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
      if (import.meta.env.DEV) console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: ContactDocument) => {
      const { error: storageError } = await supabase.storage
        .from('contact-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

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
      if (import.meta.env.DEV) console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
    },
  });

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('contact-documents')
      .createSignedUrl(filePath, 3600);

    if (error) {
      if (import.meta.env.DEV) console.error('Error getting download URL:', error);
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
