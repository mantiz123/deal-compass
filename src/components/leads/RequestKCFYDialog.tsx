import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, HandshakeIcon, ShieldCheck } from 'lucide-react';
import { useCreateKCFYRequest, useKCFYRequestForLead, type KCFYPriority } from '@/hooks/useKCFYRequests';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RequestKCFYDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadAddress?: string;
  estimatedDealValue?: number | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'warning' | 'accent' | 'glow' }> = {
  pending: { label: 'Pendiente revisión', variant: 'warning' },
  accepted: { label: 'Aceptada', variant: 'accent' },
  in_progress: { label: 'En curso', variant: 'glow' },
  closed: { label: 'Cerrada', variant: 'secondary' },
  rejected: { label: 'Rechazada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

export function RequestKCFYDialog({ open, onOpenChange, leadId, leadAddress, estimatedDealValue }: RequestKCFYDialogProps) {
  const { data: existingRequest, isLoading } = useKCFYRequestForLead(leadId);
  const createRequest = useCreateKCFYRequest();

  const [priority, setPriority] = useState<KCFYPriority>('normal');
  const [notes, setNotes] = useState('');
  const [dealValue, setDealValue] = useState(estimatedDealValue?.toString() ?? '');

  const handleSubmit = async () => {
    await createRequest.mutateAsync({
      lead_id: leadId,
      priority,
      notes: notes.trim() || undefined,
      deal_value_estimate: dealValue ? parseFloat(dealValue) : null,
    });
    onOpenChange(false);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandshakeIcon className="h-5 w-5 text-primary" />
            KCFY — Klose Closes For You
          </DialogTitle>
          <DialogDescription>
            Solicita que el equipo de Klose cierre este deal por ti. Recibirás <strong>60%</strong> de la fee de asignación cuando se cierre.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : existingRequest ? (
          <Card variant="glass" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado actual</span>
              <Badge variant={STATUS_LABELS[existingRequest.status]?.variant || 'secondary'}>
                {STATUS_LABELS[existingRequest.status]?.label || existingRequest.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Solicitada el {format(new Date(existingRequest.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}</p>
              <p>Prioridad: <span className="font-medium capitalize">{existingRequest.priority}</span></p>
              {existingRequest.deal_value_estimate && (
                <p>Valor estimado: <span className="font-medium">${Number(existingRequest.deal_value_estimate).toLocaleString()}</span></p>
              )}
            </div>
            {existingRequest.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Tus notas:</p>
                <p className="text-sm">{existingRequest.notes}</p>
              </div>
            )}
            <div className="flex items-start gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>El equipo de Klose te contactará pronto. Mientras tanto puedes seguir trabajando el lead.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {leadAddress && (
              <div className="text-sm bg-muted/50 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Lead a cerrar</p>
                <p className="font-medium">{leadAddress}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="kcfy-priority">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as KCFYPriority)}>
                <SelectTrigger id="kcfy-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja — sin apuro</SelectItem>
                  <SelectItem value="normal">Normal — esta semana</SelectItem>
                  <SelectItem value="high">Alta — en 48h</SelectItem>
                  <SelectItem value="urgent">Urgente — hoy mismo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kcfy-deal-value">Valor estimado del deal (fee de asignación) — opcional</Label>
              <Input
                id="kcfy-deal-value"
                type="number"
                placeholder="Ej. 8000"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
              />
              {dealValue && parseFloat(dealValue) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tu corte (60%): <span className="font-semibold text-primary">${(parseFloat(dealValue) * 0.6).toLocaleString()}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kcfy-notes">Contexto del lead (opcional)</Label>
              <Textarea
                id="kcfy-notes"
                placeholder="Última conversación, motivación del seller, objeciones, plazos..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded p-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                Al enviar, el equipo Klose tendrá acceso al lead para contactar al seller, negociar y firmar el contrato. Tu split queda registrado al <strong>60%</strong>.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!existingRequest && (
            <Button onClick={handleSubmit} disabled={createRequest.isPending}>
              {createRequest.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><HandshakeIcon className="mr-2 h-4 w-4" /> Enviar solicitud KCFY</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
