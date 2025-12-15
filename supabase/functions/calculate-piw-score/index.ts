import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  // I. Seller Motivation Variables (10)
  owner_tenure_years?: number;
  is_absentee_owner?: boolean;
  owner_type?: 'individual' | 'corporation' | 'trust' | 'estate';
  mailing_address_different?: boolean;
  tax_debt?: number;
  tax_delinquent?: boolean;
  is_probate?: boolean;
  is_foreclosure?: boolean;
  eviction_count?: number;
  last_refinance_date?: string;
  mortgage_age_years?: number;
  
  // II. Financial Viability Variables (7)
  equity_percent?: number;
  arv?: number;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  neighborhood_vacancy_rate?: number;
  price_growth_3yr?: number;
  
  // III. Closing Difficulty Variables (3)
  active_liens_count?: number;
  last_sale_date?: string;
  proximity_to_development?: 'high' | 'medium' | 'low' | 'none';
  
  // Additional context
  property_type?: string;
  repair_cost?: number;
  mao?: number;
  city?: string;
  state?: string;
  zip_code?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, propertyData } = await req.json();
    
    console.log('Calculating PIW score for lead:', leadId);
    console.log('Property data received:', JSON.stringify(propertyData));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const analysisPrompt = buildEnhancedAnalysisPrompt(propertyData);
    console.log('Analysis prompt built, sending to AI gateway...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "calculate_piw_score",
              description: "Calculate the PIW score for a real estate wholesale lead based on 20 critical variables",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Overall PIW score from 0-100"
                  },
                  factors: {
                    type: "object",
                    properties: {
                      seller_motivation_score: { 
                        type: "number",
                        description: "Score 0-40 based on seller urgency indicators"
                      },
                      financial_viability_score: { 
                        type: "number",
                        description: "Score 0-35 based on deal profitability"
                      },
                      closing_difficulty_score: { 
                        type: "number",
                        description: "Score 0-25 (higher = easier close)"
                      }
                    },
                    required: ["seller_motivation_score", "financial_viability_score", "closing_difficulty_score"]
                  },
                  priority: {
                    type: "string",
                    enum: ["hot", "warm", "cold"],
                    description: "Lead priority classification"
                  },
                  key_indicators: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top 3-5 reasons for the score"
                  },
                  risks: {
                    type: "array",
                    items: { type: "string" },
                    description: "Potential deal risks identified"
                  },
                  recommended_action: {
                    type: "string",
                    description: "Next best action for this lead"
                  },
                  analysis: {
                    type: "string",
                    description: "Brief explanation of the overall assessment"
                  }
                },
                required: ["score", "factors", "priority", "key_indicators", "risks", "recommended_action", "analysis"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "calculate_piw_score" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    let result;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiResponse.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!result) {
      console.error('Could not parse AI response, using fallback');
      result = calculateFallbackScore(propertyData);
    }

    // Update lead in database
    if (leadId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          piw_score: Math.round(result.score),
          piw_score_factors: {
            ...result.factors,
            priority: result.priority,
            key_indicators: result.key_indicators,
            risks: result.risks,
            recommended_action: result.recommended_action,
            analysis: result.analysis,
            calculated_at: new Date().toISOString()
          }
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead:', updateError);
      } else {
        console.log('Lead PIW score updated successfully');
      }
    }

    return new Response(JSON.stringify({
      score: Math.round(result.score),
      factors: result.factors,
      priority: result.priority,
      key_indicators: result.key_indicators,
      risks: result.risks,
      recommended_action: result.recommended_action,
      analysis: result.analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-piw-score:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

const SYSTEM_PROMPT = `You are an expert real estate wholesaling analyst specializing in off-market deal acquisition in the United States. Your role is to calculate the PIW-Score (Probability of Investment Win) for potential wholesale deals.

## SCORING METHODOLOGY (Total: 100 points)

### I. SELLER MOTIVATION (40 points max) - MOST IMPORTANT
High motivation = seller willing to accept below-market offers

Score HIGH (35-40) if ANY of these HIGH-PRIORITY indicators present:
- Foreclosure status (immediate urgency)
- Tax delinquency > $2,000 (financial distress)
- Probate/Estate sale (heirs want fast liquidation)
- Multiple evictions (burned-out landlord)

Score MEDIUM (20-34) if:
- Absentee owner + old mortgage (15+ years)
- Corporate/LLC ownership with aging property
- Mailing address different from property
- Owner tenure > 15 years with no recent refinance

Score LOW (0-19) if:
- Owner-occupied, current on payments
- Recent purchase (< 3 years)
- No distress indicators

### II. FINANCIAL VIABILITY (35 points max)
The deal must make money for the cash buyer

Score HIGH (28-35) if:
- Equity > 40% (room for wholesale discount)
- ARV supports 70% rule after repairs
- Property in growing neighborhood (price growth > 5%/yr)
- Standard property type (SFH 3/2 most desirable)

Score MEDIUM (15-27) if:
- Equity 20-40%
- Flat or modest price growth
- Larger rehab needed but margins work

Score LOW (0-14) if:
- Low equity (< 20%)
- Declining neighborhood
- ARV doesn't support wholesale margins

### III. CLOSING DIFFICULTY (25 points max)
Higher score = EASIER to close

Score HIGH (20-25) if:
- No liens or clear title expected
- Simple ownership (individual, not complex trust)
- Near development/growth areas
- Clean transaction history

Score MEDIUM (10-19) if:
- 1-2 liens that can be negotiated
- Some title complexity but manageable

Score LOW (0-9) if:
- Multiple liens > property value
- Complex ownership disputes
- Distant from buyer demand areas

## PRIORITY CLASSIFICATION
- HOT (Score 80-100): Immediate action - high motivation + strong margins
- WARM (Score 50-79): Worth pursuing - follow up within 48 hours
- COLD (Score 0-49): Low priority - nurture or discard

## DECISION RULES
1. If foreclosure OR tax_delinquent, add +15 to seller_motivation automatically
2. If is_probate AND is_absentee_owner, this is a premium lead (+10)
3. If active_liens > 3 AND equity < 30%, flag as HIGH RISK
4. If price_growth_3yr > 10% AND proximity_to_development = 'high', add +5 to financial_viability

Be decisive in your scoring. Round to whole numbers. Provide actionable recommendations.`;

function buildEnhancedAnalysisPrompt(p: PropertyData): string {
  const lines: string[] = ['## PROPERTY DATA FOR PIW-SCORE ANALYSIS\n'];
  
  // Location
  if (p.city || p.state || p.zip_code) {
    lines.push(`**Location:** ${[p.city, p.state, p.zip_code].filter(Boolean).join(', ')}`);
  }
  if (p.property_type) lines.push(`**Property Type:** ${p.property_type.replace('_', ' ')}`);
  
  lines.push('\n### I. SELLER MOTIVATION INDICATORS');
  
  // Owner tenure
  if (p.owner_tenure_years !== undefined) {
    lines.push(`- Owner Tenure: ${p.owner_tenure_years} years`);
  }
  
  // Occupancy
  lines.push(`- Absentee Owner: ${p.is_absentee_owner ? '✓ YES (POSITIVE)' : 'No'}`);
  
  // Owner type
  if (p.owner_type) {
    const ownerTypeNote = p.owner_type === 'corporation' ? ' (possible tired landlord)' : '';
    lines.push(`- Owner Type: ${p.owner_type}${ownerTypeNote}`);
  }
  
  // Mailing address
  if (p.mailing_address_different !== undefined) {
    lines.push(`- Mailing Address Different: ${p.mailing_address_different ? '✓ YES (confirms absentee)' : 'No'}`);
  }
  
  // Tax situation
  if (p.tax_delinquent !== undefined) {
    lines.push(`- Tax Delinquent: ${p.tax_delinquent ? '⚠️ YES (HIGH MOTIVATION)' : 'No'}`);
  }
  if (p.tax_debt !== undefined && p.tax_debt > 0) {
    lines.push(`- Tax Debt Amount: $${p.tax_debt.toLocaleString()} ${p.tax_debt > 2000 ? '(SIGNIFICANT)' : ''}`);
  }
  
  // Distress indicators
  if (p.is_probate !== undefined) {
    lines.push(`- Probate/Estate: ${p.is_probate ? '✓ YES (HIGH MOTIVATION)' : 'No'}`);
  }
  if (p.is_foreclosure !== undefined) {
    lines.push(`- Foreclosure: ${p.is_foreclosure ? '🚨 YES (URGENT - HIGH MOTIVATION)' : 'No'}`);
  }
  if (p.eviction_count !== undefined && p.eviction_count > 0) {
    lines.push(`- Eviction History: ${p.eviction_count} evictions (burned-out landlord indicator)`);
  }
  
  // Mortgage info
  if (p.last_refinance_date) {
    lines.push(`- Last Refinance: ${p.last_refinance_date}`);
  }
  if (p.mortgage_age_years !== undefined) {
    const mortgageNote = p.mortgage_age_years > 15 ? ' (HIGH EQUITY likely)' : '';
    lines.push(`- Mortgage Age: ${p.mortgage_age_years} years${mortgageNote}`);
  }
  
  lines.push('\n### II. FINANCIAL VIABILITY');
  
  if (p.equity_percent !== undefined) {
    const equityNote = p.equity_percent > 40 ? ' (STRONG)' : p.equity_percent > 20 ? ' (Acceptable)' : ' (LOW - risky)';
    lines.push(`- Estimated Equity: ${p.equity_percent}%${equityNote}`);
  }
  if (p.arv !== undefined) {
    lines.push(`- ARV (After Repair Value): $${p.arv.toLocaleString()}`);
  }
  if (p.repair_cost !== undefined) {
    lines.push(`- Estimated Repair Cost: $${p.repair_cost.toLocaleString()}`);
    if (p.arv) {
      const repairPercent = ((p.repair_cost / p.arv) * 100).toFixed(1);
      lines.push(`- Repair/ARV Ratio: ${repairPercent}%`);
    }
  }
  if (p.mao !== undefined) {
    lines.push(`- MAO (Max Allowable Offer): $${p.mao.toLocaleString()}`);
  }
  if (p.sqft !== undefined) {
    lines.push(`- Square Footage: ${p.sqft.toLocaleString()} sq ft`);
  }
  if (p.bedrooms !== undefined || p.bathrooms !== undefined) {
    lines.push(`- Beds/Baths: ${p.bedrooms || '?'}/${p.bathrooms || '?'}`);
  }
  if (p.year_built !== undefined) {
    const age = new Date().getFullYear() - p.year_built;
    const ageNote = age > 50 ? ' (older - check systems)' : '';
    lines.push(`- Year Built: ${p.year_built} (${age} years old${ageNote})`);
  }
  if (p.neighborhood_vacancy_rate !== undefined) {
    const vacancyNote = p.neighborhood_vacancy_rate > 10 ? ' ⚠️ HIGH' : '';
    lines.push(`- Neighborhood Vacancy Rate: ${p.neighborhood_vacancy_rate}%${vacancyNote}`);
  }
  if (p.price_growth_3yr !== undefined) {
    const growthNote = p.price_growth_3yr > 5 ? ' (GROWING MARKET)' : p.price_growth_3yr < 0 ? ' (DECLINING)' : '';
    lines.push(`- 3-Year Price Growth: ${p.price_growth_3yr}%${growthNote}`);
  }
  
  lines.push('\n### III. CLOSING DIFFICULTY');
  
  if (p.active_liens_count !== undefined) {
    const liensNote = p.active_liens_count > 2 ? ' ⚠️ COMPLEX TITLE' : p.active_liens_count === 0 ? ' (CLEAN)' : '';
    lines.push(`- Active Liens: ${p.active_liens_count}${liensNote}`);
  }
  if (p.last_sale_date) {
    lines.push(`- Last Sale Date: ${p.last_sale_date}`);
  }
  if (p.proximity_to_development) {
    const proxNote = p.proximity_to_development === 'high' ? ' (STRONG BUYER DEMAND)' : '';
    lines.push(`- Proximity to Development: ${p.proximity_to_development}${proxNote}`);
  }
  
  lines.push('\n---\nCalculate the PIW-Score based on this data. Be decisive and provide actionable insights.');
  
  return lines.join('\n');
}

function calculateFallbackScore(p: PropertyData): any {
  let sellerMotivation = 0;
  let financialViability = 0;
  let closingDifficulty = 15; // Start neutral
  
  // Seller Motivation (max 40)
  if (p.is_foreclosure) sellerMotivation += 20;
  if (p.tax_delinquent || (p.tax_debt && p.tax_debt > 2000)) sellerMotivation += 15;
  if (p.is_probate) sellerMotivation += 12;
  if (p.is_absentee_owner) sellerMotivation += 8;
  if (p.mailing_address_different) sellerMotivation += 3;
  if (p.owner_type === 'corporation') sellerMotivation += 5;
  if (p.eviction_count && p.eviction_count > 0) sellerMotivation += Math.min(10, p.eviction_count * 3);
  if (p.owner_tenure_years && p.owner_tenure_years > 15) sellerMotivation += 5;
  if (p.mortgage_age_years && p.mortgage_age_years > 15) sellerMotivation += 5;
  sellerMotivation = Math.min(40, sellerMotivation);
  
  // Financial Viability (max 35)
  if (p.equity_percent !== undefined) {
    financialViability += Math.min(15, p.equity_percent * 0.35);
  }
  if (p.price_growth_3yr !== undefined && p.price_growth_3yr > 0) {
    financialViability += Math.min(10, p.price_growth_3yr);
  }
  if (p.property_type === 'single_family') financialViability += 5;
  if (p.arv && p.repair_cost) {
    const margin = (p.arv - p.repair_cost) / p.arv;
    if (margin > 0.3) financialViability += 10;
  }
  financialViability = Math.min(35, financialViability);
  
  // Closing Difficulty (max 25, higher = easier)
  if (p.active_liens_count !== undefined) {
    closingDifficulty -= p.active_liens_count * 3;
  }
  if (p.proximity_to_development === 'high') closingDifficulty += 8;
  if (p.proximity_to_development === 'medium') closingDifficulty += 4;
  closingDifficulty = Math.max(0, Math.min(25, closingDifficulty));
  
  const totalScore = sellerMotivation + financialViability + closingDifficulty;
  const priority = totalScore >= 80 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';
  
  const keyIndicators: string[] = [];
  if (p.is_foreclosure) keyIndicators.push('Foreclosure - urgent seller');
  if (p.tax_delinquent) keyIndicators.push('Tax delinquency - financial distress');
  if (p.is_absentee_owner) keyIndicators.push('Absentee owner - likely motivated');
  if (p.equity_percent && p.equity_percent > 40) keyIndicators.push('Strong equity position');
  
  const risks: string[] = [];
  if (p.active_liens_count && p.active_liens_count > 2) risks.push('Multiple liens may complicate title');
  if (p.equity_percent && p.equity_percent < 20) risks.push('Low equity limits negotiation room');
  if (p.neighborhood_vacancy_rate && p.neighborhood_vacancy_rate > 10) risks.push('High neighborhood vacancy');
  
  return {
    score: Math.round(totalScore),
    factors: {
      seller_motivation_score: Math.round(sellerMotivation),
      financial_viability_score: Math.round(financialViability),
      closing_difficulty_score: Math.round(closingDifficulty)
    },
    priority,
    key_indicators: keyIndicators.length > 0 ? keyIndicators : ['Standard lead - requires more data'],
    risks: risks.length > 0 ? risks : ['No major risks identified'],
    recommended_action: priority === 'hot' ? 'Contact immediately' : priority === 'warm' ? 'Follow up within 48 hours' : 'Add to nurture campaign',
    analysis: `Fallback calculation: Motivation ${sellerMotivation}/40, Financial ${financialViability}/35, Closing ${closingDifficulty}/25.`
  };
}
