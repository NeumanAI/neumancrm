import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function Labs() {
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
            <FlaskConical className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Labs</h1>
          </div>
        </div>
      </div>
      
      {/* Contenido */}
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">En Construcción</h2>
            <p className="text-muted-foreground">
              Esta sección está siendo desarrollada. Pronto tendrás acceso a nuevas funcionalidades experimentales.
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
