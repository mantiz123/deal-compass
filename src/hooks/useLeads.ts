import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Lead = Tables<'leads'> & {
  property?: Tables<'properties'>;
};

export type LeadStatus = Tables<'leads'>['status'];
export type Property = Tables<'properties'>;

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          property:properties(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLeadsByStatus(status: LeadStatus) {
  return useQuery({
    queryKey: ['leads', 'status', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('status', status)
        .order('piw_score', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      property: TablesInsert<'properties'>;
      source?: string;
    }) => {
      // First create the property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert(data.property)
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Then create the lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          property_id: property.id,
          source: data.source,
          status: 'captacion',
        })
        .select()
        .single();

      if (leadError) throw leadError;

      return { property, lead };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead creado',
        description: 'El lead se ha creado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo crear el lead',
        variant: 'destructive',
      });
      console.error('Error creating lead:', error);
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Estado actualizado',
        description: 'El lead se ha movido correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
      console.error('Error updating lead status:', error);
    },
  });
}

export interface PIWScoreResult {
  score: number;
  factors: {
    seller_motivation_score: number;
    financial_viability_score: number;
    closing_difficulty_score: number;
  };
  priority: 'hot' | 'warm' | 'cold';
  key_indicators: string[];
  risks: string[];
  recommended_action: string;
  analysis: string;
}

export function useCalculatePIWScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, propertyData }: { leadId: string; propertyData: Partial<Property> }): Promise<PIWScoreResult> => {
      const { data, error } = await supabase.functions.invoke('calculate-piw-score', {
        body: { leadId, propertyData },
      });

      if (error) throw error;
      return data as PIWScoreResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      const priorityEmoji = data.priority === 'hot' ? '🔥' : data.priority === 'warm' ? '⚡' : '❄️';
      toast({
        title: `PIW Score: ${data.score}% ${priorityEmoji}`,
        description: data.recommended_action,
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'No se pudo calcular el score';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      console.error('Error calculating PIW score:', error);
    },
  });
}
