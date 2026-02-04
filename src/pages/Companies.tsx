import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { Company } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus, Search, Globe, Phone, Trash2, Edit, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Companies() {
  const navigate = useNavigate();
  const { companies, isLoading, createCompany, updateCompany, deleteCompany } = useCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    website: '',
    industry: '',
    phone: '',
    city: '',
    country: '',
    description: '',
  });

  const filteredCompanies = companies.filter(company => {
    const searchLower = searchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      company.industry?.toLowerCase().includes(searchLower) ||
      company.domain?.toLowerCase().includes(searchLower)
    );
  });

  const openCreateDialog = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      domain: '',
      website: '',
      industry: '',
      phone: '',
      city: '',
      country: '',
      description: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      domain: company.domain || '',
      website: company.website || '',
      industry: company.industry || '',
      phone: company.phone || '',
      city: company.city || '',
      country: company.country || '',
      description: company.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      if (editingCompany) {
        await updateCompany.mutateAsync({
          id: editingCompany.id,
          ...formData,
        });
      } else {
        await createCompany.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta empresa?')) {
      await deleteCompany.mutateAsync(id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gestiona tu cartera de empresas</p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {filteredCompanies.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No hay empresas"
          description="Añade tu primera empresa para comenzar a gestionar tus cuentas."
          actionLabel="Crear Empresa"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Industria</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center text-sm font-medium text-secondary">
                        {company.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        {company.domain && (
                          <p className="text-xs text-muted-foreground">{company.domain}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{company.industry || '-'}</span>
                  </TableCell>
                  <TableCell>
                    {company.city || company.country ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[company.city, company.country].filter(Boolean).join(', ')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.website ? (
                      <a 
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        Visitar
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(company.created_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(company.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany 
                ? 'Actualiza la información de la empresa'
                : 'Añade una nueva empresa a tu CRM'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Dominio</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industria</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Tecnología"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">Teléfono</Label>
              <Input
                id="company_phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Madrid"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="España"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la empresa..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-primary">
                {editingCompany ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
