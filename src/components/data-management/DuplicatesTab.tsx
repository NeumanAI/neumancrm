import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  RefreshCw, 
  Loader2,
  ArrowRight,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { useDuplicates } from '@/hooks/useDuplicates';
import { Duplicate } from '@/types/data-management';
import MergeDialog from './MergeDialog';

export default function DuplicatesTab() {
  const { duplicates, isLoading, scanForDuplicates, updateDuplicateStatus, getDuplicateWithEntities } = useDuplicates();
  const [enrichedDuplicates, setEnrichedDuplicates] = useState<Duplicate[]>([]);
  const [selectedDuplicate, setSelectedDuplicate] = useState<Duplicate | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Enrich duplicates with entity data
  useEffect(() => {
    async function enrichDuplicates() {
      const enriched = await Promise.all(
        duplicates.map(d => getDuplicateWithEntities(d))
      );
      setEnrichedDuplicates(enriched);
    }
    
    if (duplicates.length > 0) {
      enrichDuplicates();
    } else {
      setEnrichedDuplicates([]);
    }
  }, [duplicates, getDuplicateWithEntities]);

  const handleScan = () => {
    scanForDuplicates.mutate(undefined);
  };

  const handleDismiss = (id: string) => {
    updateDuplicateStatus.mutate({ id, status: 'dismissed' });
  };

  const handleIgnore = (id: string) => {
    updateDuplicateStatus.mutate({ id, status: 'ignored' });
  };

  const handleMerge = (duplicate: Duplicate) => {
    setSelectedDuplicate(duplicate);
    setShowMergeDialog(true);
  };

  const getEntityDisplayName = (entity: Record<string, unknown> | undefined, type: string): string => {
    if (!entity) return 'Desconocido';
    
    if (type === 'contacts') {
      const first = entity.first_name || '';
      const last = entity.last_name || '';
      const fullName = `${first} ${last}`.trim();
      return fullName || String(entity.email || 'Sin nombre');
    }
    
    return String(entity.name || 'Sin nombre');
  };

  const getEntityDetails = (entity: Record<string, unknown> | undefined, type: string): { label: string; value: string }[] => {
    if (!entity) return [];
    
    if (type === 'contacts') {
      return [
        { label: 'Email', value: String(entity.email || '') },
        { label: 'Teléfono', value: String(entity.phone || '') },
        { label: 'Empresa', value: String(entity.company_name || '') },
      ].filter(d => d.value);
    }
    
    return [
      { label: 'Dominio', value: String(entity.domain || '') },
      { label: 'Sitio Web', value: String(entity.website || '') },
      { label: 'Industria', value: String(entity.industry || '') },
    ].filter(d => d.value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Detección de Duplicados
              </CardTitle>
              <CardDescription>
                Encuentra y fusiona registros duplicados en tu CRM
              </CardDescription>
            </div>
            <Button onClick={handleScan} disabled={scanForDuplicates.isPending}>
              {scanForDuplicates.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Escaneando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Buscar Duplicados
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : enrichedDuplicates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No se encontraron duplicados</p>
              <p className="text-sm text-muted-foreground mt-1">
                Haz click en "Buscar Duplicados" para escanear tu base de datos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Encontrados {enrichedDuplicates.length} posibles duplicados
              </p>
              
              {enrichedDuplicates.map((duplicate) => (
                <Card key={duplicate.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Entity 1 */}
                      <div className="flex-1 space-y-2">
                        <p className="font-semibold">
                          {getEntityDisplayName(duplicate.entity_1, duplicate.entity_type)}
                        </p>
                        {getEntityDetails(duplicate.entity_1, duplicate.entity_type).map((detail, i) => (
                          <p key={i} className="text-sm text-muted-foreground">
                            {detail.label}: {detail.value}
                          </p>
                        ))}
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center justify-center px-4 py-2">
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                        <Badge variant="secondary" className="mt-2">
                          {duplicate.similarity_score}%
                        </Badge>
                      </div>

                      {/* Entity 2 */}
                      <div className="flex-1 space-y-2">
                        <p className="font-semibold">
                          {getEntityDisplayName(duplicate.entity_2, duplicate.entity_type)}
                        </p>
                        {getEntityDetails(duplicate.entity_2, duplicate.entity_type).map((detail, i) => (
                          <p key={i} className="text-sm text-muted-foreground">
                            {detail.label}: {detail.value}
                          </p>
                        ))}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {duplicate.matching_fields?.map((field) => (
                          <Badge key={field} variant="outline">{field}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMerge(duplicate)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Fusionar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismiss(duplicate.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          No es duplicado
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIgnore(duplicate.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge Dialog */}
      {selectedDuplicate && (
        <MergeDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          duplicate={selectedDuplicate}
          onMergeComplete={() => {
            setSelectedDuplicate(null);
          }}
        />
      )}
    </div>
  );
}
