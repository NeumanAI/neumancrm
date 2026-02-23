import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/crm';
import { useContacts } from '@/hooks/useContacts';
import { ContactType, CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS, CONTACT_TYPE_OPTIONS } from '@/lib/contactTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ContactSidebar } from '@/components/contacts/ContactSidebar';
import { AdvisorAssignmentSection } from '@/components/contacts/AdvisorAssignmentSection';
import { ContactTimeline } from '@/components/contacts/ContactTimeline';
import { ContactActivities } from '@/components/contacts/ContactActivities';
import { ContactDeals } from '@/components/contacts/ContactDeals';
import { ContactDocuments } from '@/components/contacts/ContactDocuments';
import { ActivityFeedList } from '@/components/team/ActivityFeedList';
import { CommentsSection } from '@/components/team/CommentsSection';
import { 
  ArrowLeft, Clock, CheckSquare, TrendingUp, FileText, Activity, MessageSquare,
  ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { convertContactType } = useContacts();

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      if (!contactId) throw new Error('No contact ID');
      const { data, error } = await supabase
        .from('contacts')
        .select('*, companies(id, name, logo_url)')
        .eq('id', contactId)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!contactId,
  });

  const contactType = ((contact as any)?.contact_type || 'prospecto') as ContactType;

  const handleTypeChange = (newType: string) => {
    if (!contact) return;
    convertContactType.mutate({
      contactId: contact.id,
      newType: newType as ContactType,
      reason: 'Cambio manual desde detalle de contacto',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-8 w-48" /></div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4"><Skeleton className="h-20 w-20 rounded-full mx-auto" /><Skeleton className="h-6 w-32 mx-auto" /><Skeleton className="h-40 w-full" /></div>
          <div className="lg:col-span-2 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">No se encontró el contacto</p>
        <Button variant="outline" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Volver a contactos
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{contact.first_name} {contact.last_name}</h1>
            <Select value={contactType} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-8 w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPE_OPTIONS.map(t => (
                  <SelectItem key={t} value={t}>
                    <Badge variant="outline" className={`text-xs ${CONTACT_TYPE_COLORS[t]}`}>
                      {CONTACT_TYPE_LABELS[t]}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">Detalle del contacto</p>
        </div>
      </div>

      {/* Contextual Banners */}
      {contactType === 'comprador' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-teal-50 border border-teal-200 dark:bg-teal-950/30 dark:border-teal-800">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          <div>
            <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Este contacto es un comprador</p>
            <p className="text-xs text-teal-600 dark:text-teal-400">Ha adquirido una unidad o tiene contrato activo.</p>
          </div>
        </div>
      )}
      {contactType === 'inactivo' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Contacto inactivo</p>
            <p className="text-xs text-muted-foreground">Este contacto está marcado como inactivo.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleTypeChange('prospecto')}>
            Reactivar
          </Button>
        </div>
      )}

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <ContactSidebar contact={contact} />
            </div>
            <div className="rounded-lg border bg-card p-6">
              <AdvisorAssignmentSection
                contactId={contact.id}
                assignedAdvisorId={(contact as any).assigned_advisor_id}
                captureAdvisorId={(contact as any).capture_advisor_id}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" /><span className="hidden sm:inline">Timeline</span></TabsTrigger>
              <TabsTrigger value="activities" className="gap-2"><CheckSquare className="h-4 w-4" /><span className="hidden sm:inline">Tareas</span></TabsTrigger>
              <TabsTrigger value="deals" className="gap-2"><TrendingUp className="h-4 w-4" /><span className="hidden sm:inline">Deals</span></TabsTrigger>
              <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Docs</span></TabsTrigger>
              <TabsTrigger value="activity-feed" className="gap-2"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Actividad</span></TabsTrigger>
              <TabsTrigger value="comments" className="gap-2"><MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Notas</span></TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6"><div className="rounded-lg border bg-card p-6"><ContactTimeline contactId={contact.id} /></div></TabsContent>
            <TabsContent value="activities" className="mt-6"><div className="rounded-lg border bg-card p-6"><ContactActivities contactId={contact.id} /></div></TabsContent>
            <TabsContent value="deals" className="mt-6"><div className="rounded-lg border bg-card p-6"><ContactDeals contactId={contact.id} /></div></TabsContent>
            <TabsContent value="documents" className="mt-6"><div className="rounded-lg border bg-card p-6"><ContactDocuments contactId={contact.id} /></div></TabsContent>
            <TabsContent value="activity-feed" className="mt-6"><div className="rounded-lg border bg-card p-6"><h3 className="text-lg font-semibold mb-4">Historial de Cambios</h3><ActivityFeedList entityType="contacts" entityId={contact.id} /></div></TabsContent>
            <TabsContent value="comments" className="mt-6"><div className="rounded-lg border bg-card p-6"><h3 className="text-lg font-semibold mb-4">Comentarios del Equipo</h3><CommentsSection entityType="contacts" entityId={contact.id} /></div></TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}
