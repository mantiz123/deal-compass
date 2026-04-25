import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LeadStatus } from './useLeads';
import type { ArchiveReason } from './useArchiveLead';

/** Approved agents available to be assigned to leads */
export function useAssignableAgents() {
  return useQuery({
    queryKey: ['assignable-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_approved', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return (data || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Sin nombre',
      }));
    },
  });
}

function invalidateLeadQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['leads'] });
  queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
  queryClient.invalidateQueries({ queryKey: ['stale-leads'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  queryClient.invalidateQueries({ queryKey: ['dead-leads-analytics'] });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadIds, status }: { leadIds: string[]; status: LeadStatus }) => {
      if (leadIds.length === 0) return { count: 0 };
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .in('id', leadIds);
      if (error) throw error;
      return { count: leadIds.length };
    },
    onSuccess: ({ count }) => {
      invalidateLeadQueries(queryClient);
      toast.success(`${count} lead${count === 1 ? '' : 's'} actualizado${count === 1 ? '' : 's'}`);
    },
    onError: (error) => {
      console.error('Bulk status update error:', error);
      toast.error('Error al actualizar el estado');
    },
  });
}

export function useBulkAssignAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadIds, agentId }: { leadIds: string[]; agentId: string | null }) => {
      if (leadIds.length === 0) return { count: 0 };
      const { error } = await supabase
        .from('leads')
        .update({ assigned_agent_id: agentId })
        .in('id', leadIds);
      if (error) throw error;
      return { count: leadIds.length };
    },
    onSuccess: ({ count }) => {
      invalidateLeadQueries(queryClient);
      toast.success(`${count} lead${count === 1 ? '' : 's'} reasignado${count === 1 ? '' : 's'}`);
    },
    onError: (error) => {
      console.error('Bulk assign error:', error);
      toast.error('Error al asignar agente');
    },
  });
}

export function useBulkArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadIds, reason, notes }: { leadIds: string[]; reason: ArchiveReason; notes?: string }) => {
      if (leadIds.length === 0) return { count: 0 };
      const { error } = await supabase
        .from('leads')
        .update({
          archived_at: new Date().toISOString(),
          archive_reason: reason,
          archive_notes: notes || null,
        })
        .in('id', leadIds);
      if (error) throw error;
      return { count: leadIds.length };
    },
    onSuccess: ({ count }) => {
      invalidateLeadQueries(queryClient);
      toast.success(`${count} lead${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}`);
    },
    onError: (error) => {
      console.error('Bulk archive error:', error);
      toast.error('Error al archivar leads');
    },
  });
}
