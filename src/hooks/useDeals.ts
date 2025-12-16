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
        .select(`
          *,
          buyer:buyers(id, contact_name, company_name, email, phone, tier),
          lead:leads(
            id, 
            piw_score, 
            status, 
            offer_amount, 
            assignment_fee, 
            closing_date,
            property:properties(id, address, city, state, zip_code, arv, mao, bedrooms, bathrooms, sqft)
          )
        `)
        .order('sent_at', { ascending: false });

      if (options?.buyerId) {
        query = query.eq('buyer_id', options.buyerId);
      }
      if (options?.leadId) {
        query = query.eq('lead_id', options.leadId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by status if specified
      let filteredData = data as Deal[];
      if (options?.status) {
        filteredData = filteredData.filter(deal => {
          if (options.status === 'responded') return !!deal.response;
          if (options.status === 'clicked') return !!deal.clicked_at && !deal.response;
          if (options.status === 'opened') return !!deal.opened_at && !deal.clicked_at;
          if (options.status === 'sent') return !deal.opened_at;
          return true;
        });
      }

      return filteredData;
    },
  });
}

export function useDealStats() {
  return useQuery({
    queryKey: ['deal-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_packages')
        .select('*, lead:leads(assignment_fee)');

      if (error) throw error;

      const total = data.length;
      const opened = data.filter(d => d.opened_at).length;
      const clicked = data.filter(d => d.clicked_at).length;
      const responded = data.filter(d => d.response).length;
      const accepted = data.filter(d => d.response === 'accepted').length;
      const rejected = data.filter(d => d.response === 'rejected').length;
      
      // Calculate potential revenue from accepted deals
      const potentialRevenue = data
        .filter(d => d.response === 'accepted')
        .reduce((sum, d) => sum + ((d.lead as any)?.assignment_fee || 0), 0);

      return {
        total,
        opened,
        clicked,
        responded,
        accepted,
        rejected,
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
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deal-package-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['deal-package-stats'] });
      toast({
        title: variables.response === 'accepted' ? 'Deal aceptado' : 'Deal rechazado',
        description: 'La respuesta ha sido registrada',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la respuesta',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from('deal_packages')
        .delete()
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] });
      toast({
        title: 'Deal eliminado',
        description: 'El deal package ha sido eliminado',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el deal',
        variant: 'destructive',
      });
    },
  });
}
