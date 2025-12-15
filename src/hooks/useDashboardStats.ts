import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalLeads: number;
  activeDeals: number;
  buyersInNetwork: number;
  avgPIWScore: number;
  monthlyVolume: number;
  leadsByStatus: Record<string, number>;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch leads count and status breakdown
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, piw_score, assignment_fee');

      if (leadsError) throw leadsError;

      // Fetch buyers count
      const { count: buyersCount, error: buyersError } = await supabase
        .from('buyers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (buyersError) throw buyersError;

      // Calculate stats
      const totalLeads = leads?.length || 0;
      const activeDeals = leads?.filter(l => 
        l.status === 'bajo_contrato' || l.status === 'cesion'
      ).length || 0;

      const scoresWithValues = leads?.filter(l => l.piw_score !== null) || [];
      const avgPIWScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((acc, l) => acc + (l.piw_score || 0), 0) / scoresWithValues.length)
        : 0;

      const monthlyVolume = leads
        ?.filter(l => l.status === 'cerrado' && l.assignment_fee)
        .reduce((acc, l) => acc + (l.assignment_fee || 0), 0) || 0;

      const leadsByStatus: Record<string, number> = {};
      leads?.forEach(lead => {
        leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
      });

      return {
        totalLeads,
        activeDeals,
        buyersInNetwork: buyersCount || 0,
        avgPIWScore,
        monthlyVolume,
        leadsByStatus,
      };
    },
  });
}
