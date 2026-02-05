import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function FirmaDigital() {
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
            <PenTool className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Firma Digital</h1>
          </div>
        </div>
      </div>
      
      {/* Iframe embebido sin barra de URL visible */}
      <div className="w-full h-[calc(100vh-65px)]">
        <iframe
          src="https://demo.stg.mifirmadigital.com/login"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Firma Digital"
        />
      </div>
    </div>
  );
}
