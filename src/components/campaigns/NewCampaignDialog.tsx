import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Mail, MessageSquare, GripVertical, ShieldCheck } from 'lucide-react';
import { useCreateCampaign, type CampaignSequence } from '@/hooks/useCampaigns';

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadStatus = 'captacion' | 'contacto' | 'bajo_contrato' | 'cesion' | 'cerrado';

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'captacion', label: 'Captación' },
  { value: 'contacto', label: 'Contacto' },
  { value: 'bajo_contrato', label: 'Bajo Contrato' },
  { value: 'cesion', label: 'Cesión' },
];

type SequenceInput = Omit<CampaignSequence, 'id' | 'campaign_id' | 'created_at'>;

export function NewCampaignDialog({ open, onOpenChange }: NewCampaignDialogProps) {
  const createCampaign = useCreateCampaign();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerStatus, setTriggerStatus] = useState<LeadStatus>('captacion');
  const [sequences, setSequences] = useState<SequenceInput[]>([
    { sequence_order: 1, channel: 'email', delay_days: 0, delay_hours: 0, subject: '', content: '' }
  ]);

  const addSequence = () => {
    setSequences([
      ...sequences,
      { 
        sequence_order: sequences.length + 1, 
        channel: 'email', 
        delay_days: 1, 
        delay_hours: 0, 
        subject: '', 
        content: '' 
      }
    ]);
  };

  const removeSequence = (index: number) => {
    setSequences(sequences.filter((_, i) => i !== index));
  };

  const updateSequence = (index: number, field: keyof SequenceInput, value: any) => {
    const updated = [...sequences];
    updated[index] = { ...updated[index], [field]: value };
    setSequences(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createCampaign.mutateAsync({
      name,
      description: description || undefined,
      trigger_status: triggerStatus,
      sequences,
    });

    // Reset form
    setName('');
    setDescription('');
    setTriggerStatus('captacion');
    setSequences([{ sequence_order: 1, channel: 'email', delay_days: 0, delay_hours: 0, subject: '', content: '' }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Campaña de Drip Marketing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Campaña</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Seguimiento Captación"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el objetivo de esta campaña..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Activar cuando el lead entre a:</Label>
              <Select value={triggerStatus} onValueChange={(v) => setTriggerStatus(v as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sequences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Secuencia de Mensajes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSequence}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Paso
              </Button>
            </div>

            <div className="space-y-4">
              {sequences.map((seq, index) => (
                <Card key={index} className="p-4 relative">
                  <div className="flex items-center gap-2 mb-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">Paso {index + 1}</Badge>
                    {index > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Esperar</span>
                        <Input
                          type="number"
                          min="0"
                          className="w-16 h-8"
                          value={seq.delay_days}
                          onChange={(e) => updateSequence(index, 'delay_days', parseInt(e.target.value) || 0)}
                        />
                        <span>días</span>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          className="w-16 h-8"
                          value={seq.delay_hours}
                          onChange={(e) => updateSequence(index, 'delay_hours', parseInt(e.target.value) || 0)}
                        />
                        <span>horas</span>
                      </div>
                    )}
                    {sequences.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-destructive"
                        onClick={() => removeSequence(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={seq.channel === 'email' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSequence(index, 'channel', 'email')}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                      <Button
                        type="button"
                        variant={seq.channel === 'sms' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSequence(index, 'channel', 'sms')}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        SMS
                      </Button>
                    </div>

                    {seq.channel === 'email' && (
                      <Input
                        placeholder="Asunto del email"
                        value={seq.subject || ''}
                        onChange={(e) => updateSequence(index, 'subject', e.target.value)}
                      />
                    )}

                    <Textarea
                      placeholder={seq.channel === 'email' 
                        ? 'Contenido del email. Usa {{nombre}} para personalizar.'
                        : 'Mensaje SMS (máx 160 caracteres). Usa {{nombre}} para personalizar.'
                      }
                      value={seq.content}
                      onChange={(e) => updateSequence(index, 'content', e.target.value)}
                      rows={seq.channel === 'email' ? 4 : 2}
                      maxLength={seq.channel === 'sms' ? 160 : undefined}
                      required
                    />
                    {seq.channel === 'sms' && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground text-right">
                          {seq.content.length}/160 caracteres
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />
                          Solo se envía a teléfonos sin DNC. Respuestas STOP desuscriben al lead automáticamente.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Info Banner */}
          <Card className="p-4 bg-info/10 border-info/30">
            <p className="text-sm text-info">
              <strong>Nota:</strong> Los emails se envían vía Resend (límite 50/día). Los SMS se envían vía Twilio —
              requiere configurar <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> y{' '}
              <code>TWILIO_PHONE_NUMBER</code> en Supabase Secrets.
              Los leads con DNC activo son excluidos automáticamente al momento del envío.
            </p>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCampaign.isPending || !name || sequences.some(s => !s.content)}>
              {createCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Campaña
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
