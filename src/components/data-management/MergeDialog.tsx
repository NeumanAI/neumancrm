import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDuplicates } from '@/hooks/useDuplicates';
import { useToast } from '@/hooks/use-toast';
import { Duplicate } from '@/types/data-management';
import { useQueryClient } from '@tanstack/react-query';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicate: Duplicate;
  onMergeComplete: () => void;
}

export default function MergeDialog({
  open,
  onOpenChange,
  duplicate,
  onMergeComplete,
}: MergeDialogProps) {
  const [selectedEntity, setSelectedEntity] = useState<'1' | '2'>('1');
  const [isMerging, setIsMerging] = useState(false);
  const { updateDuplicateStatus } = useDuplicates();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const entity1 = duplicate.entity_1 as Record<string, unknown> | undefined;
  const entity2 = duplicate.entity_2 as Record<string, unknown> | undefined;

  const getFields = () => {
    if (duplicate.entity_type === 'contacts') {
      return [
        { key: 'first_name', label: 'Nombre' },
        { key: 'last_name', label: 'Apellido' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'mobile', label: 'Celular' },
        { key: 'job_title', label: 'Cargo' },
        { key: 'department', label: 'Departamento' },
        { key: 'notes', label: 'Notas' },
      ];
    }
    return [
      { key: 'name', label: 'Nombre' },
      { key: 'domain', label: 'Dominio' },
      { key: 'website', label: 'Sitio Web' },
      { key: 'industry', label: 'Industria' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'address', label: 'Dirección' },
      { key: 'city', label: 'Ciudad' },
      { key: 'country', label: 'País' },
    ];
  };

  const handleMerge = async () => {
    setIsMerging(true);

    try {
      const keepId = selectedEntity === '1' ? duplicate.entity_id_1 : duplicate.entity_id_2;
      const deleteId = selectedEntity === '1' ? duplicate.entity_id_2 : duplicate.entity_id_1;
      const keepEntity = selectedEntity === '1' ? entity1 : entity2;
      const deleteEntity = selectedEntity === '1' ? entity2 : entity1;

      // Merge non-empty values from the deleted entity into the kept entity
      const mergedData: Record<string, unknown> = {};
      const fields = getFields();

      fields.forEach(({ key }) => {
        const keepValue = keepEntity?.[key];
        const deleteValue = deleteEntity?.[key];
        
        // If keep value is empty but delete value exists, use delete value
        if (!keepValue && deleteValue) {
          mergedData[key] = deleteValue;
        }
      });

      // Update the kept entity with merged data if there are any updates
      if (Object.keys(mergedData).length > 0) {
        const { error: updateError } = await supabase
          .from(duplicate.entity_type)
          .update(mergedData)
          .eq('id', keepId);

        if (updateError) throw updateError;
      }

      // Update references in related tables for contacts
      if (duplicate.entity_type === 'contacts') {
        await supabase.from('activities').update({ contact_id: keepId }).eq('contact_id', deleteId);
        await supabase.from('opportunities').update({ contact_id: keepId }).eq('contact_id', deleteId);
      }

      // Update references for companies
      if (duplicate.entity_type === 'companies') {
        await supabase.from('contacts').update({ company_id: keepId }).eq('company_id', deleteId);
        await supabase.from('opportunities').update({ company_id: keepId }).eq('company_id', deleteId);
        await supabase.from('activities').update({ company_id: keepId }).eq('company_id', deleteId);
      }

      // Delete the duplicate entity
      const { error: deleteError } = await supabase
        .from(duplicate.entity_type)
        .delete()
        .eq('id', deleteId);

      if (deleteError) throw deleteError;

      // Mark duplicate as merged
      await updateDuplicateStatus.mutateAsync({
        id: duplicate.id,
        status: 'merged',
        mergedInto: keepId,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [duplicate.entity_type] });

      toast({
        title: 'Registros fusionados',
        description: 'Los registros han sido fusionados exitosamente.',
      });

      onOpenChange(false);
      onMergeComplete();

    } catch (error: any) {
      toast({
        title: 'Error al fusionar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsMerging(false);
    }
  };

  if (!entity1 || !entity2) {
    return null;
  }

  const fields = getFields();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Fusionar Registros</DialogTitle>
          <DialogDescription>
            Selecciona qué registro mantener. Los datos vacíos se completarán con el otro registro.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedEntity}
          onValueChange={(value) => setSelectedEntity(value as '1' | '2')}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Entity 1 */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedEntity === '1' ? 'border-primary bg-primary/5' : 'border-muted'
              }`}
              onClick={() => setSelectedEntity('1')}
            >
              <div className="flex items-center gap-2 mb-3">
                <RadioGroupItem value="1" id="entity-1" />
                <Label htmlFor="entity-1" className="font-semibold cursor-pointer">
                  Mantener este
                </Label>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {fields.map(({ key, label }) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium truncate max-w-[60%]">
                        {String(entity1[key] || '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Entity 2 */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedEntity === '2' ? 'border-primary bg-primary/5' : 'border-muted'
              }`}
              onClick={() => setSelectedEntity('2')}
            >
              <div className="flex items-center gap-2 mb-3">
                <RadioGroupItem value="2" id="entity-2" />
                <Label htmlFor="entity-2" className="font-semibold cursor-pointer">
                  Mantener este
                </Label>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {fields.map(({ key, label }) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium truncate max-w-[60%]">
                        {String(entity2[key] || '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </RadioGroup>

        <Separator />

        <div className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Al fusionar, se mantendrá el registro seleccionado y se eliminarán referencias duplicadas. 
          Los datos faltantes se completarán con valores del otro registro.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isMerging}>
            {isMerging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fusionando...
              </>
            ) : (
              'Fusionar Registros'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
