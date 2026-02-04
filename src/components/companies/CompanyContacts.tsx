import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/crm';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CompanyContactsProps {
  companyId: string;
}

export function CompanyContacts({ companyId }: CompanyContactsProps) {
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['company-contacts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contact[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="Sin contactos"
        description="Esta empresa no tiene contactos asociados."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-semibold">{contacts.length}</span>
          <span className="text-muted-foreground">
            {contacts.length === 1 ? 'contacto' : 'contactos'} en esta empresa
          </span>
        </div>
      </div>

      {/* Contacts list */}
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Sin nombre';
  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || '?';

  return (
    <Link to={`/contacts/${contact.id}`}>
      <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {initials}
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{fullName}</h4>
            </div>
            
            {contact.job_title && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{contact.job_title}</span>
                {contact.department && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {contact.department}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {contact.email && (
                <div className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
