import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BuyerLiquidityData {
  id: string;
  contact_name: string;
  company_name: string | null;
  tier: string;
  liquidity_score: number | null;
  avg_response_time_hours: number | null;
  close_ratio: number | null;
  deals_closed: number | null;
  total_deals_offered: number | null;
  deals_responded: number | null;
  last_deal_date: string | null;
  preferred_discount_percent: number | null;
}

// Calculate liquidity score based on buyer metrics
function calculateLiquidityScore(buyer: {
  deals_closed: number | null;
  total_deals_offered: number | null;
  deals_responded: number | null;
  avg_response_time_hours: number | null;
  last_deal_date: string | null;
}): number {
  let score = 50; // Base score

  // Close ratio impact (max +25 points)
  if (buyer.total_deals_offered && buyer.total_deals_offered > 0 && buyer.deals_closed) {
    const closeRatio = (buyer.deals_closed / buyer.total_deals_offered) * 100;
    score += Math.min(closeRatio * 0.25, 25);
  }

  // Response rate impact (max +15 points)
  if (buyer.total_deals_offered && buyer.total_deals_offered > 0 && buyer.deals_responded) {
    const responseRate = (buyer.deals_responded / buyer.total_deals_offered) * 100;
    score += Math.min(responseRate * 0.15, 15);
  }

  // Response time impact (max +10 points for fast responders)
  if (buyer.avg_response_time_hours !== null) {
    if (buyer.avg_response_time_hours <= 2) score += 10;
    else if (buyer.avg_response_time_hours <= 6) score += 7;
    else if (buyer.avg_response_time_hours <= 24) score += 4;
    else if (buyer.avg_response_time_hours <= 48) score += 2;
  }

  // Recency bonus (max +10 points)
  if (buyer.last_deal_date) {
    const daysSinceLastDeal = Math.floor(
      (Date.now() - new Date(buyer.last_deal_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastDeal <= 30) score += 10;
    else if (daysSinceLastDeal <= 60) score += 7;
    else if (daysSinceLastDeal <= 90) score += 4;
    else if (daysSinceLastDeal <= 180) score += 2;
  }

  // Volume bonus (max +10 points)
  const dealsCount = buyer.deals_closed || 0;
  if (dealsCount >= 20) score += 10;
  else if (dealsCount >= 10) score += 7;
  else if (dealsCount >= 5) score += 5;
  else if (dealsCount >= 1) score += 2;

  // Penalty for no activity
  if (!buyer.deals_closed && !buyer.deals_responded) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function useRecalculateBuyerLiquidity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (buyerId: string) => {
      // Fetch current buyer data
      const { data: buyer, error: fetchError } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', buyerId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new liquidity score
      const newScore = calculateLiquidityScore(buyer);

      // Calculate close ratio
      const closeRatio = buyer.total_deals_offered && buyer.total_deals_offered > 0
        ? (buyer.deals_closed || 0) / buyer.total_deals_offered * 100
        : null;

      // Update buyer
      const { error: updateError } = await supabase
        .from('buyers')
        .update({
          liquidity_score: newScore,
          close_ratio: closeRatio,
        })
        .eq('id', buyerId);

      if (updateError) throw updateError;

      return { buyerId, newScore };
    },
    onSuccess: ({ newScore }) => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success(`Liquidity Score actualizado: ${newScore}`);
    },
    onError: (error) => {
      console.error('Error calculating liquidity:', error);
      toast.error('Error al calcular liquidity score');
    },
  });
}

// Batch recalculate all buyers
export function useRecalculateAllBuyerLiquidity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch all active buyers
      const { data: buyers, error: fetchError } = await supabase
        .from('buyers')
        .select('*')
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      // Calculate and update each buyer
      const updates = buyers.map(buyer => ({
        id: buyer.id,
        liquidity_score: calculateLiquidityScore(buyer),
        close_ratio: buyer.total_deals_offered && buyer.total_deals_offered > 0
          ? (buyer.deals_closed || 0) / buyer.total_deals_offered * 100
          : null,
      }));

      // Update all buyers
      for (const update of updates) {
        await supabase
          .from('buyers')
          .update({
            liquidity_score: update.liquidity_score,
            close_ratio: update.close_ratio,
          })
          .eq('id', update.id);
      }

      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success(`Liquidity Score actualizado para ${count} compradores`);
    },
    onError: (error) => {
      console.error('Error batch calculating liquidity:', error);
      toast.error('Error al recalcular liquidity scores');
    },
  });
}

// Record buyer response to a deal
export function useRecordBuyerResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buyerId,
      responded,
      responseTimeHours,
    }: {
      buyerId: string;
      responded: boolean;
      responseTimeHours?: number;
    }) => {
      // Get current buyer data
      const { data: buyer, error: fetchError } = await supabase
        .from('buyers')
        .select('total_deals_offered, deals_responded, avg_response_time_hours')
        .eq('id', buyerId)
        .single();

      if (fetchError) throw fetchError;

      const totalOffered = (buyer.total_deals_offered || 0) + 1;
      const dealsResponded = responded 
        ? (buyer.deals_responded || 0) + 1 
        : (buyer.deals_responded || 0);

      // Calculate new average response time
      let newAvgResponseTime = buyer.avg_response_time_hours;
      if (responded && responseTimeHours !== undefined) {
        const prevTotal = (buyer.avg_response_time_hours || 0) * (buyer.deals_responded || 0);
        newAvgResponseTime = (prevTotal + responseTimeHours) / dealsResponded;
      }

      const { error: updateError } = await supabase
        .from('buyers')
        .update({
          total_deals_offered: totalOffered,
          deals_responded: dealsResponded,
          avg_response_time_hours: newAvgResponseTime,
        })
        .eq('id', buyerId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
    },
  });
}

// Record deal closed by buyer
export function useRecordBuyerDealClosed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (buyerId: string) => {
      const { data: buyer, error: fetchError } = await supabase
        .from('buyers')
        .select('deals_closed')
        .eq('id', buyerId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('buyers')
        .update({
          deals_closed: (buyer.deals_closed || 0) + 1,
          last_deal_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', buyerId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success('Deal registrado para el comprador');
    },
  });
}

// Get top buyers by liquidity score
export function useTopBuyersByLiquidity(limit: number = 10) {
  return useQuery({
    queryKey: ['top-buyers-liquidity', limit],
    queryFn: async (): Promise<BuyerLiquidityData[]> => {
      const { data, error } = await supabase
        .from('buyers')
        .select(`
          id,
          contact_name,
          company_name,
          tier,
          liquidity_score,
          avg_response_time_hours,
          close_ratio,
          deals_closed,
          total_deals_offered,
          deals_responded,
          last_deal_date,
          preferred_discount_percent
        `)
        .eq('is_active', true)
        .not('liquidity_score', 'is', null)
        .order('liquidity_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as BuyerLiquidityData[];
    },
  });
}
