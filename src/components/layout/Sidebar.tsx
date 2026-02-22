import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  UsersRound,
  MessageSquare,
  ShieldCheck,
  Store,
  FolderOpen,
  FileText,
  PenTool,
  Bot,
  FlaskConical,
  CalendarDays,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnreadConversationsCount } from '@/hooks/useConversations';
import { useBrandingContext } from '@/contexts/BrandingContext';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isSuperAdmin?: boolean;
  isResellerAdmin?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/conversations', icon: MessageSquare, label: 'Conversaciones', showBadge: true },
  { to: '/contacts', icon: Users, label: 'Contactos' },
  { to: '/companies', icon: Building2, label: 'Empresas' },
  { to: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
  { to: '/projects', icon: FolderOpen, label: 'Proyectos' },
  { to: '/tasks', icon: CheckSquare, label: 'Tareas' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendario' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/data-management', icon: Database, label: 'Datos' },
  { to: '/team', icon: UsersRound, label: 'Equipo' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

const adminNavItems = [
  { to: '/admin', icon: ShieldCheck, label: 'Administración', isAdmin: true },
];

const platformAINavItems = [
  { to: '/firma-digital', icon: PenTool, label: 'Firma Digital', isPlatformAI: true },
  { to: '/agentic-rag', icon: Bot, label: 'AgenticRAG', isPlatformAI: true },
  { to: '/labs', icon: FlaskConical, label: 'Labs', isPlatformAI: true },
];

const resellerNavItems = [
  { to: '/reseller-admin', icon: Store, label: 'Mis Clientes', isReseller: true },
];

export function Sidebar({ collapsed, onToggle, isSuperAdmin = false, isResellerAdmin = false, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const unreadCount = useUnreadConversationsCount();
  const { branding } = useBrandingContext();
  const { user, signOut } = useAuth();
  const { organization } = useTeam();
  
  let allNavItems = [...navItems];
  if (isResellerAdmin) {
    allNavItems = [...allNavItems, ...resellerNavItems];
  }
  if (isSuperAdmin) {
    allNavItems = [...allNavItems, ...adminNavItems];
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success('¡Hasta pronto!');
    navigate('/auth');
  };

  const handleNavClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const userInitials = user?.email
    ?.split('@')[0]
    .slice(0, 2)
    .toUpperCase() || 'U';

  // On mobile, don't render anything if not open
  if (isMobile && !isMobileOpen) return null;

  // On mobile, always show expanded (not collapsed)
  const isCollapsed = isMobile ? false : collapsed;

  const sidebarContent = (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50",
        isMobile ? "fixed top-0 left-0 w-[260px]" : "sticky top-0"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt={branding.name} 
              className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
            />
          ) : (
            <img src="/neuman-logo.png" alt="Neuman CRM" className="w-10 h-10 rounded-xl object-contain flex-shrink-0" />
          )}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-lg text-sidebar-foreground"
              >
                {branding.name}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto min-h-0">
        {allNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          const showBadge = 'showBadge' in item && item.showBadge && unreadCount > 0;
          const isAdminItem = 'isAdmin' in item && item.isAdmin;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-sidebar-accent',
                isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
                !isActive && 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                isAdminItem && 'border border-primary/20 bg-primary/5',
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isAdminItem && "text-primary")} />
                {showBadge && isCollapsed && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                )}
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between flex-1"
                  >
                    <span className={cn("font-medium text-sm", isAdminItem && "text-primary")}>{item.label}</span>
                    {showBadge && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Plataforma IA Section */}
      <div className="flex-shrink-0 border-t border-sidebar-border px-3 py-3 space-y-1">
        {!isCollapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500/70 px-3 mb-1">Plataforma IA</p>
        )}
        {platformAINavItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                'hover:bg-violet-500/10',
                isActive && 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
                !isActive && 'text-sidebar-foreground/60 hover:text-violet-500',
              )}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-violet-600 dark:text-violet-400" : "text-violet-500/70")} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-medium text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </div>

      {/* User Profile Section */}
      <div className="flex-shrink-0 border-t border-sidebar-border p-3 bg-sidebar">
        {isCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex justify-center">
                <Avatar className="h-9 w-9 border-2 border-sidebar-primary/30">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{organization?.name || 'Mi Cuenta'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
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
        ) : (
          <div className="space-y-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-sidebar-primary/30">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{organization?.name || 'Mi Cuenta'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { navigate('/settings'); handleNavClick(); }}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigate('/settings'); handleNavClick(); }}>
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

            <div className="text-center">
              <p className="text-[10px] text-sidebar-foreground/40">{branding.name} v1.0</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );

  // Mobile: render with backdrop overlay
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onMobileClose}
        />
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
}
