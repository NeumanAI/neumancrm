import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Menu, LogOut, Settings, Sparkles, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GlobalProjectFilter } from '@/components/projects/GlobalProjectFilter';

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/': 'Dashboard',
  '/contacts': 'Contactos',
  '/companies': 'Empresas',
  '/pipeline': 'Pipeline',
  '/segmentos': 'Segmentos',
  '/proyectos': 'Proyectos',
  '/tasks': 'Tareas',
  '/calendar': 'Calendario',
  '/conversations': 'Conversaciones',
  '/data-management': 'Datos',
  '/team': 'Equipo',
  '/settings': 'Configuración',
  '/admin': 'Administración',
  '/cartera': 'Cartera',
};

function getGreeting(user: { email?: string; user_metadata?: { full_name?: string } } | null) {
  const hour = new Date().getHours();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 'Usuario';
  
  if (hour < 12) return `Buenos días, ${userName}`;
  if (hour < 18) return `Buenas tardes, ${userName}`;
  return `Buenas noches, ${userName}`;
}

function getPageName(pathname: string): string {
  return PAGE_NAMES[pathname] || pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'CRM';
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { organization } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  const handleSignOut = async () => {
    await signOut();
    toast.success('¡Hasta pronto!');
    navigate('/auth');
  };

  const userInitials = user?.email
    ?.split('@')[0]
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <header className="h-auto min-h-14 md:min-h-16 border-b border-border bg-card/95 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile: show page name */}
          <h1 className="text-base font-semibold md:hidden capitalize">
            {getPageName(location.pathname)}
          </h1>

          {/* Desktop: Greeting or Search */}
          {isDashboard ? (
            <div className="hidden md:block">
              <h1 className="text-xl font-semibold">{getGreeting(user)}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Tu asistente IA está listo para ayudarte
              </p>
            </div>
          ) : (
            <div
              className="relative hidden md:block cursor-pointer"
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
              }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contactos, empresas, deals..."
                readOnly
                className="w-80 pl-10 pr-16 bg-muted/50 border-0 focus-visible:ring-1 cursor-pointer"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Project Filter - hidden on mobile */}
          <div className="hidden md:block">
            <GlobalProjectFilter />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <NotificationBell />

          {/* User Menu - hidden on mobile (profile is in sidebar) */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {organization?.name || 'Mi Cuenta'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
