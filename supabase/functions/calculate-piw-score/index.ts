import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  // I. Seller Motivation Variables
  owner_tenure_years?: number;
  is_absentee_owner?: boolean;
  absentee_type?: 'out_of_state' | 'local' | 'occupied';
  is_vacant?: boolean;
  owner_type?: 'individual' | 'corporation' | 'trust' | 'estate';
  mailing_address_different?: boolean;
  tax_debt?: number;
  tax_delinquent?: boolean;
  is_probate?: boolean;
  is_foreclosure?: boolean;
  eviction_count?: number;
  last_refinance_date?: string;
  mortgage_age_years?: number;
  days_on_market?: number;
  
  // II. Financial Viability Variables
  equity_percent?: number;
  arv?: number;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  neighborhood_vacancy_rate?: number;
  price_growth_3yr?: number;
  
  // III. Closing Difficulty Variables
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
              description: "Calculate the PIW score for a real estate wholesale lead based on critical variables",
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
High motivation = seller willing to accept below-market offers.

MANDATORY POINT ASSIGNMENTS — apply these EXACTLY before any other analysis:

**Absentee Owner Detection:**
- absentee_type = "out_of_state" → +15 pts (owner lives in different state)
- absentee_type = "local" → +8 pts (owner lives in same state, different city)
- absentee_type = "occupied" or no absentee → +0 pts

**Vacant Property:**
- is_vacant = true → +12 pts (vacant properties = highly motivated sellers)

**Ownership Length (from owner_tenure_years):**
- < 1 year: +0 pts (recent buyer, not motivated)
- 1-3 years: +3 pts
- 3-5 years: +6 pts
- 5-10 years: +10 pts
- 10-20 years: +15 pts (ownership fatigue)
- 20+ years: +18 pts (maximum fatigue)

