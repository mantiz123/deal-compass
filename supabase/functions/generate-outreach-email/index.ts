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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service client for data queries (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const address = `${p.address}, ${p.city}, ${p.state} ${p.zip_code}`;
    const sqft = p.sqft ? `${p.sqft.toLocaleString()} sqft` : "N/A";
    const bedsBaths = `${p.bedrooms || "N/A"} bed / ${p.bathrooms || "N/A"} bath`;
    const arv = p.arv ? `$${p.arv.toLocaleString()}` : "N/A";
    const mortgageBalance = p.mortgage_balance ? `$${p.mortgage_balance.toLocaleString()}` : null;
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
      systemPrompt = `You are a professional real estate investment copywriter for Klose LLC. Generate a SHORT, direct, and professional initial outreach email to a property owner. Keep it concise — no filler, no fluff. The email must:
1. Address the owner by first name
2. Briefly introduce Sergio Mantilla, Managing Director of Klose
3. Include the required Alabama Wholesale & Assignment Disclosure (Who We Are, Our Process, Fees) but keep each section to 1-2 sentences max
4. Mention awareness of property situation tactfully in one sentence
5. Ask if they're open to a formal purchase proposal
6. One-line opt-out option
7. Signature: Sergio Mantilla, Managing Director | Klose LLC
8. Mandatory legal disclaimer block (REQUIRED — do not omit or shorten):
   "I am an Independent Contractor of KLOSE LLC, a Wyoming registered real estate investment firm (EIN 41-4409334). I am NOT a licensed real estate agent and do not represent you in any real estate transaction. KLOSE LLC purchases properties as a principal buyer or assigns purchase contracts to end buyers."

CRITICAL FORMATTING RULES:
- Output ONLY plain text. Do NOT use markdown formatting.
- Do NOT use asterisks (**) for bold or any other markdown syntax.
- Use ALL CAPS for section headers instead of bold formatting.
- The legal disclaimer block above MUST appear verbatim at the bottom, after the signature, under the header "LEGAL DISCLAIMER".
- Keep the entire email under 280 words (excluding the disclaimer).`;

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

      systemPrompt = `You are a professional real estate investment copywriter for Klose LLC. Generate a CONCISE foreclosure/distress offer email. Be direct — get to the numbers fast. The email must:
1. Address the owner by first name
2. One sentence acknowledging the foreclosure situation
3. Position the offer as a solution in 2-3 sentences (save credit, pay mortgage, get cash)
4. Brief WHO WE ARE disclosure (wholesalers, assignment, fees — 3 short bullet points max)
5. OUR OFFER section with specific dollar amounts (Offer, Mortgage Payoff, Net to Seller)
6. 4 quick bullet points: what they get (payoff, cash, no costs, speed)
7. 4 short CONFIRM questions (price, occupied, systems, HOA/liens)
8. 3-step HOW IT WORKS (Agreement, Title, Closing)
9. Signature: Sergio Mantilla, Managing Director | Klose LLC
10. Mandatory legal disclaimer block (REQUIRED — do not omit or shorten):
    "I am an Independent Contractor of KLOSE LLC, a Wyoming registered real estate investment firm (EIN 41-4409334). I am NOT a licensed real estate agent and do not represent you in any real estate transaction. KLOSE LLC purchases properties as a principal buyer or assigns purchase contracts to end buyers."

CRITICAL FORMATTING RULES:
- Output ONLY plain text. Do NOT use markdown formatting.
- Do NOT use asterisks (**) for bold or any other markdown syntax.
- Use ALL CAPS for section headers instead of bold formatting.
- The legal disclaimer block above MUST appear verbatim at the bottom, after the signature, under the header "LEGAL DISCLAIMER".
- Keep the entire email under 380 words (excluding the disclaimer).`;

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
