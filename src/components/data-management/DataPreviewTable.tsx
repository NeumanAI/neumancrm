import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { EntityType, ENTITY_FIELDS } from '@/types/data-management';
import { Check, X } from 'lucide-react';

interface DataPreviewTableProps {
  data: Record<string, unknown>[];
  headers: string[];
  columnMapping: Record<string, string>;
  entityType: EntityType;
}

export default function DataPreviewTable({
  data,
  headers,
  columnMapping,
  entityType,
}: DataPreviewTableProps) {
  const fields = ENTITY_FIELDS[entityType];
  const requiredFields = fields.filter(f => f.required).map(f => f.field);

  const getMappedFieldLabel = (header: string) => {
    const mappedField = columnMapping[header];
    if (!mappedField) return null;
    
    const field = fields.find(f => f.field === mappedField);
    return field?.label || mappedField;
  };

  const isHeaderMapped = (header: string) => {
    return !!columnMapping[header];
  };

  const isMappedToRequired = (header: string) => {
    return requiredFields.includes(columnMapping[header]);
  };

  return (
    <ScrollArea className="w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => {
              const mapped = isHeaderMapped(header);
              const mappedLabel = getMappedFieldLabel(header);
              const isRequired = isMappedToRequired(header);

              return (
                <TableHead key={header} className="min-w-[150px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      {mapped ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="truncate">{header}</span>
                    </div>
                    {mapped && (
                      <Badge 
                        variant={isRequired ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        → {mappedLabel}
                      </Badge>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={header} className="truncate max-w-[200px]">
                  {String(row[header] || '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
