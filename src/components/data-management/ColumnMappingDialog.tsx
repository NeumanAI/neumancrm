import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { EntityType, ENTITY_FIELDS } from '@/types/data-management';
import { Check, X } from 'lucide-react';

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  columnMapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  entityType: EntityType;
}

export default function ColumnMappingDialog({
  open,
  onOpenChange,
  headers,
  columnMapping,
  onMappingChange,
  entityType,
}: ColumnMappingDialogProps) {
  const fields = ENTITY_FIELDS[entityType];

  const handleMappingChange = (header: string, field: string) => {
    const newMapping = { ...columnMapping };
    
    if (field === 'none') {
      delete newMapping[header];
    } else {
      // Remove any existing mapping to this field
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === field && key !== header) {
          delete newMapping[key];
        }
      });
      newMapping[header] = field;
    }
    
    onMappingChange(newMapping);
  };

  const getMappedField = (header: string) => {
    return columnMapping[header] || 'none';
  };

  const isFieldMapped = (field: string) => {
    return Object.values(columnMapping).includes(field);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mapeo de Columnas</DialogTitle>
          <DialogDescription>
            Asocia las columnas de tu archivo con los campos de {entityType === 'contacts' ? 'contactos' : entityType === 'companies' ? 'empresas' : 'oportunidades'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {headers.map((header) => {
              const mappedField = getMappedField(header);
              const isMapped = mappedField !== 'none';

              return (
                <div key={header} className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium truncate">{header}</span>
                    {isMapped ? (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Select
                      value={mappedField}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">No mapear</span>
                        </SelectItem>
                        {fields.map((field) => {
                          const alreadyMapped = isFieldMapped(field.field) && columnMapping[header] !== field.field;
                          return (
                            <SelectItem
                              key={field.field}
                              value={field.field}
                              disabled={alreadyMapped}
                            >
                              <span className="flex items-center gap-2">
                                {field.label}
                                {field.required && (
                                  <Badge variant="secondary" className="text-xs">Requerido</Badge>
                                )}
                                {alreadyMapped && (
                                  <span className="text-xs text-muted-foreground">(ya mapeado)</span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {Object.keys(columnMapping).length} de {headers.length} columnas mapeadas
          </div>
          <div className="flex gap-2">
            {fields.filter(f => f.required && !isFieldMapped(f.field)).map(f => (
              <Badge key={f.field} variant="destructive">
                Falta: {f.label}
              </Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
