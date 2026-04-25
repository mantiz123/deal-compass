import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentOrgIdSafe, useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type KCFYStatus = 'pending' | 'accepted' | 'in_progress' | 'closed' | 'rejected' | 'cancelled';
export type KCFYPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface KCFYRequest {
  id: string;
  organization_id: string;
  lead_id: string;
  requested_by: string;
  status: KCFYStatus;
  priority: KCFYPriority;
  notes: string | null;
  deal_value_estimate: number | null;
  agreed_split_student: number | null;
  klose_assignee_id: string | null;
  rejection_reason: string | null;
  accepted_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Active KCFY request for a single lead (if any). */
export function useKCFYRequestForLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ['kcfy-request', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('kcfy_requests')
        .select('*')
        .eq('lead_id', leadId)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as KCFYRequest | null;
    },
    enabled: !!leadId,
  });
}

/** All KCFY requests visible to the current user (RLS-filtered). */
export function useKCFYRequests(filters?: { status?: KCFYStatus[] }) {
  const orgId = useCurrentOrgIdSafe();
  const { isSuperAdmin } = useOrganization();

  return useQuery({
    queryKey: ['kcfy-requests', orgId, isSuperAdmin, filters],
    queryFn: async () => {
      let query = supabase
        .from('kcfy_requests')
        .select(`
          *,
          lead:leads!inner(
            id,
            status,
            piw_score,
            organization_id,
            property:properties!inner(address, city, state, zip_code, arv, mao)
          )
        `)
        .order('created_at', { ascending: false });

      // Super admin sees all; normal users see only their org (RLS enforces, but we filter for clarity)
      if (!isSuperAdmin && orgId) {
        query = query.eq('organization_id', orgId);
      }
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Array<KCFYRequest & { lead: any }>;
    },
    enabled: isSuperAdmin || !!orgId,
  });
}

export interface CreateKCFYInput {
  lead_id: string;
  priority: KCFYPriority;
  notes?: string;
  deal_value_estimate?: number | null;
}

export function useCreateKCFYRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = useCurrentOrgIdSafe();

  return useMutation({
    mutationFn: async (input: CreateKCFYInput) => {
      if (!user) throw new Error('Debes iniciar sesión');
      if (!orgId) throw new Error('No hay organización seleccionada');

      const { data, error } = await supabase
        .from('kcfy_requests')
        .insert({
          lead_id: input.lead_id,
          organization_id: orgId,
          requested_by: user.id,
          priority: input.priority,
          notes: input.notes ?? null,
          deal_value_estimate: input.deal_value_estimate ?? null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe una solicitud KCFY activa para este lead');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['kcfy-request', 'lead', vars.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['kcfy-requests'] });
      toast.success('Solicitud KCFY enviada al equipo Klose');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'No se pudo enviar la solicitud');
    },
  });
}

export function useUpdateKCFYRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<KCFYRequest> }) => {
      const { data, error } = await supabase
        .from('kcfy_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kcfy-request', 'lead', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['kcfy-requests'] });
      toast.success('Solicitud actualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
