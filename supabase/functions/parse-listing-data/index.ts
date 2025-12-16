import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText } = await req.json();

    if (!rawText || rawText.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Texto insuficiente para analizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing listing data, text length:', rawText.length);

    const systemPrompt = `You are a real estate data extraction expert. Extract structured data from raw listing text (Zillow, Realtor.com, Redfin, etc.).

Return a JSON object with this exact structure:
{
  "property": {
    "address": "string or null",
    "city": "string or null",
    "state": "string (2-letter code) or null",
    "zip_code": "string or null",
    "listing_price": "number or null",
    "bedrooms": "number or null",
    "bathrooms": "number or null",
    "sqft": "number or null",
    "lot_size": "number (in sqft) or null",
    "year_built": "number or null",
    "property_type": "single_family|multi_family|condo|townhouse|land|commercial or null",
    "price_per_sqft": "number or null"
  },
  "market_data": {
    "estimated_monthly_rent": "number or null (look for Rent Zestimate or similar)",
    "walkability_score": "number (0-100) or null (look for Walk Score)",
    "school_rating": "number (1-10) or null (AVERAGE of all school ratings found - elementary, middle, high)",
    "tax_assessed_value": "number or null",
    "days_on_market": "number or null",
    "zestimate": "number or null",
    "crime_index": "number or null (if mentioned)",
    "median_price_sqft": "number or null (extract from price per sqft data)"
  },
  "repair_estimate": {
    "estimated_repair_cost": "number - calculate based on factors below",
    "repair_level": "cosmetic|moderate|heavy|gut_rehab",
    "cost_per_sqft": "number - the $/sqft used for calculation",
    "confidence": "high|medium|low",
    "factors": ["array of strings explaining why this estimate"],
    "breakdown": {
      "condition_factor": "number 0-1 (1=worst condition)",
      "age_factor": "number 0-1 (1=oldest)",
      "keywords_found": ["list of condition keywords found"]
    }
  },
  "school_details": [
    {
      "name": "string",
      "type": "elementary|middle|high",
      "rating": "number (1-10)",
      "distance": "string or null"
    }
  ],
  "price_history": [
    {
      "date": "YYYY-MM-DD or null",
      "event": "string (Listed, Price change, Sold, etc.)",
      "price": "number"
    }
  ],
  "comps": [
    {
      "address": "string",
      "sale_price": "number",
      "bedrooms": "number or null",
      "bathrooms": "number or null",
      "sqft": "number or null"
    }
  ],
  "seller_motivation_signals": [
    "string descriptions of any motivation indicators found (AS-IS, investor special, quick sale, etc.)"
  ],
  "listing_description": "string or null",
  "offer_analysis": {
    "suggested_offer_min": "number or null (calculate: listing_price * 0.6 for distressed, * 0.75 for normal)",
    "suggested_offer_max": "number or null (calculate: listing_price * 0.8 for distressed, * 0.9 for normal)", 
    "motivation_level": "high|medium|low (based on signals found)",
    "reasoning": "string explaining the offer range based on signals found"
  }
}

REPAIR COST ESTIMATION RULES:
Use this formula: estimated_repair_cost = sqft * cost_per_sqft

Determine cost_per_sqft based on these factors:

1. CONDITION KEYWORDS (check listing description):
   - Gut rehab keywords: "gut", "tear down", "total renovation", "shell", "uninhabitable" → $50-70/sqft
   - Heavy rehab keywords: "AS-IS", "investor special", "handyman special", "fixer", "needs work", "TLC", "potential", "bring contractor", "cash only", "sold as-is" → $35-50/sqft
   - Moderate rehab keywords: "needs updating", "dated", "original", "estate sale", "cosmetic", "minor repairs" → $20-35/sqft
   - Cosmetic only: "move-in ready with updates needed", "light updating" → $10-20/sqft
   - No condition keywords: assume $15-25/sqft

2. AGE FACTOR (year_built):
   - Built before 1950: add $5-10/sqft (old systems, lead, asbestos risk)
   - Built 1950-1970: add $3-5/sqft
   - Built 1970-1990: add $0-3/sqft
   - Built after 1990: no addition

3. PRICE SIGNALS:
   - If listing_price < $50/sqft (for the area), likely needs significant work
   - Multiple price drops indicate motivation and possibly hidden issues

4. CONFIDENCE LEVEL:
   - High: Multiple clear condition keywords found
   - Medium: Some keywords or age-based estimate
   - Low: No keywords, estimate based on age alone

Important rules:
- Extract ONLY data that is explicitly present in the text
- For comps, use "Nearby homes" or "Similar homes" sections - ONLY include properties with actual addresses (not just land parcels)
- Convert all prices to numbers (remove $, commas)
- For property_type, map to: single_family, multi_family, condo, townhouse, land, commercial
- Look for motivation signals like: AS-IS, investor special, handyman special, foreclosure, estate sale, motivated seller, price reduced, quick sale, cash only, etc.
- For school_rating: Calculate the AVERAGE of all school ratings found (e.g., if elementary=2, middle=4, high=2, average = 2.67)
- For offer_analysis: If motivation signals indicate distress (AS-IS, foreclosure, investor special), use lower multipliers
- For median_price_sqft: Look for "$/sqft" or "price per square foot" values
- For repair_estimate: ALWAYS provide an estimate even if no keywords found - use age and price signals
- Return valid JSON only, no markdown or extra text`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract structured data from this listing:\n\n${rawText}` }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al procesar con IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se recibió respuesta de la IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let parsedData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al parsear respuesta de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed listing data');

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing listing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
