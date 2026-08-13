import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `You extract structured real estate data from an RPR / MLS / Realtor property report.

ABSOLUTE RULES:
- NEVER invent a value. If the report does not state it, return null.
- Numbers must be plain numbers (no $ , % or text).
- Dates must be YYYY-MM-DD.
- Comparables: only include properties presented as comparable/nearby sales or listings, never the subject property itself.
- comp.status must be one of: closed, pending, active, unknown.
- Detect discrepancies between public records and listing facts (e.g. heating "Forced Air Unit" in public records vs "No Heat" in the listing) and list them in publicVsListing.

Return ONLY valid JSON with this exact shape:
{
  "subject": {
    "address": string|null, "city": string|null, "state": string|null, "zip_code": string|null,
    "county": string|null, "mls_id": string|null, "apn": string|null, "property_type": string|null,
    "bedrooms": number|null, "bathrooms": number|null, "sqft": number|null,
    "lot_size_acres": number|null, "year_built": number|null, "list_price": number|null,
    "cma_recommended_offer": number|null, "rvm_value": number|null, "rvm_range_low": number|null,
    "rvm_range_high": number|null, "assessed_value": number|null, "annual_taxes": number|null,
    "zoning": string|null, "listing_description": string|null,
    "heating": string|null, "cooling": string|null, "foundation": string|null,
    "roof": string|null, "basement": string|null, "days_on_market": number|null
  },
  "comps": [{
    "address": string, "price": number|null, "status": "closed"|"pending"|"active"|"unknown",
    "closed_date": string|null, "distance_miles": number|null, "similarity_score": number|null,
    "bedrooms": number|null, "bathrooms": number|null, "sqft": number|null,
    "lot_size_acres": number|null, "year_built": number|null, "days_on_market": number|null,
    "notes": string|null
  }],
  "publicVsListing": [{ "field": string, "publicValue": string, "listingValue": string }],
  "rehabSignals": [string]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { rawText } = await req.json();
    if (typeof rawText !== 'string' || rawText.trim().length < 200) {
      return new Response(JSON.stringify({ error: 'PDF text too short or missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RPR reports are long; keep the most information-dense head of the document.
    const text = rawText.slice(0, 180_000);

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract the data from this property report:\n\n${text}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI gateway error [${res.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: 'AI extraction failed', status: res.status, details: body }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('extract-property-pdf failed:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
