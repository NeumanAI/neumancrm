import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { 
  Sparkles, Loader2, Search, UserPlus, Building2, TrendingUp,
  CheckSquare, LayoutDashboard, MessageSquare, Users, Settings,
  FolderKanban, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action: () => void;
}

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced AI processing
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      processCommand(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setIsProcessing(false);
    }
  }, [open]);

  const processCommand = useCallback(async (q: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('interpret-command', {
        body: { query: q }
      });

      if (error) throw error;
      handleInterpretation(data);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Command error:', error);
      setResults([]);
    } finally {
      setIsProcessing(false);
    }
  }, [navigate]);

  function handleInterpretation(data: any) {
    const newResults: SearchResult[] = [];
    const { intent, params, description, suggested_route, search_results } = data;

    if (intent === 'navigate' && suggested_route) {
      newResults.push({
        id: 'nav-main',
        icon: <LayoutDashboard className="h-4 w-4" />,
        title: description || `Ir a ${suggested_route}`,
        subtitle: suggested_route,
        action: () => { navigate(suggested_route); setOpen(false); },
      });
    }

    if (intent === 'create') {
      newResults.push({
        id: 'create-main',
        icon: <Sparkles className="h-4 w-4 text-purple-500" />,
        title: description || `Crear ${params?.entity}`,
        subtitle: 'Se abrirá el formulario conversacional',
        action: () => {
          window.dispatchEvent(new CustomEvent('ai-create-entity', {
            detail: { entity: params?.entity, data: params?.data }
          }));
          setOpen(false);
        },
      });
    }

    if (intent === 'filter') {
      newResults.push({
        id: 'filter-main',
        icon: <Search className="h-4 w-4" />,
        title: description || 'Aplicar filtro',
        action: () => {
          if (params?.entity) navigate(`/${params.entity}`);
          setOpen(false);
        },
      });
    }

    // DB search results
    if (search_results && Array.isArray(search_results)) {
      search_results.forEach((r: any) => {
        const icons: Record<string, React.ReactNode> = {
          contact: <UserPlus className="h-4 w-4 text-blue-500" />,
          company: <Building2 className="h-4 w-4 text-green-500" />,
          opportunity: <TrendingUp className="h-4 w-4 text-amber-500" />,
        };
        newResults.push({
          id: `${r.type}-${r.id}`,
          icon: icons[r.type] || <Search className="h-4 w-4" />,
          title: r.title,
          subtitle: r.subtitle,
          action: () => { navigate(r.route); setOpen(false); },
        });
      });
    }

    setResults(newResults);
  }

  const quickActions: SearchResult[] = [
    { id: 'qa-contact', icon: <UserPlus className="h-4 w-4" />, title: 'Crear Contacto', action: () => { window.dispatchEvent(new CustomEvent('ai-create-entity', { detail: { entity: 'contact' } })); setOpen(false); } },
    { id: 'qa-company', icon: <Building2 className="h-4 w-4" />, title: 'Crear Empresa', action: () => { window.dispatchEvent(new CustomEvent('ai-create-entity', { detail: { entity: 'company' } })); setOpen(false); } },
    { id: 'qa-opp', icon: <TrendingUp className="h-4 w-4" />, title: 'Crear Oportunidad', action: () => { window.dispatchEvent(new CustomEvent('ai-create-entity', { detail: { entity: 'opportunity' } })); setOpen(false); } },
    { id: 'qa-pipeline', icon: <FolderKanban className="h-4 w-4" />, title: 'Ver Pipeline', action: () => { navigate('/pipeline'); setOpen(false); } },
    { id: 'qa-contacts', icon: <Users className="h-4 w-4" />, title: 'Ver Contactos', action: () => { navigate('/contacts'); setOpen(false); } },
    { id: 'qa-tasks', icon: <CheckSquare className="h-4 w-4" />, title: 'Ver Tareas', action: () => { navigate('/tasks'); setOpen(false); } },
    { id: 'qa-conversations', icon: <MessageSquare className="h-4 w-4" />, title: 'Conversaciones', action: () => { navigate('/conversations'); setOpen(false); } },
    { id: 'qa-data', icon: <Database className="h-4 w-4" />, title: 'Gestión de Datos', action: () => { navigate('/data-management'); setOpen(false); } },
    { id: 'qa-settings', icon: <Settings className="h-4 w-4" />, title: 'Configuración', action: () => { navigate('/settings'); setOpen(false); } },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Escribe un comando o busca... (lenguaje natural)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Interpretando comando...</span>
            </div>
          ) : query.length > 0 ? (
            <div className="py-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Escribe al menos 3 caracteres</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ejemplos: "crear contacto juan", "deals &gt; 50k", "ir a pipeline"
              </p>
            </div>
          ) : null}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Resultados">
            {results.map(result => (
              <CommandItem key={result.id} onSelect={result.action} className="gap-3">
                {result.icon}
                <div className="flex flex-col">
                  <span>{result.title}</span>
                  {result.subtitle && (
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.length === 0 && (
          <CommandGroup heading="Acciones rápidas">
            {quickActions.map(action => (
              <CommandItem key={action.id} onSelect={action.action} className="gap-3">
                {action.icon}
                <span>{action.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
