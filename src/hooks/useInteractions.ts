import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Interaction = Tables<'interactions'>;

export function useInteractions(leadId: string) {
  return useQuery({
    queryKey: ['interactions', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Interaction[];
    },
    enabled: !!leadId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TablesInsert<'interactions'>) => {
      const { data: interaction, error } = await supabase
        .from('interactions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return interaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interactions', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Interacción registrada',
        description: 'La interacción se ha guardado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la interacción',
        variant: 'destructive',
      });
      console.error('Error creating interaction:', error);
    },
  });
}
