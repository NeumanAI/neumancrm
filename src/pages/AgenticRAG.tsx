import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AgenticRAG() {
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading } = useSuperAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header con navegación */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">AgenticRAG</h1>
          </div>
        </div>
      </div>
      
      {/* Contenido placeholder */}
      <div className="flex flex-col items-center justify-center h-[calc(100vh-65px)] gap-6">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-12 w-12 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">AgenticRAG</h2>
          <p className="text-muted-foreground text-lg">En Desarrollo</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Sistema de IA agéntica con capacidades RAG avanzadas.
            Próximamente disponible.
          </p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700">
          <Cpu className="h-4 w-4 mr-1" />
          Próximamente
        </Badge>
      </div>
    </div>
  );
}
