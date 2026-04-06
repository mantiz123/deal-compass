import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ArchiveReason = 
  | 'price_too_high'
  | 'not_motivated'
  | 'legal_issues'
  | 'no_response'
  | 'title_problems'
  | 'property_condition'
  | 'lost_to_competitor'
  | 'other';

export const archiveReasonLabels: Record<ArchiveReason, string> = {
  price_too_high: '💰 Precio muy alto',
  not_motivated: '😐 Vendedor no motivado',
  legal_issues: '⚖️ Problemas legales',
  no_response: '📵 Sin respuesta',
  title_problems: '📋 Problemas de título',
  property_condition: '🏚️ Condición de propiedad',
  lost_to_competitor: '🏃 Perdido ante competidor',
  other: '📝 Otro',
};

interface ArchiveLeadInput {
  leadId: string;
  reason: ArchiveReason;
  notes?: string;
}

export function useArchiveLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, reason, notes }: ArchiveLeadInput) => {
      const { error } = await supabase
        .from('leads')
        .update({
          archived_at: new Date().toISOString(),
          archive_reason: reason,
          archive_notes: notes || null,
        })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dead-leads-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stale-leads'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
      toast.success('Lead archivado correctamente');
    },
    onError: (error) => {
      console.error('Error archiving lead:', error);
      toast.error('Error al archivar el lead');
    },
  });
}

export function usePermanentlyDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dead-leads-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stale-leads'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
      toast.success('Lead eliminado permanentemente');
    },
    onError: (error) => {
      console.error('Error deleting lead:', error);
      toast.error('Error al eliminar el lead. Verifica que sea tuyo y esté archivado.');
    },
  });
}

export function useUnarchiveLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .update({
          archived_at: null,
          archive_reason: null,
          archive_notes: null,
        })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dead-leads-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stale-leads'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
      toast.success('Lead restaurado correctamente');
    },
    onError: (error) => {
      console.error('Error unarchiving lead:', error);
      toast.error('Error al restaurar el lead');
    },
  });
}

export interface DeadLeadAnalytic {
  archive_reason: ArchiveReason;
  count: number;
  avg_piw_score: number | null;
  avg_days_stale: number | null;
}

export function useDeadLeadsAnalytics() {
  return useQuery({
    queryKey: ['dead-leads-analytics'],
    queryFn: async (): Promise<DeadLeadAnalytic[]> => {
      const { data, error } = await supabase
        .from('dead_leads_analytics')
        .select('*');

      if (error) throw error;
      return (data || []) as DeadLeadAnalytic[];
    },
  });
}

export function useArchivedLeads() {
  return useQuery({
    queryKey: ['archived-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          property:properties(*)
        `)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Get stale leads (no activity in X days)
export function useStaleLeads(daysThreshold: number = 14) {
  return useQuery({
    queryKey: ['stale-leads', daysThreshold],
    queryFn: async () => {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          property:properties(*)
        `)
        .is('archived_at', null)
        .or(`last_contact_at.lt.${thresholdDate.toISOString()},last_contact_at.is.null`)
        .order('days_without_activity', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
