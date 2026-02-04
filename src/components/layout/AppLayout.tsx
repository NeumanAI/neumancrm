import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const { user, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ChatProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
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
