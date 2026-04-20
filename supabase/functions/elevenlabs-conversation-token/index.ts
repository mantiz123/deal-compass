// Edge function: generates ElevenLabs conversation token
// Supports two modes:
//   - 'live'     → real seller call (uses ALEX_AGENT_ID with lead context)
//   - 'training' → simulated seller for practice (uses SELLER_SIMULATOR_AGENT_ID, no lead data)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALEX_AGENT_ID = "agent_6101kpkakyxmev8rddtv93eazfsn";
const SELLER_SIMULATOR_AGENT_ID = "agent_0201kpnewys8fhh97bbq95w09vc2";

// 3 personality system prompts (English, with Spanish auto-detection)
const PERSONALITIES = {
  sarah: `You are Sarah, a warm and empathetic real estate wholesale specialist from KLOSE LLC (Wyoming).
You speak naturally, like a friendly neighbor — never pushy. You build trust before discussing numbers.
Your job is to qualify if {{owner_name}} is open to selling {{property_address}} quickly for cash.

KEY CONTEXT (use this strategically, never dump it on the seller):
- K-Score: {{k_score}}/100 (motivation level)
- ARV: \${{arv}} | Mortgage balance: \${{mortgage_balance}} | Equity: {{equity_percent}}%
- Distress signals: {{distress_signals}}
- Last contact: {{last_contact}}

NEGOTIATION RULES:
- Your MAX offer (MAO) is \${{mao}}. NEVER go above this without calling request_approval tool.
- Your MIN offer is \${{min_offer}}. Start there and only increase if seller pushes back firmly.
- If seller demands above \${{mao}}, call request_approval with proposed_offer and seller_reason.
- If seller says "do not call me again" or similar, call mark_dnc immediately and end politely.

CONVERSATION FLOW:
1. Warm intro: confirm you're talking to {{owner_name}}, mention property
2. Discovery: "How are things with the property right now?" (let them talk)
3. Identify pain: condition, repairs needed, urgency, life situation
4. Position cash offer: "We buy as-is, close in 14 days, no fees, no agents"
5. Get to numbers only after rapport — start at \${{min_offer}}
6. If interested: schedule callback with you (the human owner) for paperwork

LANGUAGE: Speak in the same language the seller uses. Default English. Switch to Spanish if they do.
Keep responses SHORT (1-2 sentences max). Let them talk. Never lecture.`,

  mike: `You are Mike, a confident, direct real estate investor from KLOSE LLC.
You're respectful but you don't waste time. You qualify hard and disqualify fast.
Your job is to find out if {{owner_name}} will sell {{property_address}} at a price that works for cash.

KEY CONTEXT:
- K-Score: {{k_score}}/100
- ARV: \${{arv}} | Mortgage: \${{mortgage_balance}} | Equity: {{equity_percent}}%
- Distress: {{distress_signals}}

NEGOTIATION RULES:
- MAX offer (MAO): \${{mao}}. NEVER exceed without request_approval tool.
- MIN offer: \${{min_offer}}. Open here.
- If seller above MAO: call request_approval immediately.
- If seller says "stop calling": call mark_dnc and end.

STYLE:
- Cut to the point in 30 seconds: "I'm a cash buyer, looking at your property, what would it take?"
- If they're not motivated, thank them and end the call. Don't chase tire-kickers.
- If interested: lock in a number range and schedule human follow-up.

LANGUAGE: Match the seller's language (English/Spanish). Keep responses 1-2 sentences.`,

  discovery: `You are Alex, a real estate market researcher from KLOSE LLC.
You are NOT trying to buy today. Your only job is to LEARN about {{owner_name}}'s situation with {{property_address}}.

KEY CONTEXT (do not reveal these numbers to the seller):
- K-Score: {{k_score}}/100
- ARV estimate: \${{arv}}
- Distress signals we detected: {{distress_signals}}

YOUR GOAL:
1. Confirm property details (beds/baths/condition)
2. Understand owner's situation (still living there? renting? inherited? behind on payments?)
3. Gauge timeline ("If the right offer came along, would you consider selling this year?")
4. Identify the REAL pain (foreclosure? bad tenant? out of state? divorce?)
5. NEVER make an offer. If they ask "what would you pay?", say:
   "Great question — I'd need to send our acquisitions team out for a quick walk-through first.
   Can I schedule that?"

TOOLS:
- If they say "do not contact me": call mark_dnc immediately.
- Do NOT call request_approval (you don't make offers in this mode).

LANGUAGE: Match seller (English/Spanish). Keep responses SHORT and curious. Ask one question at a time.`,
};

