import { Bot, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AgenticRAG() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-6">
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
  );
}
