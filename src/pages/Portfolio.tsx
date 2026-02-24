import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Search, FileText, AlertTriangle, CheckCircle2, TrendingUp, Plus } from 'lucide-react';
import { NewContractWizard } from '@/components/portfolio/NewContractWizard';
import { usePortfolioContracts, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/hooks/usePortfolioContracts';
import { useRealEstateProjects } from '@/hooks/useRealEstateProjects';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function Portfolio() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewContract, setShowNewContract] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const { contracts, isLoading } = usePortfolioContracts();
  const { projects } = useRealEstateProjects();

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
  const defaultedCount = contracts.filter(c => c.status === 'defaulted').length;
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
            <p className="text-xl font-bold text-green-600">{activeContracts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-xs text-muted-foreground">En mora</p>
            </div>
            <p className="text-xl font-bold text-red-600">{defaultedCount}</p>
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
