import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { leadId, templateType, manualData } = await req.json();
    if (!leadId || !templateType) throw new Error("leadId and templateType required");

    // Fetch lead + property data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*, property:properties(*)")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) throw new Error("Lead not found");
    const p = lead.property;

    // Build context for AI
    const ownerName = p.owner_name || "Property Owner";
    const ownerFirstName = ownerName.split(" ")[0];
    const address = `${p.address}, ${p.city}, ${p.state} ${p.zip_code}`;
    const sqft = p.sqft ? `${p.sqft.toLocaleString()} sqft` : "N/A";
    const bedsBaths = `${p.bedrooms || "N/A"} bed / ${p.bathrooms || "N/A"} bath`;
    const arv = p.arv ? `$${p.arv.toLocaleString()}` : "N/A";
    const mortgageBalance = p.mortgage_balance ? `$${p.mortgage_balance.toLocaleString()}` : null;
    const listingPrice = lead.listing_price ? `$${lead.listing_price.toLocaleString()}` : null;
    const repairCost = p.repair_cost ? `$${p.repair_cost.toLocaleString()}` : null;
    const isForeclosure = p.is_foreclosure;
    const prefcRecordType = p.prefc_record_type || null;
    const prefcRecordingDate = p.prefc_recording_date || null;
    const prefcUnpaidBalance = p.prefc_unpaid_balance ? `$${p.prefc_unpaid_balance.toLocaleString()}` : null;
    const equityPercent = p.equity_percent ? `${p.equity_percent}%` : null;
    const propertyCondition = p.property_condition || p.exterior_condition || null;
    const yearBuilt = p.year_built || null;
    const assignmentFee = manualData?.assignmentFee || lead.assignment_fee || null;
    const offerAmount = manualData?.offerAmount || lead.offer_amount || null;
    const lowestSourcePrice = manualData?.lowestSourcePrice || null;
    const closingTimeline = manualData?.closingTimeline || "14-21 days";

    let systemPrompt = "";
    let userPrompt = "";

    if (templateType === "initial_outreach") {
      systemPrompt = `You are a professional real estate investment copywriter for Klose LLC. Generate a professional, warm, and transparent initial outreach email to a property owner. The email must:
1. Address the owner by first name
2. Introduce Sergio Mantilla as Managing Director of Klose
3. Mention they are active in the property's area
4. Include the full Wholesale & Assignment Disclosure (Who We Are, Our Process, Fees sections)
5. Mention awareness of property situation tactfully without being pushy
6. Ask if they're open to receiving a formal purchase proposal
7. Include a respectful opt-out option
8. End with signature block: Sergio Mantilla, Managing Director | Klose LLC
9. Include legal disclaimer at bottom
10. Be professional but approachable, NOT aggressive or pushy
Output ONLY the email text, no subject line labels or extra formatting.`;

      userPrompt = `Generate an initial outreach email for:
- Owner Name: ${ownerName}
- Property Address: ${address}
- Property Type: ${p.property_type?.replace("_", " ") || "residential"}
- Size: ${sqft}, ${bedsBaths}
- Year Built: ${yearBuilt || "N/A"}
- ARV: ${arv}
${isForeclosure ? `- Foreclosure Status: Yes (${prefcRecordType || "Notice filed"})` : ""}
${mortgageBalance ? `- Mortgage Balance: ${mortgageBalance}` : ""}
${equityPercent ? `- Equity: ${equityPercent}` : ""}
${propertyCondition ? `- Property Condition: ${propertyCondition}` : ""}
${lowestSourcePrice ? `- Lowest Market Value Found: ${lowestSourcePrice}` : ""}
${p.is_vacant ? "- Property appears vacant" : ""}
${p.tax_delinquent ? "- Tax delinquent status" : ""}`;

    } else if (templateType === "foreclosure_offer") {
      if (!offerAmount) throw new Error("offerAmount is required for foreclosure offer template");

      const netToSeller = offerAmount && mortgageBalance
        ? `$${(Number(offerAmount) - Number(p.mortgage_balance)).toLocaleString()}`
        : "TBD";

      systemPrompt = `You are a professional real estate investment copywriter for Klose LLC. Generate a detailed foreclosure/distress offer email. The email must:
1. Address the owner by first name
2. Be transparent about knowledge of foreclosure/distress situation
3. Position the offer as a SOLUTION (save credit, pay off mortgage, get cash)
4. Include WHO WE ARE & LEGAL DISCLOSURE section (Wholesalers, Assignment Disclosure, Fee info)
5. Include OUR OFFER & THE NUMBERS section with specific dollar amounts
6. List what happens if they accept (Mortgage Payoff, Cash to Seller, No Costs, Speed)
7. Include BEFORE WE PROCEED questions (open to price?, occupied?, major systems?, HOA/liens?)
8. Include HOW IT WORKS steps (Agreement, Title Search, Closing)
9. Be empathetic and professional, emphasize dignity and speed
10. End with signature: Sergio Mantilla, Managing Director | Klose LLC
11. Include legal disclaimer
Output ONLY the email text.`;

      userPrompt = `Generate a foreclosure offer email for:
- Owner Name: ${ownerName}
- Property Address: ${address}
- Size: ${sqft}, ${bedsBaths}
- Year Built: ${yearBuilt || "N/A"}
- ARV: ${arv}
- Offer Amount: $${Number(offerAmount).toLocaleString()}
${mortgageBalance ? `- Mortgage Balance: ${mortgageBalance}` : ""}
${mortgageBalance && offerAmount ? `- Estimated Net to Seller: ${netToSeller}` : ""}
${assignmentFee ? `- Assignment Fee: $${Number(assignmentFee).toLocaleString()}` : "- Assignment Fee: $5,000"}
${prefcRecordType ? `- Foreclosure Type: ${prefcRecordType}` : "- Foreclosure: Yes"}
${prefcRecordingDate ? `- Filing Date: ${prefcRecordingDate}` : ""}
${prefcUnpaidBalance ? `- Unpaid Balance (Pre-FC): ${prefcUnpaidBalance}` : ""}
${p.auction_date ? `- Auction Date: ${p.auction_date}` : ""}
${repairCost ? `- Estimated Repairs: ${repairCost}` : ""}
${propertyCondition ? `- Property Condition: ${propertyCondition}` : ""}
- Closing Timeline: ${closingTimeline}
${lowestSourcePrice ? `- Lowest Source Price (Zillow/Redfin/PropStream): ${lowestSourcePrice}` : ""}`;
    } else {
      throw new Error("Invalid templateType. Use 'initial_outreach' or 'foreclosure_offer'");
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const emailContent = aiData.choices?.[0]?.message?.content || "";

    // Generate suggested subject line
    const subjectLine = templateType === "initial_outreach"
      ? `Purchase Proposal Inquiry – ${p.address}`
      : `Formal Offer for ${p.address} – Klose LLC`;

    return new Response(
      JSON.stringify({
        email: emailContent,
        subject: subjectLine,
        templateType,
        propertyAddress: address,
        ownerEmail: p.owner_email || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-outreach-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
