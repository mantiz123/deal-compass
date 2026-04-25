// Analyzes a training call transcript using Lovable AI (Gemini) when the
// Seller Simulator agent didn't emit a [TRAINING_RESULT: {...}] tag.
// Returns the same shape as parseTrainingResult so the client can persist it.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a sales coach evaluating a real estate wholesaling training call.
The trainee (AGENTE) is practicing against a SIMULATED SELLER played by an AI.

Analyze the transcript and return STRICT JSON with this exact shape (no prose, no markdown):
{
  "persona": "DESPERATE_FORECLOSURE" | "SKEPTICAL_PROBATE" | "TIRE_KICKER_GREEDY" | "CONFUSED_ELDERLY" | "UNKNOWN",
  "outcome": string (short snake_case label, e.g. "closed_at_152k", "no_deal_price_too_high", "seller_hung_up"),
  "agent_score": integer 0-100,
  "strengths": string[] (2-4 short bullet phrases),
  "weaknesses": string[] (2-4 short bullet phrases),
  "final_offer": number | null (the LAST dollar offer the agent put on the table),
  "would_close": boolean (would a real seller of this profile actually close at that offer?)
}

Scoring rubric:
- Rapport & empathy (25)
- Discovery / pain identification (20)
- Objection handling (20)
- Pricing discipline (stayed near MAO, didn't overpay) (20)
- Close & next-step clarity (15)

If the transcript is too short (<6 turns), return agent_score 0 and outcome "insufficient_data".
Detect persona from seller behavior: panic+timeline=DESPERATE_FORECLOSURE,
distrust+inheritance=SKEPTICAL_PROBATE, greed+wishful price=TIRE_KICKER_GREEDY,
confusion+repetition=CONFUSED_ELDERLY.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.length < 50) {
      return new Response(
        JSON.stringify({ error: "Transcript too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `TRANSCRIPT:\n\n${transcript}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI failed [${aiRes.status}]: ${errText}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned empty content");

    const parsed = JSON.parse(content);

    // Normalize
    const validPersonas = [
      "DESPERATE_FORECLOSURE",
      "SKEPTICAL_PROBATE",
      "TIRE_KICKER_GREEDY",
      "CONFUSED_ELDERLY",
    ];
    const result = {
      persona: validPersonas.includes(parsed.persona) ? parsed.persona : "UNKNOWN",
      outcome: typeof parsed.outcome === "string" ? parsed.outcome : null,
      agent_score:
        typeof parsed.agent_score === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.agent_score)))
          : null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 6) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String).slice(0, 6) : [],
      final_offer: typeof parsed.final_offer === "number" ? parsed.final_offer : null,
      would_close: typeof parsed.would_close === "boolean" ? parsed.would_close : null,
      source: "ai_fallback",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("analyze-training-call error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
