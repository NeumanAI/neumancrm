import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';

export interface ClinicalNote {
  id: string;
  organization_id: string;
  contact_id: string;
  created_by: string;
  consultation_date: string;
  input_mode: 'recording' | 'dictation' | 'text';
  raw_transcript: string | null;
  subjective: string | null;
  objective: string | null;
  analysis: string | null;
  plan: string | null;
  full_note: string | null;
  template_used: 'soap' | 'narrative';
  audio_url: string | null;
  status: 'draft' | 'generating' | 'completed' | 'signed';
  is_signed: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function useClinicalNotes(contactId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-notes', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('clinical_notes' as any)
        .select('*')
        .eq('contact_id', contactId)
        .order('consultation_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClinicalNote[];
    },
    enabled: !!contactId,
  });
}

export function useClinicalNote(noteId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-note', noteId],
    queryFn: async () => {
      if (!noteId) return null;
      const { data, error } = await supabase
        .from('clinical_notes' as any)
        .select('*')
        .eq('id', noteId)
        .single();
      if (error) throw error;
      return data as unknown as ClinicalNote;
    },
    enabled: !!noteId,
  });
}

export function useCreateClinicalNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { organization } = useTeam();

  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      input_mode: string;
      template_used: string;
      raw_transcript?: string;
    }) => {
      const { data, error } = await supabase
        .from('clinical_notes' as any)
        .insert({
          organization_id: organization?.id,
          contact_id: input.contact_id,
          created_by: user?.id,
          input_mode: input.input_mode,
          template_used: input.template_used,
          raw_transcript: input.raw_transcript || null,
          status: 'draft',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicalNote;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clinical-notes', vars.contact_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateClinicalNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, updates }: { noteId: string; updates: Partial<ClinicalNote> }) => {
      const { data, error } = await supabase
        .from('clinical_notes' as any)
        .update(updates as any)
        .eq('id', noteId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicalNote;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clinical-notes', data.contact_id] });
      qc.invalidateQueries({ queryKey: ['clinical-note', data.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSignClinicalNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data, error } = await supabase
        .from('clinical_notes' as any)
        .update({ status: 'signed', is_signed: true } as any)
        .eq('id', noteId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicalNote;
    },
    onSuccess: (data) => {
      toast.success('Nota clínica firmada');
      qc.invalidateQueries({ queryKey: ['clinical-notes', data.contact_id] });
      qc.invalidateQueries({ queryKey: ['clinical-note', data.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateClinicalNote() {
  return useMutation({
    mutationFn: async (input: {
      transcript: string;
      template: 'soap' | 'narrative';
      patient_context?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
        body: input,
      });
      if (error) throw error;
      return data as { subjective?: string; objective?: string; analysis?: string; plan?: string; full_note?: string };
    },
    onError: (e: any) => toast.error(`Error generando nota: ${e.message}`),
  });
}

export function useTranscribeAudio() {
  return useMutation({
    mutationFn: async (input: { audio_base64: string; mime_type: string }) => {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: input,
      });
      if (error) throw error;
      return data as { transcript: string };
    },
    onError: (e: any) => toast.error(`Error transcribiendo: ${e.message}`),
  });
}

export function useUploadClinicalAudio() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (blob: Blob) => {
      const fileName = `${user?.id}/${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('clinical-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      if (error) throw error;
      return data.path;
    },
    onError: (e: any) => toast.error(`Error subiendo audio: ${e.message}`),
  });
}
