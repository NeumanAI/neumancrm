import { Badge } from '@/components/ui/badge';

export function useIsPreview() {
  const hostname = window.location.hostname;
  return hostname.includes('id-preview') || 
         hostname.includes('lovableproject') || 
         hostname.includes('localhost');
}

export function EnvironmentBadge() {
  const isPreview = useIsPreview();
  
  return (
    <Badge 
      variant={isPreview ? 'secondary' : 'default'}
      className="text-xs"
    >
      {isPreview ? '🧪 Entorno de pruebas' : '🌐 Producción'}
    </Badge>
  );
}
