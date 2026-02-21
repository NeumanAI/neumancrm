import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface AIDocumentSearchProps {
  onResults?: (results: string) => void;
}

export function AIDocumentSearch({ onResults }: AIDocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: `Busca documentos relacionados con: ${query}`,
          conversationId: null,
          currentRoute: '/documents',
        },
      });

      if (error) throw error;
      const response = data?.response || 'No se encontraron resultados.';
      setResult(response);
      onResults?.(response);
    } catch (err) {
      console.error('AI search error:', err);
      setResult('Error al realizar la búsqueda.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar con IA: ej. 'contratos del último mes'..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </div>
      {result && (
        <div className="p-4 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
