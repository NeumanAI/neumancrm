import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { Contact } from '@/types/crm';
import { ContactType, CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS } from '@/lib/contactTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Users, Plus, Search, Mail, Building2, Trash2, Edit, Sparkles, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ConversationalForm } from '@/components/ai/ConversationalForm';
import { useActionTracking } from '@/hooks/useActionTracking';
import { useAdvisors } from '@/hooks/useAdvisorAttribution';

export default function Contacts() {
  const navigate = useNavigate();
  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts();
  const { companies } = useCompanies();
  const { advisors } = useAdvisors();
  const [searchQuery, setSearchQuery] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showNLI, setShowNLI] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [activeTypeTab, setActiveTypeTab] = useState<string>('all');
  const { trackAction } = useActionTracking();
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', job_title: '', company_id: '', notes: '',
  });

  // Type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length, prospecto: 0, comprador: 0, empresa: 0, inactivo: 0 };
    contacts.forEach(c => {
      const t = (c as any).contact_type || 'prospecto';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (activeTypeTab !== 'all') {
      result = result.filter(c => ((c as any).contact_type || 'prospecto') === activeTypeTab);
    }
    if (advisorFilter !== 'all') {
      result = result.filter(c => (c as any).assigned_advisor_id === advisorFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.job_title?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, activeTypeTab, advisorFilter, searchQuery]);

  const openCreateDialog = () => {
    setEditingContact(null);
    setFormData({ first_name: '', last_name: '', email: '', phone: '', job_title: '', company_id: '', notes: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name || '', last_name: contact.last_name || '',
      email: contact.email, phone: contact.phone || '',
      job_title: contact.job_title || '', company_id: contact.company_id || '', notes: contact.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) { toast.error('El email es requerido'); return; }
    try {
      if (editingContact) {
        await updateContact.mutateAsync({ id: editingContact.id, ...formData, company_id: formData.company_id || null });
      } else {
        await createContact.mutateAsync({ ...formData, company_id: formData.company_id || undefined });
      }
      setIsDialogOpen(false);
    } catch (error) {}
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contacto?')) {
      await deleteContact.mutateAsync(id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
          <p className="text-muted-foreground">Gestiona tus contactos y relaciones</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateDialog} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />Nuevo Contacto
          </Button>
          <Button onClick={() => setShowNLI(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
            <Sparkles className="mr-2 h-4 w-4" />Crear con IA
          </Button>
        </div>
      </div>

      {/* Type Tabs */}
      <Tabs value={activeTypeTab} onValueChange={setActiveTypeTab}>
        <TabsList>
          <TabsTrigger value="all">Todos ({typeCounts.all})</TabsTrigger>
          <TabsTrigger value="prospecto">Prospectos ({typeCounts.prospecto})</TabsTrigger>
          <TabsTrigger value="comprador">Compradores ({typeCounts.comprador})</TabsTrigger>
          <TabsTrigger value="empresa">Empresas ({typeCounts.empresa})</TabsTrigger>
          <TabsTrigger value="inactivo">Inactivos ({typeCounts.inactivo})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + Advisor Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar contactos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {advisors.length > 0 && (
          <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
            <SelectTrigger className="w-48">
              <UserCheck className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Asesor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los asesores</SelectItem>
              {advisors.map(a => (
                <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {filteredContacts.length === 0 && !isLoading ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No hay contactos" description="Añade tu primer contacto para comenzar a gestionar tus relaciones comerciales." actionLabel="Crear Contacto" onAction={openCreateDialog} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Asesor</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => {
                const contactType = ((contact as any).contact_type || 'prospecto') as ContactType;
                return (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/contacts/${contact.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {contact.first_name?.[0]}{contact.last_name?.[0]}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                          {contactType !== 'prospecto' && (
                            <Badge variant="outline" className={`text-xs ${CONTACT_TYPE_COLORS[contactType]}`}>
                              {CONTACT_TYPE_LABELS[contactType]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="text-sm">{contact.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.companies ? (
                        <Badge variant="secondary" className="font-normal">
                          <Building2 className="mr-1 h-3 w-3" />{contact.companies.name}
                        </Badge>
                      ) : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const advisor = advisors.find(a => a.user_id === (contact as any).assigned_advisor_id);
                        return advisor ? <span className="text-sm">{advisor.full_name || advisor.email}</span> : <span className="text-muted-foreground text-sm">-</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(contact.created_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(contact)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</DialogTitle>
            <DialogDescription>{editingContact ? 'Actualiza la información del contacto' : 'Añade un nuevo contacto a tu CRM'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="Juan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Pérez" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="juan@empresa.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 234 567 8900" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Select value={formData.company_id || 'none'} onValueChange={(value) => setFormData({ ...formData, company_id: value === 'none' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="Selecciona una empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin empresa</SelectItem>
                  {companies.map((company) => (<SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Cargo</Label>
              <Input id="job_title" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} placeholder="Director de Ventas" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas adicionales..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">{editingContact ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* NLI Dialog */}
      <Dialog open={showNLI} onOpenChange={setShowNLI}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <ConversationalForm
            entity="contact"
            onComplete={async (data) => {
              const startTime = Date.now();
              try {
                await createContact.mutateAsync({
                  first_name: data.first_name as string || '',
                  last_name: data.last_name as string || '',
                  email: data.email as string || `${Date.now()}@pending.com`,
                  phone: data.phone as string || '',
                  job_title: data.job_title as string || '',
                  notes: data.notes as string || '',
                });
                trackAction({ action_type: 'create', entity_type: 'contact', method: 'nli', duration_ms: Date.now() - startTime });
                setShowNLI(false);
                toast.success('Contacto creado con IA');
              } catch (error) { toast.error('Error al crear contacto'); }
            }}
            onCancel={() => setShowNLI(false)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
