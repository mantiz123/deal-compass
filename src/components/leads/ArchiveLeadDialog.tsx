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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useArchiveLead, ArchiveReason, archiveReasonLabels } from '@/hooks/useArchiveLead';
import { Loader2, Archive } from 'lucide-react';

interface ArchiveLeadDialogProps {
  leadId: string | null;
  leadAddress?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchiveLeadDialog({
  leadId,
  leadAddress,
  open,
  onOpenChange,
}: ArchiveLeadDialogProps) {
  const [reason, setReason] = useState<ArchiveReason>('not_motivated');
  const [notes, setNotes] = useState('');
  const archiveMutation = useArchiveLead();

  const handleArchive = async () => {
    if (!leadId) return;
    
    await archiveMutation.mutateAsync({
      leadId,
      reason,
      notes: notes.trim() || undefined,
    });
    
    setReason('not_motivated');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-warning" />
            Archivar Lead (Kill Fast)
          </DialogTitle>
          <DialogDescription>
            {leadAddress ? (
              <>Archivando: <strong>{leadAddress}</strong></>
            ) : (
              'Selecciona la razón por la que este deal no funcionó.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">¿Por qué murió este deal?</Label>
            <RadioGroup
              value={reason}
              onValueChange={(value) => setReason(value as ArchiveReason)}
              className="grid grid-cols-1 gap-2"
            >
              {(Object.entries(archiveReasonLabels) as [ArchiveReason, string][]).map(
                ([value, label]) => (
                  <div
                    key={value}
                    className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value} className="flex-1 cursor-pointer">
                      {label}
                    </Label>
                  </div>
                )
              )}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Detalles adicionales sobre por qué no funcionó este deal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
          >
            {archiveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Archivando...
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archivar Lead
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
