import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Buyer = Tables<'buyers'>;
export type BuyerTier = Buyer['tier'];

export function useBuyers(options?: {
  search?: string;
  tier?: string | null;
  from?: number;
  to?: number;
}) {
  return useQuery({
    queryKey: ['buyers', options?.search, options?.tier, options?.from, options?.to],
    queryFn: async (): Promise<{ data: Buyer[]; count: number }> => {
      let query = supabase
        .from('buyers')
        .select('*', { count: 'exact' })
        .order('liquidity_score', { ascending: false, nullsFirst: false })
        .order('deals_closed', { ascending: false });

      if (options?.tier) {
        query = query.eq('tier', options.tier as any);
      }
      if (options?.search) {
        query = query.or(
          `contact_name.ilike.%${options.search}%,company_name.ilike.%${options.search}%`
        );
      }
      if (options?.from !== undefined && options?.to !== undefined) {
        query = query.range(options.from, options.to);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count ?? 0 };
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

export function useDeleteBuyer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('buyers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast({
        title: 'Comprador eliminado',
        description: 'El comprador ha sido eliminado de la red',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el comprador',
        variant: 'destructive',
      });
      console.error('Error deleting buyer:', error);
    },
  });
}
