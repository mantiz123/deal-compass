import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';

export interface DashboardStats {
  totalProperties: number;
  totalInvestors: number;
  pendingPayments: number;
  receivedPayments: number;
  pendingCount: number;
  paidCount: number;
}

export function useDashboardStats() {
  const orgId = useCurrentOrgIdSafe();
  return useQuery({
    queryKey: ['dashboard-stats', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<DashboardStats> => {
      const [{ count: propsCount }, { count: buyersCount }, { data: payments }] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!),
        supabase
          .from('buyers')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('is_active', true),
        supabase
          .from('payments')
          .select('amount, status')
          .eq('organization_id', orgId!),
      ]);

      let pendingPayments = 0;
      let receivedPayments = 0;
      let pendingCount = 0;
      let paidCount = 0;
      for (const p of payments || []) {
        if (p.status === 'pending') {
          pendingPayments += Number(p.amount);
          pendingCount++;
        } else if (p.status === 'paid') {
          receivedPayments += Number(p.amount);
          paidCount++;
        }
      }

      return {
        totalProperties: propsCount || 0,
        totalInvestors: buyersCount || 0,
        pendingPayments,
        receivedPayments,
        pendingCount,
        paidCount,
      };
    },
  });
}
