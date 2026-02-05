import { NavLink, useLocation } from 'react-router-dom';
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
  Sparkles,
  Database,
  UsersRound,
  MessageSquare,
  ShieldCheck,
  Store,
  FolderOpen,
  PenTool,
  Bot,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnreadConversationsCount } from '@/hooks/useConversations';
import { useBrandingContext } from '@/contexts/BrandingContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isSuperAdmin?: boolean;
  isResellerAdmin?: boolean;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/conversations', icon: MessageSquare, label: 'Conversaciones', showBadge: true },
  { to: '/contacts', icon: Users, label: 'Contactos' },
  { to: '/companies', icon: Building2, label: 'Empresas' },
  { to: '/pipeline', icon: TrendingUp, label: 'Pipeline' },
  { to: '/projects', icon: FolderOpen, label: 'Proyectos' },
  { to: '/tasks', icon: CheckSquare, label: 'Tareas' },
  { to: '/data-management', icon: Database, label: 'Datos' },
  { to: '/team', icon: UsersRound, label: 'Equipo' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

const adminNavItems = [
  { to: '/admin', icon: ShieldCheck, label: 'Administración', isAdmin: true },
];

const platformAINavItems = [
  { to: '/admin/firma-digital', icon: PenTool, label: 'Firma Digital', isPlatformAI: true },
  { to: '/admin/agentic-rag', icon: Bot, label: 'AgenticRAG', isPlatformAI: true },
  { to: '/admin/labs', icon: FlaskConical, label: 'Labs', isPlatformAI: true },
];

const resellerNavItems = [
  { to: '/reseller-admin', icon: Store, label: 'Mis Clientes', isReseller: true },
];

export function Sidebar({ collapsed, onToggle, isSuperAdmin = false, isResellerAdmin = false }: SidebarProps) {
  const location = useLocation();
  const unreadCount = useUnreadConversationsCount();
  const { branding } = useBrandingContext();
  
  // Build nav items based on roles
  let allNavItems = [...navItems];
  if (isResellerAdmin) {
    allNavItems = [...allNavItems, ...resellerNavItems];
  }
  if (isSuperAdmin) {
    allNavItems = [...allNavItems, ...adminNavItems, ...platformAINavItems];
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen sticky top-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-40"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt={branding.name} 
              className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}
          <AnimatePresence>
            {!collapsed && (
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {allNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          const showBadge = 'showBadge' in item && item.showBadge && unreadCount > 0;
          const isAdminItem = 'isAdmin' in item && item.isAdmin;
          const isResellerItem = 'isReseller' in item && item.isReseller;
          const isPlatformAIItem = 'isPlatformAI' in item && item.isPlatformAI;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-sidebar-accent',
                isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
                !isActive && 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                isAdminItem && 'border border-primary/20 bg-primary/5',
                isPlatformAIItem && 'border border-violet-500/20 bg-violet-500/5 ml-4'
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isAdminItem && "text-primary", isPlatformAIItem && "text-violet-500")} />
                {showBadge && collapsed && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between flex-1"
                  >
                    <span className={cn("font-medium text-sm", isAdminItem && "text-primary", isPlatformAIItem && "text-violet-500")}>{item.label}</span>
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

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-sidebar-foreground/50 text-center"
            >
              {branding.name} v1.0
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
