import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocumentCategories } from '@/hooks/useDocumentCategories';
import { BASE_DOCUMENT_CATEGORIES } from '@/types/documents';
import { Badge } from '@/components/ui/badge';

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageCategoriesDialog({ open, onOpenChange }: ManageCategoriesDialogProps) {
  const { customCategories, createCategory, deleteCategory } = useDocumentCategories();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    createCategory.mutate({ name: newName.trim(), slug, color: newColor });
    setNewName('');
    setNewColor('#6B7280');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar categorías</DialogTitle>
          <DialogDescription>Categorías base y personalizadas para documentos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Base categories */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Categorías base (no editables)</Label>
            <div className="flex flex-wrap gap-2">
              {BASE_DOCUMENT_CATEGORIES.map((cat) => (
                <Badge key={cat.value} variant="outline" className={`${cat.bgClass} ${cat.textClass} ${cat.borderClass}`}>
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom categories */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Categorías personalizadas</Label>
            {customCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin categorías personalizadas.</p>
            ) : (
              <div className="space-y-2">
                {customCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-2 rounded-lg border">
                    <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteCategory.mutate(cat.id)}
                      disabled={deleteCategory.isPending}
                    >
                      {deleteCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new */}
          <div className="space-y-3 border-t pt-4">
            <Label>Nueva categoría</Label>
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre" className="flex-1" />
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
              <Button onClick={handleCreate} disabled={!newName.trim() || createCategory.isPending} size="icon">
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
