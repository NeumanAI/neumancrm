import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useResellerAdmin } from '@/hooks/useResellerAdmin';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DailyBriefModal } from './DailyBriefModal';
import { Loader2, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import { ChatProvider } from '@/contexts/ChatContext';
import { CommandBar } from '@/components/ai/CommandBar';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AppLayoutProps {
  children: ReactNode;
}

const BOOT_TIMEOUT_MS = 10000;

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { organization, isLoading: teamLoading, isError: teamError, refetchAll } = useTeam();
  const { isSuperAdmin } = useSuperAdmin();
  const { isResellerAdmin } = useResellerAdmin();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [aiMinimized, setAiMinimized] = useState(() => sessionStorage.getItem('ai-assistant-minimized') === 'true');
  const navigate = useNavigate();

  const isLoading = authLoading || teamLoading;

  // Boot timeout
  useEffect(() => {
    if (!isLoading) { setBootTimedOut(false); return; }
    const timer = setTimeout(() => { if (isLoading) setBootTimedOut(true); }, BOOT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Redirect to pending approval
  useEffect(() => {
    if (!isLoading && organization && !organization.is_approved && !isSuperAdmin) {
      navigate('/pending-approval', { replace: true });
    }
  }, [organization, isLoading, isSuperAdmin, navigate]);

  const handleAiMinimizedChange = useCallback((minimized: boolean) => {
    setAiMinimized(minimized);
  }, []);

  // Error / timeout
  if (teamError || bootTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>
              {teamError ? 'Error al cargar tu cuenta' : 'La carga está tardando demasiado'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {teamError
                ? 'No pudimos cargar la información de tu equipo. Por favor intenta de nuevo.'
                : 'Parece que hay problemas de conexión. Puedes reintentar o cerrar sesión.'}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setBootTimedOut(false); refetchAll(); }} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (organization && !organization.is_approved && !isSuperAdmin) {
    return null;
  }

  return (
    <ChatProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          isSuperAdmin={isSuperAdmin}
          isResellerAdmin={isResellerAdmin}
        />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className={cn(
            "flex-1 overflow-auto p-6 transition-[padding] duration-200",
            aiMinimized ? 'pr-20' : 'pr-[27rem]'
          )}>
            {children}
          </main>
        </div>
      </div>
      <CommandBar />
      <AIAssistant onMinimizedChange={handleAiMinimizedChange} />
      <DailyBriefModal />
    </ChatProvider>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
