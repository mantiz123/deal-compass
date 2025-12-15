import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  arv?: number;
  repair_cost?: number;
  mao?: number;
  equity_percent?: number;
  tax_debt?: number;
  is_absentee_owner?: boolean;
  property_type?: string;
  year_built?: number;
  sqft?: number;
}

interface LeadData {
  id: string;
  property_id: string;
  source?: string;
  property?: PropertyData;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, propertyData } = await req.json();
    
    console.log('Calculating PIW score for lead:', leadId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the prompt for AI analysis
    const analysisPrompt = buildAnalysisPrompt(propertyData);

    console.log('Sending request to AI gateway...');
    
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
            content: `You are an expert real estate wholesaling analyst. Your job is to analyze property data and predict the probability of a successful wholesale deal closure.

Consider these factors for scoring:
1. Equity position (higher equity = higher score)
2. Motivation indicators (tax debt, absentee owner = higher score)
3. Repair cost vs ARV ratio (lower repair % = higher score)
4. Property type marketability
5. MAO (Maximum Allowable Offer) margin

You MUST respond with a JSON object in this exact format:
{
  "score": <number between 0-100>,
  "factors": {
    "equity_score": <0-25>,
    "motivation_score": <0-25>,
    "deal_margin_score": <0-25>,
    "marketability_score": <0-25>
  },
  "analysis": "<brief explanation of the score>"
}`
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
              description: "Calculate the PIW score for a real estate lead",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "The overall PIW score from 0-100"
                  },
                  factors: {
                    type: "object",
                    properties: {
                      equity_score: { type: "number" },
                      motivation_score: { type: "number" },
                      deal_margin_score: { type: "number" },
                      marketability_score: { type: "number" }
                    },
                    required: ["equity_score", "motivation_score", "deal_margin_score", "marketability_score"]
                  },
                  analysis: {
                    type: "string",
                    description: "Brief explanation of the score"
                  }
                },
                required: ["score", "factors", "analysis"]
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
    console.log('AI response received:', JSON.stringify(aiResponse));

    // Extract the tool call result
    let result;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback to parsing content if no tool call
      const content = aiResponse.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!result) {
      console.error('Could not parse AI response');
      // Return a fallback calculated score
      result = calculateFallbackScore(propertyData);
    }

    // Update the lead in database if leadId provided
    if (leadId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          piw_score: Math.round(result.score),
          piw_score_factors: result.factors
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

function buildAnalysisPrompt(property: PropertyData): string {
  const parts: string[] = ['Analyze this property for wholesale deal potential:'];
  
  if (property.arv) parts.push(`- ARV (After Repair Value): $${property.arv.toLocaleString()}`);
  if (property.repair_cost) parts.push(`- Estimated Repair Cost: $${property.repair_cost.toLocaleString()}`);
  if (property.mao) parts.push(`- MAO (Max Allowable Offer): $${property.mao.toLocaleString()}`);
  if (property.equity_percent !== undefined) parts.push(`- Owner Equity: ${property.equity_percent}%`);
  if (property.tax_debt) parts.push(`- Tax Debt: $${property.tax_debt.toLocaleString()}`);
  if (property.is_absentee_owner !== undefined) parts.push(`- Absentee Owner: ${property.is_absentee_owner ? 'Yes' : 'No'}`);
  if (property.property_type) parts.push(`- Property Type: ${property.property_type}`);
  if (property.year_built) parts.push(`- Year Built: ${property.year_built}`);
  if (property.sqft) parts.push(`- Square Footage: ${property.sqft}`);
  
  parts.push('\nCalculate the PIW (Probability of Investment Win) score from 0-100.');
  
  return parts.join('\n');
}

function calculateFallbackScore(property: PropertyData): { score: number; factors: any; analysis: string } {
  let equityScore = 0;
  let motivationScore = 0;
  let dealMarginScore = 0;
  let marketabilityScore = 0;

  // Equity score (0-25)
  if (property.equity_percent !== undefined) {
    equityScore = Math.min(25, property.equity_percent * 0.3);
  }

  // Motivation score (0-25)
  if (property.is_absentee_owner) motivationScore += 12;
  if (property.tax_debt && property.tax_debt > 0) motivationScore += 13;

  // Deal margin score (0-25)
  if (property.arv && property.repair_cost) {
    const repairRatio = property.repair_cost / property.arv;
    dealMarginScore = Math.max(0, 25 - (repairRatio * 50));
  }

  // Marketability score (0-25)
  if (property.property_type === 'single_family') marketabilityScore = 20;
  else if (property.property_type === 'multi_family') marketabilityScore = 18;
  else marketabilityScore = 12;

  const totalScore = equityScore + motivationScore + dealMarginScore + marketabilityScore;

  return {
    score: Math.round(totalScore),
    factors: {
      equity_score: Math.round(equityScore),
      motivation_score: Math.round(motivationScore),
      deal_margin_score: Math.round(dealMarginScore),
      marketability_score: Math.round(marketabilityScore)
    },
    analysis: 'Score calculated using standard wholesaling metrics.'
  };
}
