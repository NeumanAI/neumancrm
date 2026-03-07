import { useEffect } from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { usePortalSession } from '@/hooks/useClientPortal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, CalendarDays, FileText, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PortalSession } from '@/hooks/useClientPortal';

export default function PortalLayout() {
  const { user, loading: authLoading } = useAuth();
  const { data: session, isLoading: sessionLoading } = usePortalSession();
  const navigate = useNavigate();

  // Apply org colors
  useEffect(() => {
    if (!session) return;
    const root = document.documentElement;
    const hexToHsl = (hex: string) => {
      const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!r) return '217 91% 60%';
      let rv = parseInt(r[1], 16) / 255,
        gv = parseInt(r[2], 16) / 255,
        bv = parseInt(r[3], 16) / 255;
      const max = Math.max(rv, gv, bv),
        min = Math.min(rv, gv, bv);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rv: h = ((gv - bv) / d + (gv < bv ? 6 : 0)) / 6; break;
          case gv: h = ((bv - rv) / d + 2) / 6; break;
          case bv: h = ((rv - gv) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    if (session.org_primary_color) root.style.setProperty('--primary', hexToHsl(session.org_primary_color));
  }, [session]);

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/portal/login" replace />;

  if (session?.is_blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-5xl">🚫</div>
          <h1 className="text-2xl font-bold">Acceso suspendido</h1>
          <p className="text-muted-foreground">Tu acceso al portal ha sido suspendido. Contacta a tu asesor para más información.</p>
          <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate('/portal/login'))}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Cuenta no encontrada</h1>
          <p className="text-muted-foreground">Tu cuenta no está vinculada a ningún portal activo.</p>
          <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate('/portal/login'))}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/portal/cartera', icon: CreditCard, label: 'Mi Cartera' },
    { to: '/portal/citas', icon: CalendarDays, label: 'Mis Citas' },
    { to: '/portal/documentos', icon: FileText, label: 'Documentos' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session.org_logo ? (
              <img src={session.org_logo} alt={session.org_name} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <span className="font-bold text-lg text-primary">{session.org_name}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              <User className="h-3.5 w-3.5 inline mr-1" />
              {session.contact_first_name}
            </span>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate('/portal/login'))}>
              <LogOut className="h-4 w-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b bg-card">
        <div className="max-w-4xl mx-auto flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        <Outlet context={session} />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Portal de clientes · {session.org_name}
      </footer>
    </div>
  );
}
