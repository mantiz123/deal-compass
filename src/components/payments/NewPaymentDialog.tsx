import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useCreatePayment, PaymentMethod, PaymentStatus } from '@/hooks/usePayments';
import { useRealtors } from '@/hooks/useRealtors';
import { useLeads } from '@/hooks/useLeads';
import { Loader2, DollarSign } from 'lucide-react';

interface NewPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRealtorId?: string;
  defaultLeadId?: string;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'check', label: 'Cheque' },
  { value: 'wire', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'other', label: 'Otro' },
];

export function NewPaymentDialog({
  open,
  onOpenChange,
  defaultRealtorId,
  defaultLeadId,
}: NewPaymentDialogProps) {
  const createPayment = useCreatePayment();
  const { data: realtors } = useRealtors();
  const { data: leads } = useLeads();

  const [formData, setFormData] = useState({
    realtor_id: defaultRealtorId || '',
    lead_id: defaultLeadId || '',
    amount: '',
    payment_method: 'check' as PaymentMethod,
    status: 'pending' as PaymentStatus,
    due_date: '',
    payment_date: '',
    reference_number: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }

    await createPayment.mutateAsync({
      realtor_id: formData.realtor_id || undefined,
      lead_id: formData.lead_id || undefined,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      status: formData.status,
      due_date: formData.due_date || undefined,
      payment_date: formData.status === 'paid' ? (formData.payment_date || new Date().toISOString().split('T')[0]) : undefined,
      reference_number: formData.reference_number || undefined,
      notes: formData.notes || undefined,
    });

    // Reset form
    setFormData({
      realtor_id: '',
      lead_id: '',
      amount: '',
      payment_method: 'check',
      status: 'pending',
      due_date: '',
      payment_date: '',
      reference_number: '',
      notes: '',
    });
    onOpenChange(false);
  };

  // Filter leads that are closed (cerrado) for payment association
  const closedLeads = leads?.filter(l => l.status === 'cerrado') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Registra un pago recibido o pendiente de un realtor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="10000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="pl-9"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value: PaymentStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                {formData.status === 'paid' ? 'Fecha de Pago' : 'Fecha Límite'}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.status === 'paid' ? formData.payment_date : formData.due_date}
                onChange={(e) => 
                  formData.status === 'paid'
                    ? setFormData({ ...formData, payment_date: e.target.value })
                    : setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="realtor_id">Realtor (opcional)</Label>
            <Select
              value={formData.realtor_id}
              onValueChange={(value) => setFormData({ ...formData, realtor_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar realtor..." />
              </SelectTrigger>
              <SelectContent>
                {realtors?.map((realtor) => (
                  <SelectItem key={realtor.id} value={realtor.id}>
                    {realtor.name} {realtor.company && `(${realtor.company})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_id">Deal Asociado (opcional)</Label>
            <Select
              value={formData.lead_id}
              onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar deal..." />
              </SelectTrigger>
              <SelectContent>
                {closedLeads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.property?.address}, {lead.property?.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Número de Referencia</Label>
            <Input
              id="reference_number"
              placeholder="Ej: CHK-12345"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPayment.isPending || !formData.amount}>
              {createPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
