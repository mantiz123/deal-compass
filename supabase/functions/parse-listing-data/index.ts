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

    // Detect if it's PropStream CMA format
    const isPropStream = /Comparative Market Analysis|PropStream|APN:|Estimated Value:|Estimated Equity:|Mortgage Balance:|Open Liens|Trust Deed\/Mortgage/i.test(rawText);

    console.log('Parsing listing data, text length:', rawText.length, 'source:', isPropStream ? 'PropStream' : 'Listing');

    const systemPrompt = isPropStream ? buildPropStreamPrompt() : buildListingPrompt();

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
          { role: 'user', content: `Extract structured data from this ${isPropStream ? 'PropStream CMA report' : 'listing'}:\n\n${rawText}` }
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

    // Tag the source
    parsedData._source = isPropStream ? 'propstream' : 'listing';

    console.log('Successfully parsed data from', isPropStream ? 'PropStream' : 'listing');

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

function buildPropStreamPrompt(): string {
  return `You are a real estate data extraction expert specializing in PropStream Comparative Market Analysis (CMA) reports.

Extract ALL available data from the PropStream CMA report. Return a JSON object with this exact structure:

{
  "property": {
    "address": "string or null",
    "city": "string or null",
    "state": "string (2-letter code) or null",
    "zip_code": "string or null",
    "listing_price": "number or null (use Estimated Value as listing reference)",
    "bedrooms": "number or null",
    "bathrooms": "number or null",
    "sqft": "number or null (Living Area)",
    "lot_size": "number (in sqft) or null",
    "year_built": "number or null",
    "property_type": "single_family|multi_family|condo|townhouse|land|commercial or null",
    "price_per_sqft": "number or null"
  },
  "propstream_data": {
    "estimated_value": "number or null (Estimated Value field)",
    "mortgage_balance": "number or null (sum of open liens or Mortgage Balance)",
    "equity_amount": "number or null (Estimated Equity dollar amount)",
    "equity_percent": "number or null (equity percentage)",
    "monthly_rent": "number or null (Monthly Rent)",
    "arv": "number or null (use Avg. Sale Price from comparables if available, else Estimated Value)",
    "tax_assessed_value": "number or null (Total Taxable Value)",
    "annual_tax": "number or null (Property Tax per year)",
    "is_foreclosure": "boolean (true if Active Pre-Foreclosure Status exists or Notice of Trustee's Sale found)",
    "auction_date": "string (YYYY-MM-DD) or null",
    "prefc_recording_date": "string (YYYY-MM-DD) or null",
    "prefc_default_amount": "number or null",
    "prefc_unpaid_balance": "number or null",
    "lien_amount": "number or null (total of all open liens)",
    "lien_type": "string or null (primary lien type)",
    "lien_date": "string (YYYY-MM-DD) or null (most recent lien date)",
    "active_liens_count": "number (count of open liens)",
    "last_sale_price": "number or null",
    "last_sale_date": "string (YYYY-MM-DD) or null",
    "owner_name": "string or null",
    "owner_tenure_years": "number or null (calculate from last sale date to now)",
    "days_on_market": "number or null (Days on Market from listing history or market stats)",
    "days_on_market_avg": "number or null (Average DOM from market statistics)",
    "is_vacant": "boolean or null",
    "is_absentee_owner": "boolean (true if mailing address differs from property address)",
    "combined_ltv": "number or null (Combined Loan To Value percentage)"
  },
  "market_data": {
    "estimated_monthly_rent": "number or null",
    "walkability_score": "number (0-100) or null",
    "school_rating": "number (1-10) or null",
    "tax_assessed_value": "number or null",
    "days_on_market": "number or null",
    "zestimate": "number or null",
    "crime_index": "number or null",
    "median_price_sqft": "number or null (Average Sale $ / SqFt from market stats)",
    "avg_dom": "number or null (Average DOM from market statistics)",
    "price_change_30d": "number or null (Last 30 Days Price Change percentage)",
    "rent_change_30d": "number or null (Last 30 Days Rent Change percentage)"
  },
  "repair_estimate": {
    "estimated_repair_cost": "number - calculate based on age, condition, price signals",
    "repair_level": "cosmetic|moderate|heavy|gut_rehab",
    "cost_per_sqft": "number",
    "confidence": "high|medium|low",
    "factors": ["array of reasons"],
    "breakdown": {
      "condition_factor": "number 0-1",
      "age_factor": "number 0-1",
      "keywords_found": ["condition keywords"]
    }
  },
  "comps": [
    {
      "address": "string",
      "sale_price": "number",
      "sale_date": "string (YYYY-MM-DD) or null",
      "bedrooms": "number or null",
      "bathrooms": "number or null",
      "sqft": "number or null",
      "distance_miles": "number or null",
      "price_per_sqft": "number or null"
    }
  ],
  "open_liens": [
    {
      "date": "string or null",
      "type": "string",
      "amount": "number",
      "lender": "string or null",
      "loan_type": "string or null",
      "term": "string or null"
    }
  ],
  "seller_motivation_signals": [
    "string descriptions of motivation indicators"
  ],
  "offer_analysis": {
    "suggested_offer_min": "number or null",
    "suggested_offer_max": "number or null",
    "motivation_level": "high|medium|low",
    "reasoning": "string explaining analysis in Spanish"
  },
  "listing_description": "string or null",
  "price_history": [],
  "school_details": []
}

PROPSTREAM CMA EXTRACTION RULES:
1. COMPARABLES: Extract from the COMPARABLES table. ONLY include entries with sale prices > $100 and < $2,000,000 (filter out obvious outliers like $100, $1,998,700). Include sale_date and distance_miles.
2. LIENS: Extract ALL open liens from the "Open Liens" table. Sum total for lien_amount.
3. FORECLOSURE: Look for "Active Pre-Foreclosure Status", "Notice of Trustee's Sale", "Fail" listing status. Any of these = is_foreclosure: true.
4. ARV CALCULATION: Use Avg. Sale Price from comparables. If not available, use Estimated Value.
5. EQUITY: Extract from "Estimated Equity" and "Combined Loan To Value" fields.
6. MOTIVATION SIGNALS: Look for: foreclosure status, high LTV, old mortgage, tax delinquency, absentee owner, vacant property, multiple liens, Notice of Trustee's Sale.
7. OWNER TENURE: Calculate years from last sale date to today.
8. OFFER ANALYSIS: For foreclosures with equity, suggest 60-70% of estimated value. Factor in mortgage payoff and closing costs.
9. REPAIR ESTIMATE: Use age (year_built), exterior condition, and listing history to estimate.
10. MARKET STATS: Extract from the Statistics pages (Price/Rent Changes, Avg DOM, etc.)
11. Return valid JSON only, no markdown or extra text.`;
}

