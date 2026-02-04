import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';

interface MagicLinkButtonProps {
  email: string;
  disabled?: boolean;
}

export function MagicLinkButton({ email, disabled }: MagicLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleMagicLink = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Ingresa un email válido primero');
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      
      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Demasiados intentos. Espera unos minutos.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('¡Enlace enviado! Revisa tu correo para acceder.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || isLoading}
      onClick={handleMagicLink}
    >
      <Wand2 className="mr-2 h-4 w-4" />
      {isLoading ? 'Enviando...' : 'Enviar enlace de acceso'}
    </Button>
  );
}
