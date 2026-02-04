import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Opportunity } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CompanyDealsProps {
  companyId: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  won: 'bg-success/20 text-success',
  lost: 'bg-destructive/20 text-destructive',
};

const statusLabels: Record<string, string> = {
  open: 'Abierta',
  won: 'Ganada',
  lost: 'Perdida',
};

export function CompanyDeals({ companyId }: CompanyDealsProps) {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['company-opportunities', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*, contacts(id, first_name, last_name), stages(id, name, color)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Opportunity[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 rounded-lg border space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-8 w-8" />}
        title="Sin oportunidades"
        description="Esta empresa no tiene oportunidades de venta asociadas."
      />
    );
  }

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
  const wonDeals = opportunities.filter(o => o.status === 'won');
  const wonValue = wonDeals.reduce((sum, opp) => sum + (opp.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold">{opportunities.length}</p>
          <p className="text-xs text-muted-foreground">Total deals</p>
        </div>
        <div className="p-4 rounded-lg bg-success/10 text-center">
          <p className="text-2xl font-bold text-success">{wonDeals.length}</p>
          <p className="text-xs text-muted-foreground">Ganados</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 text-center">
          <p className="text-2xl font-bold text-primary">
            ${totalValue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Valor total</p>
        </div>
      </div>

      {/* Deals list */}
      <div className="space-y-3">
        {opportunities.map((opp) => (
          <DealCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}

function DealCard({ opportunity }: { opportunity: Opportunity }) {
  const stage = opportunity.stages;
  const contact = opportunity.contacts;
  const contactName = contact 
    ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() 
    : null;
  
  return (
    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{opportunity.title}</h4>
            <Badge className={statusColors[opportunity.status]}>
              {statusLabels[opportunity.status]}
            </Badge>
          </div>
          
          {contactName && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{contactName}</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium text-foreground">
                ${(opportunity.value || 0).toLocaleString()} {opportunity.currency}
              </span>
            </div>
            
            {opportunity.expected_close_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(parseISO(opportunity.expected_close_date), "d MMM yyyy", { locale: es })}
                </span>
              </div>
            )}
          </div>
          
          {/* Stage progress */}
          {stage && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span 
                  className="font-medium" 
                  style={{ color: stage.color }}
                >
                  {stage.name}
                </span>
                <span className="text-muted-foreground">
                  {opportunity.probability}%
                </span>
              </div>
              <Progress value={opportunity.probability} className="h-1.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
