import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Deal = Tables<'deals'>;
export type DealComp = Tables<'deal_comps'>;
export type DealScenario = Tables<'deal_scenarios'>;
export type DealChecklistItem = Tables<'deal_checklist_items'>;

export const DEAL_STAGES = [
  'under_analysis',
  'offer',
  'under_contract',
  'rehab',
  'listed',
  'sold',
  'passed',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const STAGE_LABELS: Record<DealStage, string> = {
  under_analysis: 'En análisis',
  offer: 'Oferta enviada',
  under_contract: 'Bajo contrato',
  rehab: 'Remodelación',
  listed: 'En venta',
  sold: 'Vendida',
  passed: 'Descartada',
};

export const DECISION_LABELS: Record<string, string> = {
  buy: 'BUY',
  negotiate: 'NEGOTIATE',
  pass: 'PASS',
  undecided: 'Sin decisión',
};

export function useDeals() {
  const orgId = useCurrentOrgIdSafe();
  return useQuery({
    queryKey: ['deals', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeal(id?: string) {
  return useQuery({
    queryKey: ['deal', id],
    enabled: !!id,
    queryFn: async (): Promise<Deal | null> => {
      const { data, error } = await supabase.from('deals').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  const orgId = useCurrentOrgIdSafe();
  return useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'deals'>, 'organization_id'>) => {
      if (!orgId) throw new Error('Organización no disponible');
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('deals')
        .insert({ ...payload, organization_id: orgId, created_by: userRes.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'deals'> & { id: string }) => {
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      qc.invalidateQueries({ queryKey: ['deal', d.id] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  });
}

/* ---------------- comps ---------------- */

export function useDealComps(dealId?: string) {
  return useQuery({
    queryKey: ['deal-comps', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealComp[]> => {
      const { data, error } = await supabase
        .from('deal_comps')
        .select('*')
        .eq('deal_id', dealId!)
        .order('price', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddDealComps() {
  const qc = useQueryClient();
  const orgId = useCurrentOrgIdSafe();
  return useMutation({
    mutationFn: async ({
      dealId,
      comps,
    }: {
      dealId: string;
      comps: Omit<TablesInsert<'deal_comps'>, 'deal_id' | 'organization_id'>[];
    }) => {
      if (!orgId) throw new Error('Organización no disponible');
      if (!comps.length) return [];
      const { data, error } = await supabase
        .from('deal_comps')
        .insert(comps.map((c) => ({ ...c, deal_id: dealId, organization_id: orgId })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['deal-comps', v.dealId] }),
  });
}

export function useUpdateDealComp(dealId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'deal_comps'> & { id: string }) => {
      const { data, error } = await supabase
        .from('deal_comps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-comps', dealId] }),
  });
}

/* ---------------- scenarios ---------------- */

export function useDealScenarios(dealId?: string) {
  return useQuery({
    queryKey: ['deal-scenarios', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealScenario[]> => {
      const { data, error } = await supabase
        .from('deal_scenarios')
        .select('*')
        .eq('deal_id', dealId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveScenario(dealId?: string) {
  const qc = useQueryClient();
  const orgId = useCurrentOrgIdSafe();
  return useMutation({
    mutationFn: async (payload: { name: string; inputs: unknown; results: unknown; isPrimary?: boolean }) => {
      if (!orgId || !dealId) throw new Error('Deal u organización no disponible');
      const { data, error } = await supabase
        .from('deal_scenarios')
        .insert({
          deal_id: dealId,
          organization_id: orgId,
          name: payload.name,
          inputs: payload.inputs as never,
          results: payload.results as never,
          is_primary: payload.isPrimary ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-scenarios', dealId] }),
  });
}

/* ---------------- checklist ---------------- */

export const DEFAULT_CHECKLIST = [
  'Inspección general del inmueble',
  'Inspección estructural / cimentación',
  'Verificar HVAC (heat & air)',
  'Verificar plomería y eléctrico',
  'Techo — edad y estado',
  'Termitas / bond de Alabama',
  'Búsqueda de título (title search)',
  'Liens, back taxes y code violations',
  'Confirmar impuestos anuales y assessment',
  'Cotización de seguro (builder\u2019s risk)',
  'Confirmar zoning y permisos requeridos',
  'Presupuesto firme de contratista',
  'Confirmar ARV con agente local',
  'Revisar comparables activos y pendientes',
  'Term sheet del hard money lender',
  'Confirmar cash a cierre y reservas',
  'Survey / boundary si aplica',
  'Fotos y video del estado actual',
  'Confirmar acceso y llaves / lockbox',
  'Plan y timeline de salida (venta)',
];

export function useDealChecklist(dealId?: string) {
  return useQuery({
    queryKey: ['deal-checklist', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealChecklistItem[]> => {
      const { data, error } = await supabase
        .from('deal_checklist_items')
        .select('*')
        .eq('deal_id', dealId!)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSeedChecklist(dealId?: string) {
  const qc = useQueryClient();
  const orgId = useCurrentOrgIdSafe();
  return useMutation({
    mutationFn: async () => {
      if (!orgId || !dealId) throw new Error('Deal u organización no disponible');
      const { error } = await supabase.from('deal_checklist_items').insert(
        DEFAULT_CHECKLIST.map((label, i) => ({
          deal_id: dealId,
          organization_id: orgId,
          label,
          sort_order: i,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-checklist', dealId] }),
  });
}

export function useToggleChecklistItem(dealId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from('deal_checklist_items')
        .update({ is_done })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-checklist', dealId] }),
  });
}