const FIRST_MESSAGES = {
  sarah: "Hi, is this {{owner_name}}? This is Sarah calling about your property at {{property_address}}. Do you have a quick minute?",
  mike: "Hey {{owner_name}}, this is Mike. I'm a local cash buyer looking at {{property_address}}. Got 60 seconds?",
  discovery: "Hi {{owner_name}}, this is Alex with KLOSE. I'm doing some research on properties in your area, including {{property_address}}. Is now an okay time for a couple of quick questions?",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const mode = (body.mode || "live") as "live" | "training";

    // ============================================================
    // TRAINING MODE: Seller Simulator (no lead context needed)
    // ============================================================
    if (mode === "training") {
      const tokenRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${SELLER_SIMULATOR_AGENT_ID}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("ElevenLabs token error (training):", tokenRes.status, errText);
        throw new Error(`Token failed [${tokenRes.status}]: ${errText}`);
      }

      const { token } = await tokenRes.json();

      return new Response(
        JSON.stringify({
          token,
          agent_id: SELLER_SIMULATOR_AGENT_ID,
          mode: "training",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // LIVE MODE: Real seller call with lead context
    // ============================================================
    const leadId = body.lead_id;
    const personality = (body.personality || "sarah") as keyof typeof PERSONALITIES;

    if (!leadId) {
      return new Response(JSON.stringify({ error: "lead_id required for live mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!PERSONALITIES[personality]) {
      return new Response(JSON.stringify({ error: "Invalid personality" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to fetch lead + property
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: lead, error: leadErr } = await adminClient
      .from("leads")
      .select("*, properties(*)")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const property = lead.properties;
    if (!property) throw new Error("Property missing");

    // Build distress signals string
    const signals: string[] = [];
    if (property.is_foreclosure) signals.push("PRE-FORECLOSURE");
    if (property.is_vacant) signals.push("VACANT");
    if (property.tax_delinquent) signals.push("TAX-DELINQUENT");
    if (property.is_absentee_owner) signals.push("ABSENTEE-OWNER");
    if (property.is_probate) signals.push("PROBATE");
    const distressStr = signals.length ? signals.join(", ") : "none detected";

    // Compute negotiation range
    const arv = Number(property.arv || 0);
    const mao = Number(lead.offer_amount || property.mao || Math.round(arv * 0.7));
    const minOffer = Math.round(mao * 0.85);

    const dynamicVariables: Record<string, string | number> = {
      owner_name: property.owner_name || "the owner",
      property_address: `${property.address}, ${property.city}, ${property.state}`,
      k_score: lead.piw_score || 0,
      arv: arv.toLocaleString(),
      mortgage_balance: Number(property.mortgage_balance || 0).toLocaleString(),
      equity_percent: property.equity_percent || 0,
      distress_signals: distressStr,
      last_contact: lead.last_contact_at
        ? new Date(lead.last_contact_at).toLocaleDateString()
        : "never",
      mao: mao.toLocaleString(),
      min_offer: minOffer.toLocaleString(),
    };

    const tokenRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ALEX_AGENT_ID}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("ElevenLabs token error:", tokenRes.status, errText);
      throw new Error(`Token failed [${tokenRes.status}]: ${errText}`);
    }

    const { token } = await tokenRes.json();

    return new Response(
      JSON.stringify({
        token,
        agent_id: ALEX_AGENT_ID,
        mode: "live",
        dynamic_variables: dynamicVariables,
        overrides: {
          agent: {
            prompt: { prompt: PERSONALITIES[personality] },
            firstMessage: FIRST_MESSAGES[personality],
          },
        },
        negotiation: { mao, min_offer: minOffer, arv },
        lead_summary: {
          owner: property.owner_name,
          address: property.address,
          k_score: lead.piw_score,
          distress: distressStr,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Token function error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
