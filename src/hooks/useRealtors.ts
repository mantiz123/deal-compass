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

export function useRealtor(id: string | null) {
  return useQuery({
    queryKey: ['realtor', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('realtors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Realtor | null;
    },
    enabled: !!id,
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
      queryClient.invalidateQueries({ queryKey: ['realtor-stats'] });
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

export function useUpdateRealtor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; email?: string | null; phone?: string | null; company?: string | null; notes?: string | null; is_active?: boolean }) => {
      const { data: realtor, error } = await supabase
        .from('realtors')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return realtor as Realtor;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      queryClient.invalidateQueries({ queryKey: ['realtor', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['realtor-stats'] });
      toast({
        title: 'Realtor actualizado',
        description: 'Los cambios se han guardado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el Realtor',
        variant: 'destructive',
      });
      console.error('Error updating realtor:', error);
    },
  });
}

export function useDeleteRealtor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('realtors')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtors'] });
      queryClient.invalidateQueries({ queryKey: ['realtor-stats'] });
      toast({
        title: 'Realtor eliminado',
        description: 'El Realtor ha sido eliminado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el Realtor',
        variant: 'destructive',
      });
      console.error('Error deleting realtor:', error);
    },
  });
}
