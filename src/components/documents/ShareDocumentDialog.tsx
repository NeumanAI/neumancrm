import { useState } from 'react';
import { Copy, ExternalLink, Loader2, LinkIcon, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  isShared: boolean;
  shareToken?: string;
  shareViews?: number;
  onShare: (expiresInDays?: number) => Promise<string>;
  onRevoke: () => Promise<void>;
  isLoading: boolean;
}

export function ShareDocumentDialog({
  open,
  onOpenChange,
  documentName,
  isShared,
  shareToken,
  shareViews = 0,
  onShare,
  onRevoke,
  isLoading,
}: ShareDocumentDialogProps) {
  const [expiry, setExpiry] = useState<string>('7');

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : '';

  const handleShare = async () => {
    const days = expiry === 'never' ? undefined : parseInt(expiry);
    await onShare(days);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copiado al portapapeles');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir documento</DialogTitle>
          <DialogDescription className="truncate">
            {documentName}
          </DialogDescription>
        </DialogHeader>

        {isShared && shareToken ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link de descarga</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Vistas: {shareViews}
            </p>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={onRevoke}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                Revocar link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expiración</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 día</SelectItem>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="never">Sin expiración</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleShare} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                Generar link
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
