import type { Raeume } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface RaeumeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Raeume | null;
  onEdit: (record: Raeume) => void;
}

export function RaeumeViewDialog({ open, onClose, record, onEdit }: RaeumeViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Räume anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Raumname</Label>
            <p className="text-sm">{record.fields.raumname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gebäude</Label>
            <p className="text-sm">{record.fields.gebaeude ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kapazität</Label>
            <p className="text-sm">{record.fields.kapazitaet ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}