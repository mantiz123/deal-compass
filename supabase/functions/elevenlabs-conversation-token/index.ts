// Edge function: generates ElevenLabs conversation token
// Supports two modes:
//   - 'live'     → real seller call (uses ALEX_AGENT_ID with lead context)
//   - 'training' → simulated seller for practice (uses SELLER_SIMULATOR_AGENT_ID, no lead data)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
1. Warm intro: confirm you're talking to {{owner_name}}, then adapt this situation hook naturally — don't read it verbatim, make it feel like a real conversation opener:
   SITUATION: {{situation_type}} — Hook: "{{opening_hook}}"
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
- Lead with the situation hook ({{situation_type}}): "{{opening_hook}}"
- Cut to the point in 30 seconds after the hook: "What would it take to make a sale happen?"
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
0. Opening hook — use this naturally as your intro ({{situation_type}}): "{{opening_hook}}"
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

// ============================================================
// Opening hook factory — distress-specific first 10 seconds
// ============================================================
function buildOpeningHook(signals: string[], ownerName: string, address: string): { hook: string; situationType: string } {
  if (signals.includes("PRE-FORECLOSURE")) {
    return {
      situationType: "Foreclosure",
      hook: `${ownerName}, I'm reaching out because I saw there may be a foreclosure notice on ${address}. We work with homeowners every week to help them avoid that — get cash in hand and move on with dignity. I wanted to see if there's any way we could help your situation.`,
    };
  }
  if (signals.includes("TAX-DELINQUENT")) {
    return {
      situationType: "Tax Delinquent",
      hook: `${ownerName}, I noticed there are some overdue taxes on ${address}. We work with owners in this exact situation all the time — we can close fast and handle the back taxes so they don't follow you. Wanted to see if a quick cash sale would make sense.`,
    };
  }
  if (signals.includes("ABSENTEE-OWNER")) {
    return {
      situationType: "Absentee Owner",
      hook: `${ownerName}, I'm calling about ${address} — looks like you're managing it from out of the area. A lot of owners I talk to find that a headache, especially with repairs or bad tenants. Wanted to see if you'd ever considered simplifying things with a clean cash sale.`,
    };
  }
  if (signals.includes("VACANT")) {
    return {
      situationType: "Vacant Property",
      hook: `${ownerName}, I'm reaching out about ${address} — I noticed the property has been sitting vacant. Vacant homes can get costly fast between insurance, taxes, and maintenance. We buy them as-is, no repairs, no showings, and we close in 2-3 weeks. Worth a quick conversation?`,
    };
  }
  if (signals.includes("PROBATE")) {
    return {
      situationType: "Probate",
      hook: `${ownerName}, I understand you may be handling the estate for ${address}. We work with families going through probate regularly and try to make the property side as painless as possible — one clean transaction, no repairs, no agents. Just wanted to introduce myself in case it's helpful.`,
    };
  }
  // Generic fallback
  return {
    situationType: "General",
    hook: `${ownerName}, I'm calling because we're actively buying properties in the ${address.split(",").slice(-1)[0]?.trim() || "area"} area. We buy houses as-is for cash and close fast — no agents, no repairs. Just wanted to see if you'd ever considered selling, even if it's not something you're actively thinking about right now.`,
  };
}

