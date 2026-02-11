import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandingContext } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Sparkles, BarChart3, Users, Zap, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { MagicLinkButton } from '@/components/auth/MagicLinkButton';
import { EnvironmentBadge, useIsPreview } from '@/components/auth/EnvironmentBadge';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }).max(72),
});

type AuthMode = 'login' | 'forgot' | 'reset';

const FEATURES = [
  { icon: BarChart3, title: 'Pipeline Inteligente', desc: 'Visualiza y gestiona tu embudo de ventas con IA' },
  { icon: Users, title: 'Gestión de Contactos', desc: 'Organiza clientes, empresas y oportunidades' },
  { icon: MessageSquare, title: 'Conversaciones Omnicanal', desc: 'WhatsApp, email y más en un solo lugar' },
  { icon: Zap, title: 'Automatización con IA', desc: 'Asistente inteligente que aprende de tu equipo' },
];

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const { signIn, signUp, user } = useAuth();
  const { branding, isWhiteLabel } = useBrandingContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = useIsPreview();

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const hash = window.location.hash;
    if (urlMode === 'reset' || hash.includes('type=recovery')) setMode('reset');
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== 'reset') navigate('/dashboard');
  }, [user, navigate, mode]);

  const handleSubmit = async (submitMode: 'signin' | 'signup') => {
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }

    setIsLoading(true);
    try {
      if (submitMode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) toast.error('Credenciales inválidas. Verifica tu email y contraseña.');
          else if (error.message.includes('Email not confirmed')) toast.error('Por favor confirma tu email antes de iniciar sesión.');
          else toast.error(error.message);
        } else { toast.success('¡Bienvenido de vuelta!'); navigate('/dashboard'); }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) toast.error('Este email ya está registrado. Intenta iniciar sesión.');
          else toast.error(error.message);
        } else { toast.success('¡Cuenta creada exitosamente!'); navigate('/dashboard'); }
      }
    } finally { setIsLoading(false); }
  };

  const handleDevLogin = async () => {
    const devEmail = 'dev@neumancrm.com';
    const devPassword = 'dev123456';
    setEmail(devEmail); setPassword(devPassword); setIsLoading(true);
    try {
      const { error: signInError } = await signIn(devEmail, devPassword);
      if (signInError) {
        const { error: signUpError } = await signUp(devEmail, devPassword);
        if (signUpError && !signUpError.message.includes('User already registered')) { toast.error('Error creando cuenta de desarrollo: ' + signUpError.message); return; }
        const { error: retryError } = await signIn(devEmail, devPassword);
        if (retryError) { toast.error('Error al iniciar sesión con cuenta de desarrollo'); return; }
      }
      toast.success('¡Bienvenido al modo desarrollo!'); navigate('/dashboard');
    } finally { setIsLoading(false); }
  };

  // Overlay wrapper for reset/forgot modes
  const OverlayWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
        {children}
      </motion.div>
    </div>
  );

  if (mode === 'reset') return <OverlayWrapper><ResetPasswordForm /></OverlayWrapper>;
  if (mode === 'forgot') return <OverlayWrapper><ForgotPasswordForm onBack={() => setMode('login')} /></OverlayWrapper>;

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-12 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.name} className="w-10 h-10 rounded-xl object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-xl font-bold text-white">{branding.name}</span>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <h2 className="text-3xl font-bold text-white leading-tight">
            {isWhiteLabel ? `Bienvenido a ${branding.name}` : 'Tu CRM conversacional con inteligencia artificial'}
          </h2>
          <p className="text-white/60 text-sm">
            Gestiona ventas, contactos y conversaciones desde un solo lugar.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              className="glass-dark rounded-xl p-4"
            >
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-white text-sm font-medium">{f.title}</p>
              <p className="text-white/50 text-xs mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <p className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} {branding.name}. Todos los derechos reservados.
        </p>
      </div>

      {/* Right panel - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.name} className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
            ) : (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shadow-lg mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">{branding.name}</h1>
          </div>

          <EnvironmentBadge />

          <Card className="border shadow-sm bg-card">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signin'); }}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
                    <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-3">
                    <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
                      {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <MagicLinkButton email={email} disabled={isLoading} />
                    {isPreview && (
                      <Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={handleDevLogin}>
                        🔧 Usar cuenta de desarrollo
                      </Button>
                    )}
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('signup'); }}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
                    <CardDescription>Comienza a gestionar tus clientes con IA</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
                      {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
