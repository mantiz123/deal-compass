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

Important rules:
- Extract ONLY data that is explicitly present in the text
- For comps, use "Nearby homes" or "Similar homes" sections
- Convert all prices to numbers (remove $, commas)
- For property_type, map to: single_family, multi_family, condo, townhouse, land, commercial
- Look for motivation signals like: AS-IS, investor special, handyman special, foreclosure, estate sale, motivated seller, price reduced, quick sale, cash only, etc.
- For school_rating: Calculate the AVERAGE of all school ratings found (e.g., if elementary=2, middle=4, high=2, average = 2.67)
- For offer_analysis: If motivation signals indicate distress (AS-IS, foreclosure, investor special), use lower multipliers
- For median_price_sqft: Look for "$/sqft" or "price per square foot" values
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