// ============================================================
// Build a lead-specific briefing for the training simulator
// ============================================================
function buildPracticeSystemPrompt(property: any, lead: any, signals: string[], mao: number, arv: number): string {
  return `You are a SIMULATED REAL ESTATE SELLER for training purposes.

PROPERTY: ${property.address}, ${property.city}, ${property.state}
OWNER NAME: ${property.owner_name || "the owner"}
SITUATION: ${signals.length ? signals.join(", ") : "General homeowner"}
ARV (market value): $${arv.toLocaleString()}
INVESTOR MAX OFFER (MAO): $${mao.toLocaleString()} — the trainee should NOT exceed this
K-Score: ${lead.piw_score || "unknown"}/100

Play the role of ${property.owner_name || "the owner"} based on the SITUATION above:
- FORECLOSURE: stressed, overwhelmed, somewhat desperate but scared of scams
- TAX-DELINQUENT: embarrassed about the situation, open if you can solve the tax problem
- ABSENTEE-OWNER: tired of managing remotely, open to selling if price is fair
- VACANT: holding costs piling up, motivated but not desperate
- PROBATE: emotionally attached (family home), cautious about value

RULES:
- Your asking price should be 15-25% ABOVE MAO. Start high, negotiate down.
- At the END of the call, emit this exact tag:
  [TRAINING_RESULT: {"persona":"${signals[0] || "GENERAL_SELLER"}","outcome":"<outcome>","agent_score":<0-100>,"strengths":["..."],"weaknesses":["..."],"final_offer":<number or null>,"would_close":<true/false>}]
- Score the trainee on: rapport, discovery questions, objection handling, pricing discipline (stayed near MAO), and closing.

Speak naturally. Be realistic. Create at least 2-3 genuine objections.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth using anon key client (service role bypasses JWT validation)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const mode = (body.mode || "live") as "live" | "training";

    // ============================================================
    // TRAINING MODE: Seller Simulator
    // Optional: pass practice_lead_id to brief simulator on a real lead
    // ============================================================
    if (mode === "training") {
      const practiceLeadId = body.practice_lead_id as string | undefined;
      let trainingOverrides: Record<string, unknown> | undefined;
      let trainingDynVars: Record<string, string | number> | undefined;
      let trainingNegotiation: { mao: number; arv: number } | undefined;

      if (practiceLeadId) {
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: practiceLead } = await adminClient
          .from("leads")
          .select("*, properties(*)")
          .eq("id", practiceLeadId)
          .single();

        if (practiceLead?.properties) {
          const prop = practiceLead.properties;
          const pArv = Number(prop.arv || 0);
          const pMao = Number(practiceLead.offer_amount || prop.mao || Math.round(pArv * 0.65));
          const pSignals: string[] = [];
          if (prop.is_foreclosure) pSignals.push("PRE-FORECLOSURE");
          if (prop.is_vacant) pSignals.push("VACANT");
          if (prop.tax_delinquent) pSignals.push("TAX-DELINQUENT");
          if (prop.is_absentee_owner) pSignals.push("ABSENTEE-OWNER");
          if (prop.is_probate) pSignals.push("PROBATE");

          const practicePrompt = buildPracticeSystemPrompt(prop, practiceLead, pSignals, pMao, pArv);
          trainingOverrides = {
            agent: {
              prompt: { prompt: practicePrompt },
              firstMessage: `Hello? Who is this?`,
            },
          };
          trainingDynVars = {
            property_address: `${prop.address}, ${prop.city}`,
            owner_name: prop.owner_name || "the owner",
          };
          trainingNegotiation = { mao: pMao, arv: pArv };
        }
      }

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
          ...(trainingOverrides ? { overrides: trainingOverrides } : {}),
          ...(trainingDynVars ? { dynamic_variables: trainingDynVars } : {}),
          ...(trainingNegotiation ? { negotiation: { ...trainingNegotiation, min_offer: Math.round(trainingNegotiation.mao * 0.85) } } : {}),
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
    // Alabama: 65% rule (70% is national standard — AL is a deeper discount market)
    const mao = Number(lead.offer_amount || property.mao || Math.round(arv * 0.65));
    const minOffer = Math.round(mao * 0.85);

    // Build situation-specific opening hook
    const ownerName = property.owner_name || "the owner";
    const fullAddress = `${property.address}, ${property.city}`;
    const { hook: openingHook, situationType } = buildOpeningHook(signals, ownerName, fullAddress);

    const dynamicVariables: Record<string, string | number> = {
      owner_name: ownerName,
      property_address: `${property.address}, ${property.city}, ${property.state}`,
      k_score: lead.piw_score || 0,
      arv: arv.toLocaleString(),
      mortgage_balance: Number(property.mortgage_balance || 0).toLocaleString(),
      equity_percent: property.equity_percent || 0,
      distress_signals: distressStr,
      situation_type: situationType,
      opening_hook: openingHook,
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

    // ============================================================
    // REALISM TUNING (HappyRobot-style):
    // - eleven_turbo_v2_5 → ultra-low latency (<300ms), more expressive in EN-US
    // - stability 0.30 → more emotional variability (vs default 0.5 = robotic)
    // - style 0.70 → leans into the voice's natural personality
    // - similarity_boost 0.80 → keeps voice identity intact
    // - speaker_boost true → punchier, clearer phone-call audio
    // Per-personality speed: Sarah pausada, Mike enérgico, Alex neutral
    // ============================================================
    const PERSONALITY_SPEED: Record<string, number> = {
      sarah: 0.96,
      mike: 1.05,
      discovery: 1.00,
    };

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
            language: "en",
          },
          tts: {
            modelId: "eleven_turbo_v2_5",
            voiceSettings: {
              stability: 0.30,
              similarity_boost: 0.80,
              style: 0.70,
              use_speaker_boost: true,
              speed: PERSONALITY_SPEED[personality] ?? 1.0,
            },
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
