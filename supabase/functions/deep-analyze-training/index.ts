// Deep analysis of a training transcript using Lovable AI (Gemini).
// Returns skill-level scores + actionable coaching summary.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an elite real-estate wholesaling sales coach.
You evaluate a TRAINEE (AGENTE) practicing against a SIMULATED SELLER.

Return STRICT JSON (no markdown, no prose) with this exact shape:
{
  "skill_scores": {
    "rapport": 0-100,
    "discovery": 0-100,
    "objection_handling": 0-100,
    "pricing_discipline": 0-100,
    "closing": 0-100
  },
  "overall_score": 0-100,
  "coaching_summary": "3-5 sentence actionable coaching feedback in Spanish. Tone: warm, direct, expert. No fluff. Mention 1 specific thing the agent did well + 2 concrete improvements with example phrasing.",
  "best_moment": "1 sentence quoting or paraphrasing the agent's strongest line",
  "worst_moment": "1 sentence quoting or paraphrasing the agent's weakest line or missed opportunity",
  "next_drill": "1 sentence recommending what skill to practice next (e.g. 'Practica anclaje de precio bajo ARV antes de mencionar repairs')"
}

Rubric per skill (0-100):
- rapport: empathy, tone matching, building trust early
- discovery: open questions, uncovered timeline/motivation/condition/title issues
- objection_handling: reframed pushback without being defensive
- pricing_discipline: stayed near MAO (70% ARV - repairs - fee), didn't overpay
- closing: clear next steps, soft commitment, follow-up scheduled

overall_score = weighted avg: rapport*0.20 + discovery*0.20 + objection_handling*0.20 + pricing_discipline*0.25 + closing*0.15

If transcript <8 turns, return overall_score 0 and coaching_summary "Transcripción demasiado corta para analizar. Practica una llamada completa de al menos 3-5 minutos."

ALL TEXT FIELDS IN SPANISH.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { transcript, persona, difficulty } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.length < 50) {
      return new Response(
        JSON.stringify({ error: "Transcript too short" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userMsg = `PERSONA: ${persona ?? "UNKNOWN"}
DIFFICULTY: ${difficulty ?? "medium"}

TRANSCRIPT:

${transcript}`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI failed [${aiRes.status}]: ${errText}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned empty content");

    const parsed = JSON.parse(content);

    // Normalize
    const clamp = (n: unknown) =>
      typeof n === "number"
        ? Math.max(0, Math.min(100, Math.round(n)))
        : 0;

    const skill_scores = {
      rapport: clamp(parsed.skill_scores?.rapport),
      discovery: clamp(parsed.skill_scores?.discovery),
      objection_handling: clamp(parsed.skill_scores?.objection_handling),
      pricing_discipline: clamp(parsed.skill_scores?.pricing_discipline),
      closing: clamp(parsed.skill_scores?.closing),
    };

    const result = {
      skill_scores,
      overall_score: clamp(parsed.overall_score),
      coaching_summary: String(parsed.coaching_summary ?? ""),
      best_moment: String(parsed.best_moment ?? ""),
      worst_moment: String(parsed.worst_moment ?? ""),
      next_drill: String(parsed.next_drill ?? ""),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("deep-analyze-training error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
