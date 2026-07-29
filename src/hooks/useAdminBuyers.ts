import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type AdminBuyer = Tables<'buyers'>;

export interface AdminBuyersFilters {
  search?: string;
  tier?: string | null;
  organizationId?: string | null;
  status?: 'all' | 'active' | 'inactive';
  from: number;
  to: number;
}

export function useAdminBuyers(filters: AdminBuyersFilters) {
  const { search, tier, organizationId, status = 'all', from, to } = filters;

  return useQuery({
    queryKey: ['admin-buyers', search, tier, organizationId, status, from, to],
    queryFn: async (): Promise<{ data: AdminBuyer[]; count: number }> => {
      let query = supabase
        .from('buyers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (organizationId) query = query.eq('organization_id', organizationId);
      if (tier) query = query.eq('tier', tier as AdminBuyer['tier']);
      if (status === 'active') query = query.eq('is_active', true);
      if (status === 'inactive') query = query.eq('is_active', false);

      if (search) {
        const term = search.replace(/[%,()]/g, '').trim();
        if (term) {
          query = query.or(
            `contact_name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
          );
        }
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });
}
