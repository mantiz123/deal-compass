import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RealtorDetail {
  id: string;
  name: string;
  referralCount: number;
  pendingCommission: number;
  paidCommission: number;
}

interface RealtorStats {
  totalRealtors: number;
  totalReferrals: number;
  pendingCommissions: number;
  paidCommissions: number;
  realtorDetails: RealtorDetail[];
}

export function useRealtorStats() {
  return useQuery({
    queryKey: ['realtor-stats'],
    queryFn: async (): Promise<RealtorStats> => {
      // Get all active realtors
      const { data: realtors, error: realtorsError } = await supabase
        .from('realtors')
        .select('id, name')
        .eq('is_active', true);

      if (realtorsError) throw realtorsError;

      // Get all leads with referrals
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, referred_by_realtor_id, referral_commission, status')
        .not('referred_by_realtor_id', 'is', null);

      if (leadsError) throw leadsError;

      // Calculate stats per realtor
      const realtorDetails: RealtorDetail[] = (realtors || []).map((realtor) => {
        const realtorLeads = (leads || []).filter(
          (lead) => lead.referred_by_realtor_id === realtor.id
        );

        const pendingCommission = realtorLeads
          .filter((lead) => lead.status !== 'cerrado')
          .reduce((sum, lead) => sum + (lead.referral_commission || 0), 0);

        const paidCommission = realtorLeads
          .filter((lead) => lead.status === 'cerrado')
          .reduce((sum, lead) => sum + (lead.referral_commission || 0), 0);

        return {
          id: realtor.id,
          name: realtor.name,
          referralCount: realtorLeads.length,
          pendingCommission,
          paidCommission,
        };
      });

      const totalReferrals = (leads || []).length;
      const pendingCommissions = realtorDetails.reduce(
        (sum, r) => sum + r.pendingCommission,
        0
      );
      const paidCommissions = realtorDetails.reduce(
        (sum, r) => sum + r.paidCommission,
        0
      );

      return {
        totalRealtors: realtors?.length || 0,
        totalReferrals,
        pendingCommissions,
        paidCommissions,
        realtorDetails,
      };
    },
  });
}

export function useRealtorReferrals(realtorId: string | null) {
  return useQuery({
    queryKey: ['realtor-referrals', realtorId],
    queryFn: async () => {
      if (!realtorId) return [];

      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          status,
          referral_commission,
          listing_price,
          created_at,
          property:properties(
            address,
            city,
            state,
            zip_code
          )
        `)
        .eq('referred_by_realtor_id', realtorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!realtorId,
  });
}
