import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from 'use-debounce';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS, ContactType } from '@/lib/contactTypes';

interface ContactResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  contact_type?: string;
}

interface BuyerContactSearchProps {
  value: string | null;
  selectedContact?: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
  onChange: (contactId: string | null, contact?: ContactResult | null) => void;
}

export function BuyerContactSearch({ value, selectedContact, onChange }: BuyerContactSearchProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [results, setResults] = useState<ContactResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setResults([]);
      return;
    }
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, contact_type')
        .neq('contact_type', 'inactivo')
        .or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`)
        .limit(10);
      setResults((data as ContactResult[]) || []);
    };
    fetchContacts();
  }, [debouncedSearch]);

  if (value && selectedContact) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">
            {`${selectedContact.first_name?.[0] || ''}${selectedContact.last_name?.[0] || ''}`.toUpperCase() || 'C'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm flex-1">{selectedContact.first_name} {selectedContact.last_name} ({selectedContact.email})</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(null, null)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar contacto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          className="pl-8"
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
          {results.map((c) => {
            const cType = (c.contact_type || 'prospecto') as ContactType;
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer text-sm"
                onClick={() => {
                  onChange(c.id, c);
                  setSearch('');
                  setShowResults(false);
                }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {`${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1">{c.first_name} {c.last_name} — {c.email}</span>
                {cType !== 'prospecto' && (
                  <Badge variant="outline" className={`text-[10px] ${CONTACT_TYPE_COLORS[cType]}`}>
                    {CONTACT_TYPE_LABELS[cType]}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
