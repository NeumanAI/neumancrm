import { useState } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { ClinicalNoteRecorder } from '@/components/clinical-notes/ClinicalNoteRecorder';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Stethoscope, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Consulta() {
  const { contacts } = useContacts();
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');

  const filtered = (contacts || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  if (selectedContact) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedContact(null)} className="text-sm text-muted-foreground hover:text-foreground">
            ← Cambiar paciente
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Nueva Consulta — {selectedContact.name}
          </h1>
        </div>
        <ClinicalNoteRecorder
          contactId={selectedContact.id}
          contactName={selectedContact.name}
          onSaved={() => setSelectedContact(null)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          Nueva Consulta
        </h1>
        <p className="text-muted-foreground mt-1">Selecciona un paciente para iniciar la nota clínica</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-2 max-w-md">
        {filtered.map((c) => (
          <Card
            key={c.id}
            className="cursor-pointer hover:shadow-sm hover:border-primary/40 transition-all"
            onClick={() => setSelectedContact({ id: c.id, name: `${c.first_name || ''} ${c.last_name || ''}`.trim() })}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && search && (
          <p className="text-sm text-muted-foreground py-4">No se encontraron pacientes</p>
        )}
      </div>
    </motion.div>
  );
}
