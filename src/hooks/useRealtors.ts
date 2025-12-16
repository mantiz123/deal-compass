import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Realtor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  is_active: boolean | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useRealtors() {
  return useQuery({
    queryKey: ['realtors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('realtors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Realtor[];
    },
  });
}

export function useCreateRealtor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; company?: string }) => {
      const { data: realtor, error } = await supabase
        .from('realtors')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return realtor as Realtor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      toast({
        title: 'Realtor agregado',
        description: 'El Realtor se ha guardado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el Realtor',
        variant: 'destructive',
      });
      console.error('Error creating realtor:', error);
    },
  });
}
