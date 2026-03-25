import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Lead = Tables<'leads'> & {
  property?: Tables<'properties'>;
};

export type LeadStatus = Tables<'leads'>['status'];
export type Property = Tables<'properties'>;

export interface LeadFilters {
  status?: string;
  source?: string;
  city?: string;
  search?: string;
  piwMin?: number;
  piwMax?: number;
}

function applyLeadFilters(
  query: any,
  filters?: LeadFilters,
) {
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }
  if (filters?.search) {
    query = query.or(
      `address.ilike.%${filters.search}%,owner_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`,
      { referencedTable: 'properties' }
    );
  }
  if (filters?.piwMin !== undefined && filters.piwMin > 0) {
    query = query.gte('piw_score', filters.piwMin);
  }
  if (filters?.piwMax !== undefined && filters.piwMax < 100) {
    query = query.lte('piw_score', filters.piwMax);
  }
  // Exclude archived
  query = query.is('archived_at', null);
  return query;
}

export function useLeads(options?: {
  filters?: LeadFilters;
  from?: number;
  to?: number;
}) {
  return useQuery({
    queryKey: ['leads', options?.filters, options?.from, options?.to],
    queryFn: async (): Promise<{ data: Lead[]; count: number }> => {
      let query = supabase
        .from('leads')
        .select(`*, property:properties(*)`, { count: 'exact' })
        .order('created_at', { ascending: false });

      query = applyLeadFilters(query, options?.filters);

      if (options?.from !== undefined && options?.to !== undefined) {
        query = query.range(options.from, options.to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // City filter needs client-side since it's on joined table
      let filtered = data as Lead[];
      if (options?.filters?.city && options.filters.city !== 'all') {
        filtered = filtered.filter(l => l.property?.city === options.filters!.city);
      }

      return { data: filtered, count: count ?? 0 };
    },
  });
}

/** Fetch ALL filtered leads for CSV export (no pagination) */
export function useLeadsExport(filters?: LeadFilters) {
  return useQuery({
    queryKey: ['leads-export', filters],
    queryFn: async (): Promise<Lead[]> => {
      let query = supabase
        .from('leads')
        .select(`*, property:properties(*)`)
        .order('created_at', { ascending: false });

      query = applyLeadFilters(query, filters);

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data as Lead[];
      if (filters?.city && filters.city !== 'all') {
        filtered = filtered.filter(l => l.property?.city === filters!.city);
      }
      return filtered;
    },
    enabled: false, // only fetch on demand
  });
}

/** Get unique sources and cities for filter dropdowns */
export function useLeadFilterOptions() {
  return useQuery({
    queryKey: ['lead-filter-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('source, property:properties(city)')
        .is('archived_at', null);

      if (error) throw error;

      const sources = [...new Set(
        (data || []).map((l: any) => l.source).filter(Boolean)
      )].sort() as string[];

      const cities = [...new Set(
        (data || []).map((l: any) => l.property?.city).filter(Boolean)
      )].sort() as string[];

      return { sources, cities };
    },
  });
}

export function useLeadsByStatus(status: LeadStatus) {
  return useQuery({
    queryKey: ['leads', 'status', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`*, property:properties(*)`)
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
      referred_by_realtor_id?: string;
      referral_commission?: number;
      listing_price?: number;
    }) => {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert(data.property)
        .select()
        .single();

      if (propertyError) throw propertyError;

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          property_id: property.id,
          source: data.source,
          status: 'captacion',
          referred_by_realtor_id: data.referred_by_realtor_id || null,
          referral_commission: data.referral_commission || null,
          listing_price: data.listing_price || null,
        })
        .select()
        .single();

      if (leadError) throw leadError;
      return { property, lead };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-filter-options'] });
      const isReferral = !!variables.referred_by_realtor_id;
      toast({
        title: isReferral ? 'Referral creado' : 'Lead creado',
        description: isReferral 
          ? 'El lead referido por Realtor se ha creado correctamente' 
          : 'El lead se ha creado correctamente',
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

export function useMarkLeadContacted() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead marcado como contactado',
        description: 'El registro de contacto se ha actualizado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el contacto',
        variant: 'destructive',
      });
      console.error('Error marking lead as contacted:', error);
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

export function useBatchRecalculatePIW() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ forceAll = true }: { forceAll?: boolean } = {}) => {
      let offset = 0;
      const batchSize = 5;
      let totalProcessed = 0;
      let totalFailed = 0;
      let done = false;

      while (!done) {
        const { data, error } = await supabase.functions.invoke('batch-recalculate-piw', {
          body: { batchSize, offset, forceAll },
        });

        if (error) throw error;
        
        totalProcessed += data.processed || 0;
        totalFailed += data.failed || 0;
        done = data.done || !data.hasMore;
        offset = data.nextOffset || offset + batchSize;
        
        // Refresh UI periodically
        if (totalProcessed % 10 === 0) {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      }

      return { processed: totalProcessed, failed: totalFailed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: 'Recálculo completado',
        description: `${result.processed} leads recalculados${result.failed > 0 ? `, ${result.failed} fallaron` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error en recálculo',
        description: error?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });
}
