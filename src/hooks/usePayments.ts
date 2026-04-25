import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';

export type PaymentMethod = 'cash' | 'check' | 'wire' | 'zelle' | 'venmo' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface Payment {
  id: string;
  lead_id: string | null;
  realtor_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  payment_date: string | null;
  due_date: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: {
    id: string;
    property: {
      address: string;
      city: string;
    } | null;
  } | null;
  realtor?: {
    id: string;
    name: string;
    company: string | null;
  } | null;
}

export interface PaymentStats {
  totalPending: number;
  totalReceived: number;
  pendingCount: number;
  paidCount: number;
}

export function usePayments() {
  const orgId = useCurrentOrgIdSafe();
  return useQuery({
    queryKey: ['payments', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          lead:leads(
            id,
            property:properties(address, city)
          ),
          realtor:realtors(id, name, company)
        `)
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status');

      if (error) throw error;

      const stats: PaymentStats = {
        totalPending: 0,
        totalReceived: 0,
        pendingCount: 0,
        paidCount: 0,
      };

      for (const payment of data || []) {
        if (payment.status === 'pending') {
          stats.totalPending += Number(payment.amount);
          stats.pendingCount++;
        } else if (payment.status === 'paid') {
          stats.totalReceived += Number(payment.amount);
          stats.paidCount++;
        }
      }

      return stats;
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      lead_id?: string;
      realtor_id?: string;
      amount: number;
      payment_method: PaymentMethod;
      status?: PaymentStatus;
      payment_date?: string;
      due_date?: string;
      reference_number?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      toast.success('Pago registrado correctamente');
    },
    onError: (error) => {
      console.error('Error creating payment:', error);
      toast.error('Error al registrar el pago');
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      amount?: number;
      payment_method?: PaymentMethod;
      status?: PaymentStatus;
      payment_date?: string | null;
      due_date?: string | null;
      reference_number?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      toast.success('Pago actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating payment:', error);
      toast.error('Error al actualizar el pago');
    },
  });
}

export function useMarkPaymentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payment_date }: { id: string; payment_date: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'paid', payment_date })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      toast.success('Pago marcado como recibido');
    },
    onError: (error) => {
      console.error('Error marking payment as paid:', error);
      toast.error('Error al marcar el pago');
    },
  });
}
