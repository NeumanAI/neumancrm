import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useContactProjects, useProjectContacts } from '@/hooks/useContactProjects';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddContactToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddContactToProjectDialog({ 
  open, 
  onOpenChange, 
  projectId 
}: AddContactToProjectDialogProps) {
  const [search, setSearch] = useState('');
  const { contacts } = useContacts();
  const { addToProject } = useContactProjects();
  const { projectContacts } = useProjectContacts(projectId);
  const [addingId, setAddingId] = useState<string | null>(null);

  const existingContactIds = new Set(projectContacts.map(pc => pc.contact_id));

  const filteredContacts = contacts.filter(contact => {
    const searchLower = search.toLowerCase();
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
    return fullName.includes(searchLower) || 
           contact.email?.toLowerCase().includes(searchLower);
  });

  const handleAdd = async (contactId: string) => {
    setAddingId(contactId);
    try {
      await addToProject.mutateAsync({
        contact_id: contactId,
        project_id: projectId,
        status: 'lead',
      });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Contactos al Proyecto</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contactos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[300px] -mx-6 px-6">
          <div className="space-y-2">
            {filteredContacts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron contactos
              </p>
            ) : (
              filteredContacts.map((contact) => {
                const isInProject = existingContactIds.has(contact.id);
                const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || 'C';

                return (
                  <div 
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                    {isInProject ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" />
                        Agregado
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdd(contact.id)}
                        disabled={addingId === contact.id}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {addingId === contact.id ? 'Agregando...' : 'Agregar'}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}