**Days on Market:**
- 0 or unknown: +0 pts
- 1-90 days: +3 pts (tried MLS, hasn't sold)
- 91-180 days: +8 pts (frustrated with MLS)
- 180+ days: +14 pts (very frustrated, open to offers)

**Additional Motivation Signals (additive):**
- Foreclosure: +15 pts (immediate urgency, cap motivation at 40)
- Tax delinquency > $2,000: +12 pts
- Tax delinquent flag: +8 pts
- Probate/Estate: +10 pts
- Evictions > 0: +8 pts (burned-out landlord)
- Corporate/LLC owner: +5 pts
- Mailing address different: +3 pts

Cap total seller_motivation_score at 40.

### II. FINANCIAL VIABILITY (35 points max)

**Equity Percentage (MANDATORY point assignment):**
- < 20%: +0 pts
- 20-39%: +8 pts
- 40-59%: +14 pts
- 60-79%: +18 pts
- 80-99%: +22 pts
- 100% (free & clear): +28 pts

**Additional Financial Signals:**
- ARV supports 70% rule after repairs: +5 pts
- Property in growing neighborhood (price_growth > 5%/yr): +5 pts
- Standard SFH 3/2: +3 pts
- Good beds/baths/sqft ratio: +2 pts

Cap total financial_viability_score at 35.

### III. CLOSING DIFFICULTY (25 points max)
Higher score = EASIER to close. Start at 15.

- No liens (active_liens = 0): +8 pts
- 1-2 liens: +0 pts
- 3+ liens: -5 pts per lien above 2
- Simple ownership (individual): +3 pts
- Near development: +5 pts
- Complex trust/estate ownership: -3 pts

Cap at 0-25.

## PRIORITY CLASSIFICATION
- HOT (Score 75-100): Immediate action — multiple strong motivation signals
- WARM (Score 50-74): Worth pursuing — follow up within 48 hours
- COLD (Score 0-49): Low priority — nurture or discard

## CRITICAL RULE
You MUST use the mandatory point tables above. Do NOT underweight absentee, vacant, tenure, equity, or days_on_market. These are the PRIMARY scoring drivers from PropWire data. A vacant, absentee out-of-state property with 100% equity and 20+ years ownership should score 75+ minimum.`;

function buildEnhancedAnalysisPrompt(p: PropertyData): string {
  const lines: string[] = ['## PROPERTY DATA FOR PIW-SCORE ANALYSIS\n'];
  
  // Location
  if (p.city || p.state || p.zip_code) {
    lines.push(`**Location:** ${[p.city, p.state, p.zip_code].filter(Boolean).join(', ')}`);
  }
  if (p.property_type) lines.push(`**Property Type:** ${p.property_type.replace('_', ' ')}`);
  
  lines.push('\n### I. SELLER MOTIVATION INDICATORS');
  
  // Absentee detection
  if (p.absentee_type) {
    const typeLabels: Record<string, string> = {
      'out_of_state': '🚨 OUT-OF-STATE ABSENTEE (+15 pts mandatory)',
      'local': '⚠️ LOCAL ABSENTEE - same state, different city (+8 pts mandatory)',
      'occupied': 'Owner Occupied (+0 pts)',
    };
    lines.push(`- Absentee Status: ${typeLabels[p.absentee_type] || p.absentee_type}`);
  } else {
    lines.push(`- Absentee Owner: ${p.is_absentee_owner ? '✓ YES (+8 pts minimum)' : 'No / Unknown'}`);
  }
  
  // Vacant
  if (p.is_vacant != null) {
    lines.push(`- Vacant Property: ${p.is_vacant ? '🚨 YES - VACANT (+12 pts mandatory)' : 'No'}`);
  }
  
  // Owner tenure
  if (p.owner_tenure_years != null) {
    let tenureLabel = '';
    if (p.owner_tenure_years >= 20) tenureLabel = ' 🚨 MAXIMUM FATIGUE (+18 pts mandatory)';
    else if (p.owner_tenure_years >= 10) tenureLabel = ' ⚠️ HIGH FATIGUE (+15 pts mandatory)';
    else if (p.owner_tenure_years >= 5) tenureLabel = ' (+10 pts mandatory)';
    else if (p.owner_tenure_years >= 3) tenureLabel = ' (+6 pts)';
    else if (p.owner_tenure_years >= 1) tenureLabel = ' (+3 pts)';
    else tenureLabel = ' (recent buyer, +0 pts)';
    lines.push(`- Owner Tenure: ${p.owner_tenure_years} years${tenureLabel}`);
  }
  
  // Days on Market
  if (p.days_on_market != null && p.days_on_market > 0) {
    let domLabel = '';
    if (p.days_on_market > 180) domLabel = ' 🚨 VERY FRUSTRATED WITH MLS (+14 pts mandatory)';
    else if (p.days_on_market > 90) domLabel = ' ⚠️ FRUSTRATED WITH MLS (+8 pts mandatory)';
    else domLabel = ' (+3 pts)';
    lines.push(`- Days on Market: ${p.days_on_market}${domLabel}`);
  }
  
  // Owner type
  if (p.owner_type) {
    const ownerTypeNote = p.owner_type === 'corporation' ? ' (possible tired landlord, +5 pts)' : '';
    lines.push(`- Owner Type: ${p.owner_type}${ownerTypeNote}`);
  }
  
  // Mailing address
  if (p.mailing_address_different != null) {
    lines.push(`- Mailing Address Different: ${p.mailing_address_different ? '✓ YES (+3 pts)' : 'No'}`);
  }
  
  // Tax situation
  if (p.tax_delinquent != null) {
    lines.push(`- Tax Delinquent: ${p.tax_delinquent ? '⚠️ YES (+8 pts)' : 'No'}`);
  }
  if (p.tax_debt != null && p.tax_debt > 0) {
    lines.push(`- Tax Debt Amount: $${p.tax_debt.toLocaleString()} ${p.tax_debt > 2000 ? '(+12 pts - SIGNIFICANT)' : ''}`);
  }
  
  // Distress indicators
  if (p.is_probate != null) {
    lines.push(`- Probate/Estate: ${p.is_probate ? '✓ YES (+10 pts)' : 'No'}`);
  }
  if (p.is_foreclosure != null) {
    lines.push(`- Foreclosure: ${p.is_foreclosure ? '🚨 YES (+15 pts - URGENT)' : 'No'}`);
  }
  if (p.eviction_count != null && p.eviction_count > 0) {
    lines.push(`- Eviction History: ${p.eviction_count} evictions (+8 pts burned-out landlord)`);
  }
  
  // Mortgage info
  if (p.last_refinance_date) {
    lines.push(`- Last Refinance: ${p.last_refinance_date}`);
  }
  if (p.mortgage_age_years != null) {
    const mortgageNote = p.mortgage_age_years > 15 ? ' (HIGH EQUITY likely)' : '';
    lines.push(`- Mortgage Age: ${p.mortgage_age_years} years${mortgageNote}`);
  }
  
  lines.push('\n### II. FINANCIAL VIABILITY');
  
  if (p.equity_percent != null) {
    let equityLabel = '';
    if (p.equity_percent >= 100) equityLabel = ' 🚨 FREE & CLEAR (+28 pts mandatory)';
    else if (p.equity_percent >= 80) equityLabel = ' (+22 pts mandatory)';
    else if (p.equity_percent >= 60) equityLabel = ' (+18 pts mandatory)';
    else if (p.equity_percent >= 40) equityLabel = ' (+14 pts mandatory)';
    else if (p.equity_percent >= 20) equityLabel = ' (+8 pts mandatory)';
    else equityLabel = ' (LOW - +0 pts)';
    lines.push(`- Estimated Equity: ${p.equity_percent}%${equityLabel}`);
  }
  if (p.arv != null) {
    lines.push(`- ARV (After Repair Value): $${p.arv.toLocaleString()}`);
  }
  if (p.repair_cost != null) {
    lines.push(`- Estimated Repair Cost: $${p.repair_cost.toLocaleString()}`);
    if (p.arv != null) {
      const repairPercent = ((p.repair_cost / p.arv) * 100).toFixed(1);
      lines.push(`- Repair/ARV Ratio: ${repairPercent}%`);
    }
  }
  if (p.mao != null) {
    lines.push(`- MAO (Max Allowable Offer): $${p.mao.toLocaleString()}`);
  }
  if (p.sqft != null) {
    lines.push(`- Square Footage: ${p.sqft.toLocaleString()} sq ft`);
  }
  if (p.bedrooms != null || p.bathrooms != null) {
    lines.push(`- Beds/Baths: ${p.bedrooms ?? '?'}/${p.bathrooms ?? '?'}`);
  }
  if (p.year_built != null) {
    const age = new Date().getFullYear() - p.year_built;
    lines.push(`- Year Built: ${p.year_built} (${age} years old)`);
  }
  if (p.neighborhood_vacancy_rate != null) {
    lines.push(`- Neighborhood Vacancy Rate: ${p.neighborhood_vacancy_rate}%`);
  }
  if (p.price_growth_3yr != null) {
    const growthNote = p.price_growth_3yr > 5 ? ' (GROWING)' : p.price_growth_3yr < 0 ? ' (DECLINING)' : '';
    lines.push(`- 3-Year Price Growth: ${p.price_growth_3yr}%${growthNote}`);
  }
  
  lines.push('\n### III. CLOSING DIFFICULTY');
  
  if (p.active_liens_count != null) {
    const liensNote = p.active_liens_count > 2 ? ' ⚠️ COMPLEX TITLE' : p.active_liens_count === 0 ? ' (CLEAN)' : '';
    lines.push(`- Active Liens: ${p.active_liens_count}${liensNote}`);
  }
  if (p.last_sale_date) {
    lines.push(`- Last Sale Date: ${p.last_sale_date}`);
  }
  if (p.proximity_to_development) {
    lines.push(`- Proximity to Development: ${p.proximity_to_development}`);
  }
  
  lines.push('\n---');
  lines.push('Calculate the PIW-Score using the MANDATORY point tables from the system prompt. Show your math. Be decisive.');
  
  return lines.join('\n');
}

function calculateFallbackScore(p: PropertyData): any {
  let sellerMotivation = 0;
  let financialViability = 0;
  let closingDifficulty = 15;
  
  // === SELLER MOTIVATION (max 40) ===
  
  // Absentee type (mandatory)
  if (p.absentee_type === 'out_of_state') sellerMotivation += 15;
  else if (p.absentee_type === 'local') sellerMotivation += 8;
  else if (p.is_absentee_owner) sellerMotivation += 8;
  
  // Vacant (mandatory)
  if (p.is_vacant) sellerMotivation += 12;
  
  // Ownership length (mandatory)
  if (p.owner_tenure_years != null) {
    if (p.owner_tenure_years >= 20) sellerMotivation += 18;
    else if (p.owner_tenure_years >= 10) sellerMotivation += 15;
    else if (p.owner_tenure_years >= 5) sellerMotivation += 10;
    else if (p.owner_tenure_years >= 3) sellerMotivation += 6;
    else if (p.owner_tenure_years >= 1) sellerMotivation += 3;
  }
  
  // Days on market (mandatory)
  if (p.days_on_market != null) {
    if (p.days_on_market > 180) sellerMotivation += 14;
    else if (p.days_on_market > 90) sellerMotivation += 8;
    else if (p.days_on_market > 0) sellerMotivation += 3;
  }
  
  // Additional signals
  if (p.is_foreclosure) sellerMotivation += 15;
  if (p.tax_debt && p.tax_debt > 2000) sellerMotivation += 12;
  else if (p.tax_delinquent) sellerMotivation += 8;
  if (p.is_probate) sellerMotivation += 10;
  if (p.eviction_count && p.eviction_count > 0) sellerMotivation += 8;
  if (p.owner_type === 'corporation') sellerMotivation += 5;
  if (p.mailing_address_different) sellerMotivation += 3;
  
  sellerMotivation = Math.min(40, sellerMotivation);
  
  // === FINANCIAL VIABILITY (max 35) ===
  
  // Equity (mandatory)
  if (p.equity_percent != null) {
    if (p.equity_percent >= 100) financialViability += 28;
    else if (p.equity_percent >= 80) financialViability += 22;
    else if (p.equity_percent >= 60) financialViability += 18;
    else if (p.equity_percent >= 40) financialViability += 14;
    else if (p.equity_percent >= 20) financialViability += 8;
  }
  
  // Additional
  if (p.price_growth_3yr != null && p.price_growth_3yr > 5) financialViability += 5;
  if (p.property_type === 'single_family') financialViability += 3;
  if (p.arv && p.repair_cost) {
    const margin = (p.arv - p.repair_cost) / p.arv;
    if (margin > 0.3) financialViability += 5;
  }
  
  financialViability = Math.min(35, financialViability);
  
  // === CLOSING DIFFICULTY (max 25) ===
  if (p.active_liens_count != null) {
    if (p.active_liens_count === 0) closingDifficulty += 8;
    else if (p.active_liens_count > 2) closingDifficulty -= (p.active_liens_count - 2) * 5;
  }
  if (p.owner_type === 'individual') closingDifficulty += 3;
  if (p.proximity_to_development === 'high') closingDifficulty += 5;
  closingDifficulty = Math.max(0, Math.min(25, closingDifficulty));
  
  const totalScore = sellerMotivation + financialViability + closingDifficulty;
  const priority = totalScore >= 75 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';
  
  const keyIndicators: string[] = [];
  if (p.absentee_type === 'out_of_state') keyIndicators.push('Out-of-state absentee owner');
  if (p.is_vacant) keyIndicators.push('Vacant property');
  if (p.owner_tenure_years && p.owner_tenure_years >= 10) keyIndicators.push(`${p.owner_tenure_years}+ years ownership fatigue`);
  if (p.equity_percent && p.equity_percent >= 80) keyIndicators.push(`${p.equity_percent}% equity - strong margins`);
  if (p.is_foreclosure) keyIndicators.push('Foreclosure - urgent seller');
  if (p.tax_delinquent) keyIndicators.push('Tax delinquency - financial distress');
  if (p.days_on_market && p.days_on_market > 90) keyIndicators.push(`${p.days_on_market} days on market - MLS frustrated`);
  
  const risks: string[] = [];
  if (p.active_liens_count && p.active_liens_count > 2) risks.push('Multiple liens may complicate title');
  if (p.equity_percent != null && p.equity_percent < 20) risks.push('Low equity limits negotiation room');
  
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
    analysis: `Motivation ${sellerMotivation}/40, Financial ${financialViability}/35, Closing ${closingDifficulty}/25. Total: ${totalScore}/100.`
  };
}
