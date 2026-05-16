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
import { Loader2, Phone, Mail, MessageSquare, FileText, DollarSign, Clock } from 'lucide-react';
import { useCreateInteraction } from '@/hooks/useInteractions';

interface NewInteractionDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const interactionTypes = [
  { value: 'call', label: 'Llamada', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'note', label: 'Nota', icon: FileText },
  { value: 'offer', label: 'Oferta', icon: DollarSign },
  { value: 'followup', label: 'Seguimiento', icon: Clock },
];

const sentiments = [
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negativo' },
];

const directions = [
  { value: 'outgoing', label: 'Saliente' },
  { value: 'incoming', label: 'Entrante' },
];

export function NewInteractionDialog({ leadId, open, onOpenChange }: NewInteractionDialogProps) {
  const createInteraction = useCreateInteraction();
  const [type, setType] = useState('call');
  const [direction, setDirection] = useState('outgoing');
  const [sentiment, setSentiment] = useState('neutral');
  const [content, setContent] = useState('');
  const [smsPhone, setSmsPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For SMS, prepend the phone number to content so it's visible in the timeline
    let finalContent = content || null;
    if (type === 'sms' && smsPhone.trim()) {
      finalContent = `[SMS] To: ${smsPhone.trim()}\n\n${content}`.trim();
    }

    await createInteraction.mutateAsync({
      lead_id: leadId,
      interaction_type: type,
      direction,
      sentiment,
      content: finalContent,
    });

    setType('call');
    setDirection('outgoing');
    setSentiment('neutral');
    setContent('');
    setSmsPhone('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Interacción</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Interaction Type */}
          <div className="space-y-2">
            <Label>Tipo de interacción</Label>
            <div className="grid grid-cols-3 gap-2">
              {interactionTypes.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant={type === item.value ? 'default' : 'outline'}
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => setType(item.value)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {directions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sentiment */}
          <div className="space-y-2">
            <Label>Sentimiento</Label>
            <Select value={sentiment} onValueChange={setSentiment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sentiments.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SMS phone field — only shown when SMS type is selected */}
          {type === 'sms' && (
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                placeholder="Ej: (555) 123-4567"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label>Notas / Contenido</Label>
            <Textarea
              placeholder={type === 'sms' ? 'Mensaje enviado o recibido...' : 'Describe la interacción...'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createInteraction.isPending}>
              {createInteraction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
