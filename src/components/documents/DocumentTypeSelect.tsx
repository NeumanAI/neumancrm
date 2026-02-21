import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentCategories } from '@/hooks/useDocumentCategories';

interface DocumentTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  includeAll?: boolean;
  placeholder?: string;
  className?: string;
}

export function DocumentTypeSelect({
  value,
  onValueChange,
  disabled,
  includeAll = false,
  placeholder = 'Tipo de documento',
  className,
}: DocumentTypeSelectProps) {
  const { allCategories } = useDocumentCategories();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Todos</SelectItem>}
        {allCategories.map((cat) => (
          <SelectItem key={cat.value} value={cat.value}>
            {cat.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
