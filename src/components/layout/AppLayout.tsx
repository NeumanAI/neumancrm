import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useResellerAdmin } from '@/hooks/useResellerAdmin';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DailyBriefModal } from './DailyBriefModal';
import { Loader2 } from 'lucide-react';
import { ChatProvider } from '@/contexts/ChatContext';
import { GlobalChatInput } from '@/components/chat/GlobalChatInput';
import { GlobalChatPanel } from '@/components/chat/GlobalChatPanel';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { organization, isLoading: teamLoading } = useTeam();
  const { isSuperAdmin, isLoading: adminLoading } = useSuperAdmin();
  const { isResellerAdmin, isLoading: resellerLoading } = useResellerAdmin();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Solo bloquear en auth y team - los checks de admin cargan en paralelo sin bloquear
  const isLoading = authLoading || teamLoading;

  // Redirect to pending approval if organization is not approved
  useEffect(() => {
    if (!isLoading && organization && !organization.is_approved && !isSuperAdmin) {
      navigate('/pending-approval', { replace: true });
    }
  }, [organization, isLoading, isSuperAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Don't render layout if redirecting to pending approval
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
          <main className="flex-1 overflow-auto p-6 pb-24">
            {children}
          </main>
        </div>
      </div>
      <GlobalChatInput />
      <GlobalChatPanel />
      <DailyBriefModal />
    </ChatProvider>
  );
}
