import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

export interface CalendarItem {
  id: string;
  title: string;
  item_type: 'event' | 'task' | 'goal';
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  metadata: Record<string, any>;
}

export function useCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({ events: true, tasks: true, goals: true });

  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const goToPrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get org id
  const { data: orgId } = useQuery({
    queryKey: ['user-org-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_organization_id');
      return data as string;
    },
    enabled: !!user,
  });

  // Fetch calendar items
  const { data: calendarItems = [], isLoading } = useQuery({
    queryKey: ['calendar-items', startDate.toISOString(), endDate.toISOString(), orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_calendar_items', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as CalendarItem[];
    },
    enabled: !!user && !!orgId,
  });

  // Filter items
  const filteredItems = calendarItems.filter(item => {
    if (item.item_type === 'event' && !filters.events) return false;
    if (item.item_type === 'task' && !filters.tasks) return false;
    if (item.item_type === 'goal' && !filters.goals) return false;
    return true;
  });

  // Create event
  const createEvent = useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      event_type: string;
      start_time: string;
      end_time: string;
      all_day?: boolean;
      location?: string;
      meeting_url?: string;
      color?: string;
      contact_id?: string;
      company_id?: string;
      opportunity_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...event,
          user_id: user!.id,
          organization_id: orgId!,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] });
      toast.success('Evento creado');
    },
    onError: (error: Error) => {
      toast.error('Error al crear evento: ' + error.message);
    },
  });

  // Delete event
  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] });
      toast.success('Evento eliminado');
    },
  });

  // Google sync config
  const { data: googleSync } = useQuery({
    queryKey: ['google-calendar-sync'],
    queryFn: async () => {
      const { data } = await supabase
        .from('google_calendar_sync')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return {
    currentDate,
    setCurrentDate,
    startDate,
    endDate,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    filters,
    setFilters,
    calendarItems: filteredItems,
    isLoading,
    createEvent,
    deleteEvent,
    orgId,
    googleSync,
  };
}

export function useTodayAgenda() {
  const { user } = useAuth();

  const { data: orgId } = useQuery({
    queryKey: ['user-org-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_organization_id');
      return data as string;
    },
    enabled: !!user,
  });

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const { data: todayItems = [], isLoading } = useQuery({
    queryKey: ['today-agenda', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_calendar_items', {
        p_start_date: startOfDay.toISOString(),
        p_end_date: endOfDay.toISOString(),
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as CalendarItem[];
    },
    enabled: !!user && !!orgId,
  });

  return { todayItems, isLoading };
}
