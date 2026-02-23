import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Impersonate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const email = searchParams.get('email');

    if (!tokenHash || !email) {
      setError('Parámetros de acceso inválidos.');
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });

        if (otpError) {
          console.error('OTP verification error:', otpError);
          setError(`Error al verificar acceso: ${otpError.message}`);
          setVerifying(false);
          return;
        }

        // Success - redirect to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Verification exception:', err);
        setError(err.message || 'Error inesperado al verificar acceso.');
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8 max-w-md">
        {verifying ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Verificando acceso...</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={() => window.close()}>
              Cerrar pestaña
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
