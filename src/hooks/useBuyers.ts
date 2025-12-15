import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Buyer = Tables<'buyers'>;
export type BuyerTier = Buyer['tier'];

export function useBuyers() {
  return useQuery({
    queryKey: ['buyers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .order('tier', { ascending: true })
        .order('deals_closed', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useActiveBuyers() {
  return useQuery({
    queryKey: ['buyers', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .eq('is_active', true)
        .order('ai_match_score', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBuyer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TablesInsert<'buyers'>) => {
      const { data: buyer, error } = await supabase
        .from('buyers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return buyer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast({
        title: 'Comprador creado',
        description: 'El comprador se ha añadido a la red',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo crear el comprador',
        variant: 'destructive',
      });
      console.error('Error creating buyer:', error);
    },
  });
}

export function useUpdateBuyer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'buyers'> & { id: string }) => {
      const { data: buyer, error } = await supabase
        .from('buyers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return buyer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast({
        title: 'Comprador actualizado',
        description: 'Los datos se han guardado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el comprador',
        variant: 'destructive',
      });
      console.error('Error updating buyer:', error);
    },
  });
}
