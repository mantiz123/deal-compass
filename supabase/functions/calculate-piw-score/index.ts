import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getAuctionDaysRemaining(auctionDate?: string): number | null {
  if (!auctionDate) return null;
  const auction = new Date(auctionDate);
  if (isNaN(auction.getTime())) return null;
  return Math.ceil((auction.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function calculateScore(p: any): any {
  let sellerMotivation = 0;
  let financialViability = 0;
  let closingDifficulty = 15;

  // === Seller Motivation (max 40) ===
  if (p.absentee_type === 'out_of_state') sellerMotivation += 15;
  else if (p.absentee_type === 'local') sellerMotivation += 8;
  else if (p.is_absentee_owner) sellerMotivation += 8;

  if (p.is_vacant) sellerMotivation += 12;

  if (p.owner_tenure_years != null) {
    if (p.owner_tenure_years >= 20) sellerMotivation += 18;
    else if (p.owner_tenure_years >= 10) sellerMotivation += 15;
    else if (p.owner_tenure_years >= 5) sellerMotivation += 10;
    else if (p.owner_tenure_years >= 3) sellerMotivation += 6;
    else if (p.owner_tenure_years >= 1) sellerMotivation += 3;
  }

  if (p.days_on_market != null && p.days_on_market > 0) {
    if (p.days_on_market > 180) sellerMotivation += 14;
    else if (p.days_on_market > 90) sellerMotivation += 8;
    else sellerMotivation += 3;
  }

  const auctionDays = getAuctionDaysRemaining(p.auction_date);
  if (auctionDays !== null && auctionDays > 0) {
    if (auctionDays <= 30) sellerMotivation += 20;
    else if (auctionDays <= 60) sellerMotivation += 15;
    else if (auctionDays <= 90) sellerMotivation += 10;
  }

  if (p.is_foreclosure) sellerMotivation += 15;
  if (p.tax_delinquent) sellerMotivation += 8;
  if (p.tax_debt != null && p.tax_debt > 2000) sellerMotivation += 4;
  if (p.is_probate) sellerMotivation += 10;
  if (p.eviction_count != null && p.eviction_count > 0) sellerMotivation += 8;
  if (p.owner_type === 'corporation' || p.owner_type === 'trust') sellerMotivation += 5;
  if (p.mailing_address_different) sellerMotivation += 3;

  // Bankruptcy (within 2 years = +12, within 5 years = +6)
  if (p.bk_date) {
    const yearsSinceBk = (Date.now() - new Date(p.bk_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsSinceBk <= 2) sellerMotivation += 12;
    else if (yearsSinceBk <= 5) sellerMotivation += 6;
  }

  // Divorce (within 2 years = +10, within 5 years = +5)
  if (p.divorce_date) {
    const yearsSinceDiv = (Date.now() - new Date(p.divorce_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsSinceDiv <= 2) sellerMotivation += 10;
    else if (yearsSinceDiv <= 5) sellerMotivation += 5;
  }

  sellerMotivation = Math.min(sellerMotivation, 40);

  // === Financial Viability (max 35) ===
  if (p.equity_percent != null) {
    if (p.equity_percent >= 100) financialViability += 28;
    else if (p.equity_percent >= 80) financialViability += 22;
    else if (p.equity_percent >= 60) financialViability += 18;
    else if (p.equity_percent >= 40) financialViability += 14;
    else if (p.equity_percent >= 20) financialViability += 8;
  }

  if (p.arv != null && p.mortgage_balance != null) {
    const netEquity = p.arv - p.mortgage_balance;
    if (netEquity > 100000) financialViability += 8;
    else if (netEquity > 50000) financialViability += 5;
  }

  if (p.price_growth_3yr != null && p.price_growth_3yr > 5) financialViability += 5;
  if (p.bedrooms != null && p.bathrooms != null && p.bedrooms >= 3 && p.bathrooms >= 2) financialViability += 3;

  financialViability = Math.min(financialViability, 35);

  // === Closing Difficulty (max 25) ===
  if (p.active_liens_count != null) {
    if (p.active_liens_count === 0) closingDifficulty += 8;
    else if (p.active_liens_count > 2) closingDifficulty -= (p.active_liens_count - 2) * 5;
  }
  if (p.owner_type === 'individual') closingDifficulty += 3;
  if (p.owner_type === 'trust' || p.owner_type === 'estate') closingDifficulty -= 3;

  closingDifficulty = Math.max(0, Math.min(closingDifficulty, 25));

  const score = sellerMotivation + financialViability + closingDifficulty;
  const priority = score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold';

  const indicators: string[] = [];
  if (p.absentee_type === 'out_of_state') indicators.push('Out-of-state absentee');
  if (p.is_vacant) indicators.push('Vacant property');
  if (p.owner_tenure_years != null && p.owner_tenure_years >= 10) indicators.push(`${p.owner_tenure_years}yr tenure`);
  if (p.equity_percent != null && p.equity_percent >= 60) indicators.push(`${p.equity_percent}% equity`);
  if (p.is_foreclosure) indicators.push('Foreclosure');
  if (p.tax_delinquent) indicators.push('Tax delinquent');
  if (p.bk_date) indicators.push('Bankruptcy');
  if (p.divorce_date) indicators.push('Divorce');
  if (auctionDays !== null && auctionDays > 0 && auctionDays <= 90) indicators.push(`Auction in ${auctionDays}d`);
  if (p.days_on_market != null && p.days_on_market > 90) indicators.push(`${p.days_on_market} DOM`);

  const risks: string[] = [];
  if (p.active_liens_count != null && p.active_liens_count > 2) risks.push(`${p.active_liens_count} active liens`);
  if (p.equity_percent != null && p.equity_percent < 20) risks.push('Low equity');
  if (p.owner_type === 'trust' || p.owner_type === 'estate') risks.push('Complex ownership');

  return {
    score: Math.round(score),
    factors: {
      seller_motivation_score: sellerMotivation,
      financial_viability_score: financialViability,
      closing_difficulty_score: closingDifficulty,
    },
    priority,
    key_indicators: indicators,
    risks,
    recommended_action: priority === 'hot' ? 'Contact immediately' : priority === 'warm' ? 'Follow up within 48h' : 'Low priority - nurture',
    analysis: `Deterministic PIW v4 score: ${score}/100. Motivation: ${sellerMotivation}/40, Financial: ${financialViability}/35, Closing: ${closingDifficulty}/25.`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, propertyData } = await req.json();
    console.log('Calculating PIW score for lead:', leadId);

    const result = calculateScore(propertyData);

    // Update lead in database
    if (leadId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          piw_score: result.score,
          piw_score_factors: {
            ...result.factors,
            priority: result.priority,
            key_indicators: result.key_indicators,
            risks: result.risks,
            recommended_action: result.recommended_action,
            analysis: result.analysis,
            calculated_at: new Date().toISOString(),
          },
        })
        .eq('id', leadId);

      if (updateError) console.error('Error updating lead:', updateError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in calculate-piw-score:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
