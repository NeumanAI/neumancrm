import { useState } from 'react';
import { Contact } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { useContacts } from '@/hooks/useContacts';
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  Linkedin, 
  Building2,
  Edit,
  ExternalLink,
  StickyNote
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContactSidebarProps {
  contact: Contact;
}

export function ContactSidebar({ contact }: ContactSidebarProps) {
  const { updateContact } = useContacts();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email,
    phone: contact.phone || '',
    mobile: contact.mobile || '',
    whatsapp_number: contact.whatsapp_number || '',
    job_title: contact.job_title || '',
    department: contact.department || '',
    linkedin_url: contact.linkedin_url || '',
    notes: contact.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContact.mutateAsync({
      id: contact.id,
      ...formData,
    });
    setIsEditOpen(false);
  };

  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || '?';
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Sin nombre';

  return (
    <div className="space-y-6">
      {/* Avatar and name */}
      <div className="text-center space-y-3">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{fullName}</h2>
          {contact.job_title && (
            <p className="text-sm text-muted-foreground">{contact.job_title}</p>
          )}
          {contact.companies && (
            <Link 
              to={`/companies/${contact.companies.id}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
            >
              <Building2 className="h-3 w-3" />
              {contact.companies.name}
            </Link>
          )}
        </div>
      </div>

      <Separator />

      {/* Contact info */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Información de contacto
        </h3>
        
        <div className="space-y-2">
          {contact.email && (
            <ContactInfoItem 
              icon={Mail} 
              label="Email" 
              value={contact.email}
              href={`mailto:${contact.email}`}
            />
          )}
          
          {contact.phone && (
            <ContactInfoItem 
              icon={Phone} 
              label="Teléfono" 
              value={contact.phone}
              href={`tel:${contact.phone}`}
            />
          )}
          
          {contact.mobile && (
            <ContactInfoItem 
              icon={Phone} 
              label="Móvil" 
              value={contact.mobile}
              href={`tel:${contact.mobile}`}
            />
          )}
          
          {contact.whatsapp_number && (
            <ContactInfoItem 
              icon={MessageCircle} 
              label="WhatsApp" 
              value={contact.whatsapp_number}
              href={`https://wa.me/${contact.whatsapp_number.replace(/\D/g, '')}`}
              external
            />
          )}
          
          {contact.linkedin_url && (
            <ContactInfoItem 
              icon={Linkedin} 
              label="LinkedIn" 
              value="Ver perfil"
              href={contact.linkedin_url}
              external
            />
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Notas
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contact.notes}
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
          
          {contact.email && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
            >
              <a href={`mailto:${contact.email}`}>
                <Mail className="mr-1 h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          
          {contact.phone && (
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a href={`tel:${contact.phone}`}>
                <Phone className="mr-1 h-4 w-4" />
                Llamar
              </a>
            </Button>
          )}
          
          {contact.whatsapp_number && (
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a 
                href={`https://wa.me/${contact.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-1 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar contacto</DialogTitle>
            <DialogDescription>
              Actualiza la información del contacto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Móvil</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Cargo</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateContact.isPending}>
                {updateContact.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactInfoItem({ 
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
