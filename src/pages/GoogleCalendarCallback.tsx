import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Conectando con Google Calendar...');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      toast.error('No se recibió código de autorización');
      navigate('/calendar');
      return;
    }

    const connect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Sesión expirada');
          navigate('/auth');
          return;
        }

        const redirectUri = `${window.location.origin}/auth/google-calendar-callback`;
        const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
          body: { action: 'connect', code, redirect_uri: redirectUri },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;
        toast.success(`Conectado como ${data.email}`);
      } catch (err: any) {
        toast.error('Error al conectar: ' + (err.message || 'Error desconocido'));
      } finally {
        navigate('/calendar');
      }
    };

    connect();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-64 mx-auto" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
