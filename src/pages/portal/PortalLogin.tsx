import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/hooks/useBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'email' | 'set_password' | 'login' | 'success';

export default function PortalLogin() {
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get('org') || '';
  const { branding } = useBranding(orgSlug || undefined);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Apply org colors
  useEffect(() => {
    if (!branding?.primary_color) return;
    const hex = branding.primary_color;
    const r2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!r2) return;
    let rv = parseInt(r2[1], 16) / 255,
      gv = parseInt(r2[2], 16) / 255,
      bv = parseInt(r2[3], 16) / 255;
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
    document.documentElement.style.setProperty('--primary', `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`);
  }, [branding]);

  // Step 1: Check email
  const handleCheckEmail = async () => {
    if (!email || !orgSlug) {
      toast.error('Ingresa tu email');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_portal_email', {
        p_org_slug: orgSlug,
        p_email: email.toLowerCase().trim(),
      } as any);

      if (error) throw error;
      const contact = (data as any[])?.[0];
      if (!contact) {
        toast.error('No encontramos una cuenta con este email. Contacta a tu asesor.');
        setLoading(false);
        return;
      }
      if (contact.is_blocked) {
        toast.error('Tu acceso ha sido suspendido. Contacta a tu asesor.');
        setLoading(false);
        return;
      }

      setFirstName(contact.first_name || '');
      if (contact.already_registered) {
        setStep('login');
      } else {
        setStep('set_password');
      }
    } catch (err) {
      toast.error('Error al verificar el email');
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: Register
  const handleRegister = async () => {
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_slug: orgSlug, email: email.toLowerCase().trim(), password }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Auto-login after registration
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (loginError) throw loginError;
      setStep('success');
      setTimeout(() => navigate('/portal/cartera'), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Login
  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error('Contraseña incorrecta. Intenta de nuevo.');
      return;
    }
    navigate('/portal/cartera');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      {/* Logo */}
      <div className="mb-6">
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt={branding.name} className="h-12 max-w-[180px] object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
            {branding?.name?.charAt(0) || 'P'}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">Portal de Clientes</p>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-4">
          {/* STEP 1: Email */}
          {step === 'email' && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Ingresa tu email para acceder a tu portal
              </p>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={handleCheckEmail} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continuar
              </Button>
            </>
          )}

          {/* STEP 2a: Set password (first time) */}
          {step === 'set_password' && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('email')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-medium">
                  Bienvenido{firstName ? `, ${firstName}` : ''}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Es tu primera vez aquí. Crea una contraseña para tu portal.
              </p>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
              <Button className="w-full" onClick={handleRegister} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear cuenta y entrar
              </Button>
            </>
          )}

          {/* STEP 2b: Login */}
          {step === 'login' && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('email')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-medium">
                  Hola{firstName ? `, ${firstName}` : ''}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ingresar
              </Button>
            </>
          )}

          {/* STEP 3: Success */}
          {step === 'success' && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-medium">¡Cuenta creada!</p>
              <p className="text-sm text-muted-foreground">Entrando a tu portal...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6">
        ¿Problemas para ingresar? Contacta a tu asesor.
      </p>
    </div>
  );
}
