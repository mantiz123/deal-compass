import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Property = Tables<'properties'>;

export function useProperties(options?: {
  search?: string;
  propertyType?: string;
  state?: string;
  from?: number;
  to?: number;
}) {
  const orgId = useCurrentOrgIdSafe();
  return useQuery({
    queryKey: ['properties', orgId, options],
    enabled: !!orgId,
    queryFn: async (): Promise<{ data: Property[]; count: number }> => {
      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (options?.propertyType && options.propertyType !== 'all') {
        query = query.eq('property_type', options.propertyType as any);
      }
      if (options?.state && options.state !== 'all') {
        query = query.eq('state', options.state);
      }
      if (options?.search) {
        query = query.or(
          `address.ilike.%${options.search}%,city.ilike.%${options.search}%,owner_name.ilike.%${options.search}%,zip_code.ilike.%${options.search}%`
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

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function usePropertyStats() {
  return useQuery({
    queryKey: ['property-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, lead:leads(id)');

      if (error) throw error;

      const total = data.length;
      const withLeads = data.filter(p => (p.lead as any[])?.length > 0).length;
      const totalArv = data.reduce((sum, p) => sum + (p.arv || 0), 0);
      const avgArv = total > 0 ? totalArv / total : 0;

      const typeDistribution = data.reduce((acc, p) => {
        acc[p.property_type] = (acc[p.property_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stateDistribution = data.reduce((acc, p) => {
        acc[p.state] = (acc[p.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        withLeads,
        withoutLeads: total - withLeads,
        totalArv,
        avgArv,
        typeDistribution,
        stateDistribution,
      };
    },
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TablesInsert<'properties'>) => {
      const { data: property, error } = await supabase
        .from('properties')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      toast({
        title: 'Propiedad creada',
        description: 'La propiedad se ha añadido correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la propiedad',
        variant: 'destructive',
      });
      console.error('Error creating property:', error);
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'properties'> & { id: string }) => {
      const { data: updated, error: updateError } = await supabase
        .from('properties')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Propiedad actualizada',
        description: 'Los cambios se han guardado. Recalcula el K-Score para reflejar los nuevos datos.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la propiedad',
        variant: 'destructive',
      });
      console.error('Error updating property:', error);
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      toast({
        title: 'Propiedad eliminada',
        description: 'La propiedad ha sido eliminada',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la propiedad. Puede que tenga leads asociados.',
        variant: 'destructive',
      });
      console.error('Error deleting property:', error);
    },
  });
}
