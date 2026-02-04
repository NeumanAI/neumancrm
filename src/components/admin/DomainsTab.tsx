import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Globe, Check, Clock, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrganizationDomain {
  id: string;
  organization_id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  organization_name?: string;
}

interface DomainsTabProps {
  domains: OrganizationDomain[];
  isLoading: boolean;
  onDeleteDomain: (domainId: string) => void;
  isDeleting: boolean;
}

export function DomainsTab({ domains, isLoading, onDeleteDomain, isDeleting }: DomainsTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay dominios configurados</p>
        <p className="text-sm mt-2">
          Configura dominios desde la edición de cada organización
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dominio</TableHead>
          <TableHead>Organización</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Verificado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {domains.map((domain) => (
          <TableRow key={domain.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{domain.domain}</span>
                {domain.is_primary && (
                  <Badge variant="secondary" className="text-xs">
                    Principal
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground">
                {domain.organization_name || domain.organization_id}
              </span>
            </TableCell>
            <TableCell>
              {domain.is_verified ? (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Verificado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendiente
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {domain.verified_at ? (
                <span className="text-sm text-muted-foreground">
                  {format(new Date(domain.verified_at), "d MMM yyyy", { locale: es })}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDeleteDomain(domain.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
