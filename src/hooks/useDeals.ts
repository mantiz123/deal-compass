import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Deal {
  id: string;
  lead_id: string;
  buyer_id: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  response: string | null;
  buyer: {
    id: string;
    contact_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  };
  lead: {
    id: string;
    piw_score: number | null;
    status: string;
    offer_amount: number | null;
    assignment_fee: number | null;
    closing_date: string | null;
    property: {
      id: string;
      address: string;
      city: string;
      state: string;
      zip_code: string;
      arv: number | null;
      mao: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      sqft: number | null;
    } | null;
  };
}

const PAGE_SIZE = 25;

const DEAL_SELECT = `
  *,
  buyer:buyers(id, contact_name, company_name, email, phone, tier),
  lead:leads(
    id, piw_score, status, offer_amount, assignment_fee, closing_date,
    property:properties(id, address, city, state, zip_code, arv, mao, bedrooms, bathrooms, sqft)
  )
`;

type DealStatusFilter = 'all' | 'sent' | 'opened' | 'clicked' | 'responded';

export interface DealsPageOptions {
  page: number;
  pageSize?: number;
  search?: string;
  statusFilter?: DealStatusFilter;
  buyerFilter?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function useDealsPage(options: DealsPageOptions) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const from = options.page * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ['deals-page', options],
    queryFn: async (): Promise<{ data: Deal[]; count: number }> => {
      let query = supabase
        .from('deal_packages')
        .select(DEAL_SELECT, { count: 'exact' })
        .order('sent_at', { ascending: false });

      // Server-side filters
      if (options.buyerFilter && options.buyerFilter !== 'all') {
        query = query.eq('buyer_id', options.buyerFilter);
      }
      if (options.dateFrom) {
        query = query.gte('sent_at', options.dateFrom.toISOString());
      }
      if (options.dateTo) {
        const end = new Date(options.dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte('sent_at', end.toISOString());
      }

      // Status filters applied server-side via null checks
      if (options.statusFilter && options.statusFilter !== 'all') {
        if (options.statusFilter === 'responded') {
          query = query.not('response', 'is', null);
        } else if (options.statusFilter === 'clicked') {
          query = query.not('clicked_at', 'is', null).is('response', null);
        } else if (options.statusFilter === 'opened') {
          query = query.not('opened_at', 'is', null).is('clicked_at', null);
        } else if (options.statusFilter === 'sent') {
          query = query.is('opened_at', null);
        }
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      let result = (data ?? []) as Deal[];

      // Client-side search (address + buyer name — small set after server filter)
      if (options.search?.trim()) {
        const s = options.search.trim().toLowerCase();
        result = result.filter(d =>
          d.lead.property?.address.toLowerCase().includes(s) ||
          d.buyer.contact_name.toLowerCase().includes(s) ||
          (d.buyer.company_name ?? '').toLowerCase().includes(s)
        );
      }

      return { data: result, count: count ?? 0 };
    },
  });
}

// Legacy hook kept for components that use it (DealDetailSheet, etc.)
export function useDeals(options?: {
  buyerId?: string;
  leadId?: string;
  status?: 'sent' | 'opened' | 'clicked' | 'responded';
}) {
  return useQuery({
    queryKey: ['deals', options],
    queryFn: async (): Promise<Deal[]> => {
      let query = supabase
        .from('deal_packages')
        .select(DEAL_SELECT)
        .order('sent_at', { ascending: false })
        .limit(200);

      if (options?.buyerId) query = query.eq('buyer_id', options.buyerId);
      if (options?.leadId) query = query.eq('lead_id', options.leadId);

      const { data, error } = await query;
      if (error) throw error;

      let result = data as Deal[];
      if (options?.status) {
        result = result.filter(d => {
          if (options.status === 'responded') return !!d.response;
          if (options.status === 'clicked') return !!d.clicked_at && !d.response;
          if (options.status === 'opened') return !!d.opened_at && !d.clicked_at;
          if (options.status === 'sent') return !d.opened_at;
          return true;
        });
      }
      return result;
    },
  });
}

export function useDealStats() {
  return useQuery({
    queryKey: ['deal-stats'],
    queryFn: async () => {
      // Efficient: count queries instead of loading all rows
      const [totalRes, openedRes, clickedRes, respondedRes, acceptedRes, rejectedRes] = await Promise.all([
        supabase.from('deal_packages').select('id', { count: 'exact', head: true }),
        supabase.from('deal_packages').select('id', { count: 'exact', head: true }).not('opened_at', 'is', null),
        supabase.from('deal_packages').select('id', { count: 'exact', head: true }).not('clicked_at', 'is', null),
        supabase.from('deal_packages').select('id', { count: 'exact', head: true }).not('response', 'is', null),
        supabase.from('deal_packages').select('id', { count: 'exact', head: true }).eq('response', 'accepted'),
        supabase.from('deal_packages').select('id', { count: 'exact', head: true }).eq('response', 'rejected'),
      ]);

      const total = totalRes.count ?? 0;
      const opened = openedRes.count ?? 0;
      const clicked = clickedRes.count ?? 0;
      const responded = respondedRes.count ?? 0;
      const accepted = acceptedRes.count ?? 0;
      const rejected = rejectedRes.count ?? 0;

      // Revenue: only fetch accepted deals' assignment fees
      const { data: acceptedDeals } = await supabase
        .from('deal_packages')
        .select('lead:leads(assignment_fee)')
        .eq('response', 'accepted');

      const potentialRevenue = (acceptedDeals ?? [])
        .reduce((sum, d) => sum + ((d.lead as any)?.assignment_fee || 0), 0);

      return {
        total, opened, clicked, responded, accepted, rejected,
        pending: total - responded,
        openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
        acceptRate: responded > 0 ? Math.round((accepted / responded) * 100) : 0,
        potentialRevenue,
      };
    },
  });
}

export function useUpdateDealResponse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ dealId, response }: { dealId: string; response: 'accepted' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('deal_packages')
        .update({ response })
        .eq('id', dealId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-page'] });
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deal-package-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['deal-package-stats'] });
      toast({
        title: variables.response === 'accepted' ? 'Deal aceptado' : 'Deal rechazado',
        description: 'La respuesta ha sido registrada',
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar la respuesta', variant: 'destructive' });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from('deal_packages').delete().eq('id', dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-page'] });
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] });
      toast({ title: 'Deal eliminado', description: 'El deal package ha sido eliminado' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo eliminar el deal', variant: 'destructive' });
    },
  });
}

export function useCreateDealPackage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, buyerId }: { leadId: string; buyerId: string }) => {
      const { data, error } = await supabase
        .from('deal_packages')
        .insert({ lead_id: leadId, buyer_id: buyerId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-page'] });
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] });
      toast({ title: 'Deal package creado', description: 'El deal ha sido enviado al comprador.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'No se pudo crear el deal.', variant: 'destructive' });
    },
  });
}
