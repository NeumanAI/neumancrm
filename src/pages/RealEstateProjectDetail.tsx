import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Building2, MapPin, Home, Users, Plus, Trash2, MoreHorizontal, Calendar,
  Pencil, FileSpreadsheet, Image,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealEstateProject, useRealEstateProjects } from '@/hooks/useRealEstateProjects';
import {
  useRealEstateUnitTypes, RealEstateUnitType,
  PROPERTY_TYPE_OPTIONS, COMMERCIAL_STATUS_OPTIONS, COMMERCIAL_STATUS_COLORS,
} from '@/hooks/useRealEstateUnitTypes';
import { useRealEstateLeads, leadStatusLabels, leadStatusColors, RealEstateLeadStatus } from '@/hooks/useRealEstateLeads';
import { useContacts } from '@/hooks/useContacts';
import { BuyerContactSearch } from '@/components/realestate/BuyerContactSearch';
import { ImportUnitsDialog } from '@/components/realestate/ImportUnitsDialog';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

const statusLabels: Record<string, string> = {
  planning: 'Planeación', pre_sale: 'Preventa', presale: 'Preventa',
  construction: 'Construcción', delivery: 'Entrega', completed: 'Completado', cancelled: 'Cancelado',
};

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planeación' },
  { value: 'pre_sale', label: 'Preventa' },
  { value: 'construction', label: 'Construcción' },
  { value: 'delivery', label: 'Entrega' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function RealEstateProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<RealEstateUnitType | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [importUnitsOpen, setImportUnitsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingImage, setEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const { data: project, isLoading } = useRealEstateProject(projectId);
  const { updateProject } = useRealEstateProjects();
  const { unitTypes, createUnitType, updateUnitType, deleteUnitType } = useRealEstateUnitTypes(projectId);
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

  const filteredUnits = statusFilter === 'all'
    ? unitTypes
    : unitTypes.filter(u => u.commercial_status === statusFilter);

  const progressPercent = project.total_units > 0
    ? Math.round((project.sold_units / project.total_units) * 100) : 0;

  const handleStatusChange = (newStatus: string) => {
    updateProject.mutate({ id: project.id, status: newStatus } as any);
  };

  const handleImageSave = () => {
    updateProject.mutate({ id: project.id, cover_image_url: newImageUrl || null } as any);
    setEditingImage(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.code && <Badge variant="outline">{project.code}</Badge>}
            <Select value={project.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {/* Cover Image */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Imagen del Proyecto</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setNewImageUrl(project.cover_image_url || ''); setEditingImage(!editingImage); }}>
                <Image className="h-4 w-4 mr-1" />{project.cover_image_url ? 'Cambiar' : 'Agregar'}
              </Button>
            </CardHeader>
            <CardContent>
              {editingImage ? (
                <div className="space-y-2">
                  <Input placeholder="URL de la imagen..." value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleImageSave}>Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingImage(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : project.cover_image_url ? (
                <div className="h-48 rounded-lg overflow-hidden">
                  <img src={project.cover_image_url} alt={project.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </CardContent>
          </Card>

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
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Progreso de ventas</p>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{progressPercent}% vendido</p>
              </div>
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
            <CardHeader className="flex-row items-center justify-between pb-4 flex-wrap gap-2">
              <CardTitle>Unidades</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {COMMERCIAL_STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setImportUnitsOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />Importar
                </Button>
                <Button size="sm" onClick={() => setAddUnitOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUnits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay unidades{statusFilter !== 'all' ? ' con este estado' : ''}</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nombre / Nomenclatura</TableHead>
                        <TableHead>Piso</TableHead>
                        <TableHead>Tipología</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((ut) => (
                        <TableRow key={ut.id}>
                          <TableCell className="text-sm">
                            {PROPERTY_TYPE_OPTIONS.find(p => p.value === ut.property_type)?.label || ut.property_type || '—'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{ut.name}</p>
                              {ut.nomenclature && <p className="text-xs text-muted-foreground">{ut.nomenclature}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{ut.floor_number ?? '—'}</TableCell>
                          <TableCell className="text-sm">{ut.typology || '—'}</TableCell>
                          <TableCell className="text-sm">{ut.area_m2 ? `${ut.area_m2} m²` : '—'}</TableCell>
                          <TableCell className="text-sm">{ut.price ? formatCurrency(ut.price) : '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', COMMERCIAL_STATUS_COLORS[ut.commercial_status] || '')}>
                              {ut.commercial_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {ut.buyer_contact ? (
                              <button
                                className="text-primary hover:underline text-xs"
                                onClick={() => navigate(`/contacts/${ut.buyer_contact!.id}`)}
                              >
                                {ut.buyer_contact.first_name} {ut.buyer_contact.last_name}
                              </button>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditUnit(ut)}>
                                  <Pencil className="h-4 w-4 mr-2" />Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteUnitType.mutate(ut.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      {/* Add/Edit Unit Dialog */}
      <UnitTypeDialog
        open={addUnitOpen || !!editUnit}
        onOpenChange={(o) => { if (!o) { setAddUnitOpen(false); setEditUnit(null); } }}
        projectId={projectId!}
        editData={editUnit}
        onCreate={(data) => {
          createUnitType.mutate({ ...data, project_id: projectId! } as any);
          setAddUnitOpen(false);
        }}
        onUpdate={(data) => {
          if (editUnit) {
            updateUnitType.mutate({ id: editUnit.id, ...data } as any);
            setEditUnit(null);
          }
        }}
      />

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        projectId={projectId!}
        onAdd={(contactId) => addLead.mutate({ project_id: projectId!, contact_id: contactId })}
      />

      {/* Import Units Dialog */}
      <ImportUnitsDialog
        open={importUnitsOpen}
        onOpenChange={setImportUnitsOpen}
        projectId={projectId!}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function UnitTypeDialog({ open, onOpenChange, projectId, editData, onCreate, onUpdate }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string;
  editData: RealEstateUnitType | null;
  onCreate: (data: Partial<RealEstateUnitType>) => void;
  onUpdate: (data: Partial<RealEstateUnitType>) => void;
}) {
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [nomenclature, setNomenclature] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [typology, setTypology] = useState('');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [totalCount, setTotalCount] = useState('1');
  const [commercialStatus, setCommercialStatus] = useState('Disponible');
  const [buyerContactId, setBuyerContactId] = useState<string | null>(null);
  const [buyerContact, setBuyerContact] = useState<any>(null);
  const [separationDate, setSeparationDate] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [separationValue, setSeparationValue] = useState('');
  const [saleBalance, setSaleBalance] = useState('');

  // Populate when editing
  const populateForm = () => {
    if (editData) {
      setName(editData.name);
      setPropertyType(editData.property_type || '');
      setNomenclature(editData.nomenclature || '');
      setFloorNumber(editData.floor_number?.toString() || '');
      setTypology(editData.typology || '');
      setBedrooms(editData.bedrooms?.toString() || '0');
      setBathrooms(editData.bathrooms?.toString() || '0');
      setArea(editData.area_m2?.toString() || '');
      setPrice(editData.price?.toString() || '');
      setTotalCount(editData.total_count?.toString() || '1');
      setCommercialStatus(editData.commercial_status || 'Disponible');
      setBuyerContactId(editData.buyer_contact_id);
      setBuyerContact(editData.buyer_contact || null);
      setSeparationDate(editData.separation_date || '');
      setSaleDate(editData.sale_date || '');
      setSeparationValue(editData.separation_value?.toString() || '');
      setSaleBalance(editData.sale_balance?.toString() || '');
    } else {
      setName(''); setPropertyType(''); setNomenclature(''); setFloorNumber('');
      setTypology(''); setBedrooms('0'); setBathrooms('0'); setArea(''); setPrice('');
      setTotalCount('1'); setCommercialStatus('Disponible'); setBuyerContactId(null);
      setBuyerContact(null); setSeparationDate(''); setSaleDate('');
      setSeparationValue(''); setSaleBalance('');
    }
  };

  // Populate when dialog opens
  useState(() => { populateForm(); });

  // Re-populate when editData changes
  const [lastEditId, setLastEditId] = useState<string | null>(null);
  if ((editData?.id || null) !== lastEditId) {
    setLastEditId(editData?.id || null);
    populateForm();
  }

  const handleSubmit = () => {
    if (!name.trim()) return;
    const data: Partial<RealEstateUnitType> = {
      name,
      property_type: propertyType || null,
      nomenclature: nomenclature || null,
      floor_number: floorNumber ? parseInt(floorNumber) : null,
      typology: typology || null,
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseFloat(bathrooms) || 0,
      area_m2: area ? parseFloat(area) : null,
      price: price ? parseFloat(price) : null,
      total_count: parseInt(totalCount) || 1,
      available_count: commercialStatus === 'Disponible' ? (parseInt(totalCount) || 1) : 0,
      commercial_status: commercialStatus,
      buyer_contact_id: ['Separado', 'Vendido'].includes(commercialStatus) ? buyerContactId : null,
      separation_date: separationDate || null,
      sale_date: saleDate || null,
      separation_value: separationValue ? parseFloat(separationValue) : null,
      sale_balance: saleBalance ? parseFloat(saleBalance) : null,
    };

    if (editData) {
      onUpdate(data);
    } else {
      onCreate(data);
    }
  };

  const showBuyerFields = ['Separado', 'Vendido'].includes(commercialStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editData ? 'Editar Unidad' : 'Nueva Unidad'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apto 101" />
            </div>
            <div>
              <Label>Tipo de propiedad</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Nomenclatura</Label>
              <Input value={nomenclature} onChange={(e) => setNomenclature(e.target.value)} placeholder="A-101" />
            </div>
            <div>
              <Label>Piso</Label>
              <Input type="number" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} />
            </div>
            <div>
              <Label>Tipología</Label>
              <Input value={typology} onChange={(e) => setTypology(e.target.value)} placeholder="2 Hab" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Recámaras</Label>
              <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </div>
            <div>
              <Label>Baños</Label>
              <Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </div>
            <div>
              <Label>Área m²</Label>
              <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Precio</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Total unidades</Label>
              <Input type="number" value={totalCount} onChange={(e) => setTotalCount(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Estado comercial</Label>
            <Select value={commercialStatus} onValueChange={setCommercialStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMERCIAL_STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showBuyerFields && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">Datos del comprador</p>
              <div>
                <Label>Comprador</Label>
                <BuyerContactSearch
                  value={buyerContactId}
                  selectedContact={buyerContact}
                  onChange={(id, contact) => { setBuyerContactId(id); setBuyerContact(contact); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{commercialStatus === 'Separado' ? 'Fecha separación' : 'Fecha venta'}</Label>
                  <Input
                    type="date"
                    value={commercialStatus === 'Separado' ? separationDate : saleDate}
                    onChange={(e) => commercialStatus === 'Separado' ? setSeparationDate(e.target.value) : setSaleDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{commercialStatus === 'Separado' ? 'Valor separación' : 'Saldo venta'}</Label>
                  <Input
                    type="number"
                    value={commercialStatus === 'Separado' ? separationValue : saleBalance}
                    onChange={(e) => commercialStatus === 'Separado' ? setSeparationValue(e.target.value) : setSaleBalance(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {editData ? 'Guardar' : 'Crear'}
            </Button>
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
