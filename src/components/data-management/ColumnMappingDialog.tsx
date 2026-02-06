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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EntityType, ENTITY_FIELDS } from '@/types/data-management';
import { Check, X, AlertTriangle } from 'lucide-react';

// Valid fields per entity type - must match backend validation
const VALID_FIELDS: Record<EntityType, string[]> = {
  contacts: [
    'first_name', 'last_name', 'email', 'phone', 'mobile',
    'whatsapp_number', 'job_title', 'department', 'notes',
    'linkedin_url', 'twitter_url', 'instagram_username', 'source'
  ],
  companies: [
    'name', 'domain', 'website', 'industry', 'phone',
    'address', 'city', 'country', 'employee_count', 'revenue', 'description',
    'linkedin_url', 'twitter_url'
  ],
  opportunities: [
    'title', 'value', 'currency', 'probability', 'status',
    'expected_close_date', 'description'
  ],
  activities: [
    'title', 'type', 'description', 'due_date', 'priority', 'completed'
  ]
};

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

  // Check for invalid mappings (fields that don't exist in the target table)
  const invalidMappings = Object.entries(columnMapping).filter(
    ([_, targetField]) => !VALID_FIELDS[entityType].includes(targetField)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mapeo de Columnas</DialogTitle>
          <DialogDescription>
            Asocia las columnas de tu archivo con los campos de {entityType === 'contacts' ? 'contactos' : entityType === 'companies' ? 'empresas' : 'oportunidades'}
          </DialogDescription>
        </DialogHeader>

        {/* Warning for invalid mappings */}
        {invalidMappings.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Campos inválidos detectados:</strong> Los siguientes mapeos serán ignorados porque los campos no existen en la tabla {entityType}:
              <ul className="mt-2 list-disc list-inside">
                {invalidMappings.map(([source, target]) => (
                  <li key={source}>{source} → {target}</li>
                ))}
              </ul>
              Por favor, selecciona campos válidos o marca como "No mapear".
            </AlertDescription>
          </Alert>
        )}

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
