import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PropertyComp {
  id: string;
  property_id: string;
  address: string;
  sale_price: number;
  sale_date: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  distance_miles: number | null;
  price_per_sqft: number | null;
  notes: string | null;
  source: string;
  created_at: string;
  created_by: string | null;
}

export interface CompsSummary {
  property_id: string;
  comp_count: number;
  avg_sale_price: number;
  avg_price_per_sqft: number;
  min_sale_price: number;
  max_sale_price: number;
}

export function usePropertyComps(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property-comps', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const { data, error } = await supabase
        .from('property_comps')
        .select('*')
        .eq('property_id', propertyId)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return data as PropertyComp[];
    },
    enabled: !!propertyId,
  });
}

export function useCompsSummary(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['comps-summary', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      
      const { data, error } = await supabase
        .from('property_comps_summary')
        .select('*')
        .eq('property_id', propertyId)
        .maybeSingle();

      if (error) throw error;
      return data as CompsSummary | null;
    },
    enabled: !!propertyId,
  });
}

export function useAddPropertyComp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comp: {
      property_id: string;
      address: string;
      sale_price: number;
      sale_date?: string;
      sqft?: number;
      bedrooms?: number;
      bathrooms?: number;
      distance_miles?: number;
      notes?: string;
      source?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('property_comps')
        .insert({
          ...comp,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-comps', variables.property_id] });
      queryClient.invalidateQueries({ queryKey: ['comps-summary', variables.property_id] });
      toast.success('Comp agregado correctamente');
    },
    onError: (error) => {
      console.error('Error adding comp:', error);
      toast.error('Error al agregar comp');
    },
  });
}

export function useDeletePropertyComp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase
        .from('property_comps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['property-comps', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['comps-summary', propertyId] });
      toast.success('Comp eliminado');
    },
    onError: (error) => {
      console.error('Error deleting comp:', error);
      toast.error('Error al eliminar comp');
    },
  });
}
