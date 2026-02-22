import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Building2, MapPin, Home, Users, Plus, Trash2, MoreHorizontal, Calendar,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealEstateProject } from '@/hooks/useRealEstateProjects';
import { useRealEstateUnitTypes, RealEstateUnitType } from '@/hooks/useRealEstateUnitTypes';
import { useRealEstateLeads, leadStatusLabels, leadStatusColors, RealEstateLeadStatus } from '@/hooks/useRealEstateLeads';
import { useContacts } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

const statusLabels: Record<string, string> = {
  planning: 'Planeación', presale: 'Preventa', construction: 'Construcción',
  delivery: 'Entrega', completed: 'Completado',
};

export default function RealEstateProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const { data: project, isLoading } = useRealEstateProject(projectId);
  const { unitTypes, createUnitType, deleteUnitType } = useRealEstateUnitTypes(projectId);
  const { leads, addLead, updateLeadStatus, deleteLead } = useRealEstateLeads(projectId);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div>;
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Proyecto no encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver a Proyectos
        </Button>
      </div>
    );
  }

  const progressPercent = project.total_units > 0
    ? Math.round((project.sold_units / project.total_units) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.code && <Badge variant="outline">{project.code}</Badge>}
            <Badge variant="outline">{statusLabels[project.status] || project.status}</Badge>
          </div>
          {project.city && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" /> {[project.address, project.city, project.state, project.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total Unidades</p>
          <p className="text-2xl font-bold">{project.total_units}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Vendidas</p>
          <p className="text-2xl font-bold text-green-600">{project.sold_units}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Reservadas</p>
          <p className="text-2xl font-bold text-amber-600">{project.reserved_units}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-bold text-blue-600">{project.available_units}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Avance de obra</p>
          <p className="text-2xl font-bold">{project.construction_progress}%</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="units">Unidades ({unitTypes.length})</TabsTrigger>
          <TabsTrigger value="buyers">Compradores ({leads.length})</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {project.description && <p className="text-muted-foreground">{project.description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(project.price_from || project.price_to) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Rango de precios</p>
                    <p className="font-semibold">
                      {project.price_from && project.price_to
                        ? `${formatCurrency(project.price_from)} - ${formatCurrency(project.price_to)}`
                        : project.price_from ? `Desde ${formatCurrency(project.price_from)}` : `Hasta ${formatCurrency(project.price_to!)}`}
                    </p>
                  </div>
                )}
                {project.estimated_delivery && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Entrega estimada</p>
                    <p className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(project.estimated_delivery).toLocaleDateString('es-MX')}</p>
                  </div>
                )}
              </div>
              {/* Sales progress */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Progreso de ventas</p>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{progressPercent}% vendido</p>
              </div>
              {/* Amenities */}
              {project.amenities && (project.amenities as string[]).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Amenidades</p>
                  <div className="flex flex-wrap gap-2">
                    {(project.amenities as string[]).map((a, i) => (
                      <Badge key={i} variant="secondary">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle>Tipos de Unidades</CardTitle>
              <Button size="sm" onClick={() => setAddUnitOpen(true)}><Plus className="h-4 w-4 mr-2" />Agregar Tipo</Button>
            </CardHeader>
            <CardContent>
              {unitTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay tipos de unidades</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unitTypes.map((ut) => (
                    <Card key={ut.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{ut.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {ut.bedrooms} hab · {ut.bathrooms} baños · {ut.area_m2 ? `${ut.area_m2} m²` : '—'}
                            </p>
                            {ut.price && <p className="font-medium mt-1">{formatCurrency(ut.price)}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {ut.available_count} disponibles de {ut.total_count}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteUnitType.mutate(ut.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buyers Tab */}
        <TabsContent value="buyers" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle>Compradores / Interesados</CardTitle>
              <Button size="sm" onClick={() => setAddLeadOpen(true)}><Plus className="h-4 w-4 mr-2" />Agregar Comprador</Button>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay compradores registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.map((lead) => {
                    const contact = lead.contacts;
                    if (!contact) return null;
                    const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || 'C';

                    return (
                      <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={lead.status}
                            onValueChange={(val) => updateLeadStatus.mutate({ id: lead.id, status: val as RealEstateLeadStatus })}
                          >
                            <SelectTrigger className={cn('h-8 w-auto text-xs border', leadStatusColors[lead.status])}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(leadStatusLabels).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/contacts/${contact.id}`)}>Ver contacto</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteLead.mutate(lead.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Unit Type Dialog */}
      <AddUnitTypeDialog
        open={addUnitOpen}
        onOpenChange={setAddUnitOpen}
        projectId={projectId!}
        onCreate={(data) => createUnitType.mutate({ ...data, project_id: projectId! })}
      />

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        projectId={projectId!}
        onAdd={(contactId) => addLead.mutate({ project_id: projectId!, contact_id: contactId })}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function AddUnitTypeDialog({ open, onOpenChange, projectId, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string;
  onCreate: (data: Partial<RealEstateUnitType>) => void;
}) {
  const [name, setName] = useState('');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [totalCount, setTotalCount] = useState('0');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      name,
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseFloat(bathrooms) || 0,
      area_m2: area ? parseFloat(area) : undefined,
      price: price ? parseFloat(price) : undefined,
      total_count: parseInt(totalCount) || 0,
      available_count: parseInt(totalCount) || 0,
    } as any);
    setName(''); setBedrooms('0'); setBathrooms('0'); setArea(''); setPrice(''); setTotalCount('0');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo Tipo de Unidad</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Depto 2 recámaras" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Recámaras</label>
              <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Baños</label>
              <Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">m²</label>
              <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Precio</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Total unidades</label>
              <Input type="number" value={totalCount} onChange={(e) => setTotalCount(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>Crear</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddLeadDialog({ open, onOpenChange, projectId, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string;
  onAdd: (contactId: string) => void;
}) {
  const { contacts = [], isLoading } = useContacts();
  const [search, setSearch] = useState('');

  const filtered = contacts.filter((c: any) =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar Comprador</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Buscar contacto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-4 text-sm text-muted-foreground">No se encontraron contactos</p>
            ) : (
              filtered.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => { onAdd(c.id); onOpenChange(false); setSearch(''); }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {`${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
