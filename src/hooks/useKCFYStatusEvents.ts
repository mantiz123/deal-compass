import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type KCFYStage =
  | 'submitted'
  | 'accepted'
  | 'contacting_seller'
  | 'negotiating'
  | 'under_contract'
  | 'buyer_secured'
  | 'closed'
  | 'dead';

export interface KCFYStatusEvent {
  id: string;
  kcfy_request_id: string;
  organization_id: string;
  stage: KCFYStage;
  note: string | null;
  created_by: string | null;
  created_at: string;
  /** Joined profile (best-effort) */
  creator_name?: string | null;
}

export const KCFY_STAGE_ORDER: KCFYStage[] = [
  'submitted',
  'accepted',
  'contacting_seller',
  'negotiating',
  'under_contract',
  'buyer_secured',
  'closed',
];

export const KCFY_STAGE_META: Record<KCFYStage, { label: string; description: string }> = {
  submitted: { label: 'Enviado', description: 'El estudiante envió la solicitud KCFY' },
  accepted: { label: 'Aceptado', description: 'Klose aceptó tomar el deal' },
  contacting_seller: { label: 'Contactando seller', description: 'Klose está estableciendo contacto' },
  negotiating: { label: 'Negociando', description: 'Klose está negociando precio y términos' },
  under_contract: { label: 'Bajo contrato', description: 'Contrato firmado con el seller' },
  buyer_secured: { label: 'Buyer asegurado', description: 'Comprador final confirmado' },
  closed: { label: 'Cerrado', description: 'Deal cerrado, comisión liberada' },
  dead: { label: 'Muerto', description: 'El deal no pudo cerrarse' },
};

/** Eventos de timeline de un KCFY específico (orden cronológico ascendente). */
export function useKCFYStatusEvents(kcfyRequestId: string | undefined | null) {
  return useQuery({
    queryKey: ['kcfy-status-events', kcfyRequestId],
    queryFn: async () => {
      if (!kcfyRequestId) return [];
      const { data, error } = await supabase
        .from('kcfy_status_events')
        .select('*')
        .eq('kcfy_request_id', kcfyRequestId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Best-effort profile enrichment
      const userIds = Array.from(new Set((data || []).map((e: any) => e.created_by).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      }

      return (data || []).map((e: any) => ({
        ...e,
        creator_name: e.created_by ? nameMap.get(e.created_by) ?? null : null,
      })) as KCFYStatusEvent[];
    },
    enabled: !!kcfyRequestId,
  });
}

interface AddEventInput {
  kcfy_request_id: string;
  organization_id: string;
  stage: KCFYStage;
  note?: string;
}

/** Inserta evento manual y, para etapas terminales, sincroniza el status legacy del KCFY. */
export function useAddKCFYStatusEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AddEventInput) => {
      if (!user) throw new Error('Sesión requerida');

      const { data, error } = await supabase
        .from('kcfy_status_events')
        .insert({
          kcfy_request_id: input.kcfy_request_id,
          organization_id: input.organization_id,
          stage: input.stage,
          note: input.note?.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Sync legacy status para etapas terminales / arranque de proceso
      const statusMap: Partial<Record<KCFYStage, string>> = {
        accepted: 'accepted',
        contacting_seller: 'in_progress',
        negotiating: 'in_progress',
        under_contract: 'in_progress',
        buyer_secured: 'in_progress',
        closed: 'closed',
        dead: 'rejected',
      };
      const newStatus = statusMap[input.stage];
      if (newStatus) {
        const updates: Record<string, any> = { status: newStatus };
        if (input.stage === 'accepted') {
          updates.accepted_at = new Date().toISOString();
          updates.klose_assignee_id = user.id;
        }
        if (input.stage === 'closed') {
          updates.closed_at = new Date().toISOString();
        }
        if (input.stage === 'dead' && input.note) {
          updates.rejection_reason = input.note;
        }
        // Best-effort: si falla por RLS, el evento ya quedó registrado
        await supabase.from('kcfy_requests').update(updates).eq('id', input.kcfy_request_id);
      }

      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['kcfy-status-events', vars.kcfy_request_id] });
      queryClient.invalidateQueries({ queryKey: ['kcfy-requests'] });
      queryClient.invalidateQueries({ queryKey: ['kcfy-request', 'lead'] });
      toast.success('Etapa registrada');
    },
    onError: (err: Error) => toast.error(err.message || 'No se pudo registrar la etapa'),
  });
}
