import { useState } from 'react';
import { Company } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompanies } from '@/hooks/useCompanies';
import { 
  Globe, 
  Phone, 
  MapPin, 
  Linkedin, 
  Twitter,
  Edit,
  ExternalLink,
  StickyNote,
  Building2
} from 'lucide-react';

interface CompanySidebarProps {
  company: Company;
}

export function CompanySidebar({ company }: CompanySidebarProps) {
  const { updateCompany } = useCompanies();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    domain: company.domain || '',
    website: company.website || '',
    industry: company.industry || '',
    phone: company.phone || '',
    city: company.city || '',
    country: company.country || '',
    linkedin_url: company.linkedin_url || '',
    twitter_url: company.twitter_url || '',
    description: company.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCompany.mutateAsync({
      id: company.id,
      ...formData,
    });
    setIsEditOpen(false);
  };

  const initial = company.name[0]?.toUpperCase() || '?';
  const location = [company.city, company.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* Logo and name */}
      <div className="text-center space-y-3">
        <div className="mx-auto h-20 w-20 rounded-lg bg-secondary/10 flex items-center justify-center text-2xl font-bold text-secondary">
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="h-full w-full object-cover rounded-lg"
            />
          ) : (
            initial
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{company.name}</h2>
          {company.industry && (
            <Badge variant="secondary" className="mt-1">
              {company.industry}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Company info */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Información de la empresa
        </h3>
        
        <div className="space-y-2">
          {company.website && (
            <CompanyInfoItem 
              icon={Globe} 
              label="Website" 
              value={company.domain || company.website}
              href={company.website}
              external
            />
          )}
          
          {company.phone && (
            <CompanyInfoItem 
              icon={Phone} 
              label="Teléfono" 
              value={company.phone}
              href={`tel:${company.phone}`}
            />
          )}
          
          {location && (
            <CompanyInfoItem 
              icon={MapPin} 
              label="Ubicación" 
              value={location}
            />
          )}
          
          {company.linkedin_url && (
            <CompanyInfoItem 
              icon={Linkedin} 
              label="LinkedIn" 
              value="Ver perfil"
              href={company.linkedin_url}
              external
            />
          )}
          
          {company.twitter_url && (
            <CompanyInfoItem 
              icon={Twitter} 
              label="Twitter" 
              value="Ver perfil"
              href={company.twitter_url}
              external
            />
          )}
        </div>
      </div>

      {/* Description */}
      {company.description && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Descripción
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {company.description}
            </p>
          </div>
        </>
      )}

      <Separator />

      {/* Quick actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Acciones rápidas
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-1 h-4 w-4" />
            Editar
          </Button>
          
          {company.website && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
            >
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-1 h-4 w-4" />
                Web
              </a>
            </Button>
          )}
          
          {company.phone && (
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a href={`tel:${company.phone}`}>
                <Phone className="mr-1 h-4 w-4" />
                Llamar
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
            <DialogDescription>
              Actualiza la información de la empresa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industria</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter URL</Label>
                <Input
                  id="twitter"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyInfoItem({ 
  icon: Icon, 
  label, 
  value, 
  href,
  external = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {value}
        </p>
      </div>
      {external && (
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );

  if (href) {
    return (
      <a 
        href={href} 
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return content;
}
