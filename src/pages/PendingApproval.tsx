import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, Mail, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const { organization, isLoading: teamLoading } = useTeam();
  const { isSuperAdmin, isLoading: adminLoading } = useSuperAdmin();
  const navigate = useNavigate();
  
  const isLoading = teamLoading || adminLoading;

  // Auto-refresh to check if approved
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Redirect if approved OR if user is Super Admin
  useEffect(() => {
    if (!isLoading && (organization?.is_approved || isSuperAdmin)) {
      navigate('/dashboard', { replace: true });
    }
  }, [organization, isLoading, isSuperAdmin, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !isLoading) {
      navigate('/auth', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
            >
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </motion.div>
            <CardTitle className="text-2xl">Cuenta Pendiente de Aprobación</CardTitle>
            <CardDescription className="text-base mt-2">
              Tu cuenta está siendo revisada por nuestro equipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Estamos verificando tu información para activar tu acceso al CRM. 
                Este proceso normalmente toma <strong>menos de 24 horas</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Te notificaremos por email</p>
                  <p className="text-muted-foreground text-xs">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Esta página se actualiza automáticamente</p>
                  <p className="text-muted-foreground text-xs">Cada 30 segundos</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar ahora
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              ¿Tienes preguntas? Contáctanos en{' '}
              <a href="mailto:soporte@neumancrm.com" className="text-primary hover:underline">
                soporte@neumancrm.com
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
