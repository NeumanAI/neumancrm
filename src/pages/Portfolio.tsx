import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Wallet, Search, FileText, AlertTriangle, CheckCircle2, TrendingUp, Plus, Phone, MessageCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { NewContractWizard } from '@/components/portfolio/NewContractWizard';
import { usePortfolioContracts, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/hooks/usePortfolioContracts';
import { useRealEstateProjects } from '@/hooks/useRealEstateProjects';
import { usePortfolioOverdue, usePortfolioUpcoming } from '@/hooks/usePortfolioOverdue';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function Portfolio() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewContract, setShowNewContract] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const [overdueOpen, setOverdueOpen] = useState(true);
  const { contracts, isLoading } = usePortfolioContracts();
  const { projects } = useRealEstateProjects();
  const { overdueGroups, totalOverdueAmount, overdueContractsCount } = usePortfolioOverdue();
  const { data: upcomingInstallments } = usePortfolioUpcoming(7);

  const filtered = useMemo(() => {
    let list = contracts;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (projectFilter !== 'all') list = list.filter(c => c.project_id === projectFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = `${c.contacts?.first_name || ''} ${c.contacts?.last_name || ''}`.toLowerCase();
        return name.includes(q) ||
          c.contract_number.toLowerCase().includes(q) ||
          (c.fiducia_number || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [contracts, statusFilter, projectFilter, search]);

  const activeContracts = contracts.filter(c => c.status === 'active');
  const activeAmount = activeContracts.reduce((s, c) => s + c.financed_amount, 0);
  const activeWithoutOverdue = activeContracts.filter(c => !overdueGroups.some(g => g.contract_id === c.id)).length;
  const completedCount = contracts.filter(c => c.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const openWhatsApp = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Hola ${name}, nos comunicamos para recordarte sobre tu cuota pendiente. ¿Podemos ayudarte?`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Cartera Inmobiliaria</h1>
        </div>
        <Button onClick={() => setShowNewContract(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo contrato
        </Button>
      </div>

      <NewContractWizard open={showNewContract} onOpenChange={setShowNewContract} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Cartera activa</p>
            </div>
            <p className="text-xl font-bold">{formatCurrency(activeAmount)}</p>
            <p className="text-xs text-muted-foreground">{activeContracts.length} contratos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Al día</p>
            </div>
            <p className="text-xl font-bold text-green-600">{activeWithoutOverdue}</p>
            <p className="text-xs text-muted-foreground">sin cuotas vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-xs text-muted-foreground">En mora</p>
            </div>
            <p className="text-xl font-bold text-red-600">{overdueContractsCount}</p>
            <p className="text-xs text-red-500">{formatCurrency(totalOverdueAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Completados</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Alert */}
      {upcomingInstallments && upcomingInstallments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {upcomingInstallments.length} cuota{upcomingInstallments.length > 1 ? 's' : ''} por vencer en los próximos 7 días
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingInstallments.slice(0, 5).map((inst: any) => (
                <Badge key={inst.id} variant="outline" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {inst.contact_name} — #{inst.installment_number} — {new Date(inst.due_date).toLocaleDateString('es-CO')} — {formatCurrency(inst.total_amount - inst.paid_amount)}
                </Badge>
              ))}
              {upcomingInstallments.length > 5 && (
                <Badge variant="outline" className="text-xs">+{upcomingInstallments.length - 5} más</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Panel */}
      {overdueGroups.length > 0 && (
        <Collapsible open={overdueOpen} onOpenChange={setOverdueOpen}>
          <Card className="border-red-200 dark:border-red-800">
            <CollapsibleTrigger asChild>
              <CardContent className="py-3 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Panel de mora — {overdueContractsCount} comprador{overdueContractsCount > 1 ? 'es' : ''} con cuotas vencidas ({formatCurrency(totalOverdueAmount)})
                    </p>
                  </div>
                  {overdueOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {overdueGroups.map(group => (
                  <div key={group.contract_id} className="flex items-center gap-3 p-3 rounded-lg border bg-red-50/30 dark:bg-red-950/10">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{group.contact_name}</p>
                      <p className="text-xs text-muted-foreground">
                        N° {group.contract_number} · {group.project_name} · {group.installments.length} cuota{group.installments.length > 1 ? 's' : ''} vencida{group.installments.length > 1 ? 's' : ''}
                        {' · '}{Math.max(...group.installments.map(i => i.days_overdue))} días máx
                      </p>
                    </div>
                    <p className="font-bold text-sm text-red-600 whitespace-nowrap">{formatCurrency(group.total_overdue)}</p>
                    <div className="flex items-center gap-1">
                      {group.contact_phone && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                          <a href={`tel:${group.contact_phone}`}><Phone className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      {group.contact_whatsapp && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600"
                          onClick={() => openWhatsApp(group.contact_whatsapp!, group.contact_name)}>
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 text-xs"
                        onClick={() => navigate(`/cartera/${group.contract_id}`)}>
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, contrato o fiducia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {(projects || []).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contracts list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay contratos de cartera</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(contract => {
            const contact = contract.contacts;
            const initials = `${contact?.first_name?.[0] || ''}${contact?.last_name?.[0] || ''}`.toUpperCase() || 'C';
            return (
              <Card
                key={contract.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/cartera/${contract.id}`)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{contact?.first_name} {contact?.last_name}</p>
                      <Badge variant="outline" className={cn('text-xs', CONTRACT_STATUS_COLORS[contract.status])}>
                        {CONTRACT_STATUS_LABELS[contract.status] || contract.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>N° {contract.contract_number}</span>
                      {contract.fiducia_number && <span>Fiducia: {contract.fiducia_number}</span>}
                      <span>{contract.real_estate_projects?.name}</span>
                      {contract.real_estate_unit_types && (
                        <span>{contract.real_estate_unit_types.nomenclature || contract.real_estate_unit_types.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(contract.financed_amount)}</p>
                    <p className="text-xs text-muted-foreground">{contract.term_months} cuotas</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
