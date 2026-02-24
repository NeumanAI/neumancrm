import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Search } from 'lucide-react';
import { useRealEstateProjects } from '@/hooks/useRealEstateProjects';
import { useContacts } from '@/hooks/useContacts';
import { CreateContractDialog } from './CreateContractDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewContractWizard({ open, onOpenChange }: Props) {
  const { projects } = useRealEstateProjects();
  const { contacts } = useContacts();

  const [projectId, setProjectId] = useState('');
  const [contactId, setContactId] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [showCreateContract, setShowCreateContract] = useState(false);

  const filteredContacts = contacts.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    return !contactSearch || name.includes(contactSearch.toLowerCase());
  });

  const selectedContact = contacts.find(c => c.id === contactId);
  const contactName = selectedContact
    ? `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim()
    : '';

  const handleContinue = () => {
    setShowCreateContract(true);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setProjectId('');
      setContactId('');
      setContactSearch('');
      setShowCreateContract(false);
    }
    onOpenChange(v);
  };

  const handleContractClose = (v: boolean) => {
    setShowCreateContract(v);
    if (!v) handleClose(false);
  };

  if (showCreateContract && projectId && contactId) {
    return (
      <CreateContractDialog
        open
        onOpenChange={handleContractClose}
        projectId={projectId}
        contactId={contactId}
        contactName={contactName}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo contrato de cartera</DialogTitle>
          <DialogDescription>Selecciona el proyecto y el comprador para crear un contrato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Proyecto inmobiliario *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                {(projects || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Comprador *</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contacto..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">Sin resultados</p>
              ) : (
                filteredContacts.slice(0, 20).map(c => {
                  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email;
                  const initials = `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase() || 'C';
                  const selected = contactId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors ${selected ? 'bg-accent' : ''}`}
                      onClick={() => setContactId(c.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleContinue} disabled={!projectId || !contactId}>
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
