import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TimelineEntry } from '@/types/crm';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface UseTimelineEntriesOptions {
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  limit?: number;
}

export function useTimelineEntries(options: UseTimelineEntriesOptions = {}) {
  const { contactId, companyId, opportunityId, limit = 50 } = options;
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['timeline-entries', contactId, companyId, opportunityId],
    queryFn: async () => {
      let query = supabase
        .from('timeline_entries')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      
      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to match our TimelineEntry type
      return (data || []).map(entry => ({
        ...entry,
        participants: entry.participants as TimelineEntry['participants'],
        action_items: entry.action_items as TimelineEntry['action_items'],
        metadata: entry.metadata as TimelineEntry['metadata'],
      })) as TimelineEntry[];
    },
    enabled: !!(contactId || companyId || opportunityId),
  });

  const createEntry = useMutation({
    mutationFn: async (newEntry: Omit<TimelineEntry, 'id' | 'user_id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const insertData = {
        user_id: user.id,
        entry_type: newEntry.entry_type,
        contact_id: newEntry.contact_id || null,
        company_id: newEntry.company_id || null,
        opportunity_id: newEntry.opportunity_id || null,
        source: newEntry.source || null,
        subject: newEntry.subject || null,
        body: newEntry.body || null,
        summary: newEntry.summary || null,
        occurred_at: newEntry.occurred_at || new Date().toISOString(),
        participants: (newEntry.participants || []) as unknown as Json,
        action_items: (newEntry.action_items || []) as unknown as Json,
        metadata: (newEntry.metadata || {}) as unknown as Json,
      };

      const { data, error } = await supabase
        .from('timeline_entries')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-entries'] });
      toast.success('Entrada añadida al timeline');
    },
    onError: (error) => {
      toast.error('Error al añadir entrada: ' + error.message);
    },
  });

  return {
    entries: entries || [],
    isLoading,
    createEntry,
  };
}