function buildListingPrompt(): string {
  return `You are a real estate data extraction expert. Extract structured data from raw listing text (Zillow, Realtor.com, Redfin, etc.).

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
    "school_rating": "number (1-10) or null (AVERAGE of all school ratings found)",
    "tax_assessed_value": "number or null",
    "days_on_market": "number or null",
    "zestimate": "number or null",
    "crime_index": "number or null",
    "median_price_sqft": "number or null"
  },
  "repair_estimate": {
    "estimated_repair_cost": "number",
    "repair_level": "cosmetic|moderate|heavy|gut_rehab",
    "cost_per_sqft": "number",
    "confidence": "high|medium|low",
    "factors": ["array of reasons"],
    "breakdown": {
      "condition_factor": "number 0-1",
      "age_factor": "number 0-1",
      "keywords_found": ["keywords found"]
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
      "event": "string",
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
  "seller_motivation_signals": ["string descriptions"],
  "listing_description": "string or null",
  "offer_analysis": {
    "suggested_offer_min": "number or null",
    "suggested_offer_max": "number or null",
    "motivation_level": "high|medium|low",
    "reasoning": "string explaining analysis"
  }
}

REPAIR COST ESTIMATION RULES:
- Gut rehab keywords: "gut", "tear down", "uninhabitable" → $50-70/sqft
- Heavy rehab: "AS-IS", "investor special", "handyman special", "fixer" → $35-50/sqft
- Moderate: "needs updating", "dated", "original", "estate sale" → $20-35/sqft
- Cosmetic: "light updating" → $10-20/sqft
- No keywords: $15-25/sqft
- Age factor: Before 1950 +$5-10, 1950-1970 +$3-5, 1970-1990 +$0-3

Important rules:
- Extract ONLY explicitly present data
- For comps, use "Nearby homes" or "Similar homes" sections with actual addresses
- Convert all prices to numbers
- Map property_type to: single_family, multi_family, condo, townhouse, land, commercial
- For school_rating: Calculate AVERAGE of all school ratings
- Return valid JSON only, no markdown or extra text`;
}
