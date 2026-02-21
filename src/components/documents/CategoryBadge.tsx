import { Badge } from '@/components/ui/badge';
import { getCategoryInfo, CustomDocumentCategory } from '@/types/documents';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  documentType: string;
  customCategories?: CustomDocumentCategory[];
  className?: string;
}

export function CategoryBadge({ documentType, customCategories = [], className }: CategoryBadgeProps) {
  const info = getCategoryInfo(documentType, customCategories);

  return (
    <Badge
      variant="outline"
      className={cn(info.bgClass, info.textClass, info.borderClass, className)}
    >
      {info.label}
    </Badge>
  );
}
