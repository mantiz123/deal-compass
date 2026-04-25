// Edge function: generate-agent-demo
// Genera un diálogo realista entre un agente Klose (Sarah/Mike/Alex) y un seller simulado.
// Sintetiza cada turno con ElevenLabs TTS, concatena en un MP3 y lo guarda en Storage.
// Body: { agent_persona, seller_persona, language }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voces ElevenLabs (multilingual_v2 soporta EN/ES)
const VOICES = {
  agent: {
    sarah: "EXAVITQu4vr4xnSDxMaL",          // Sarah — femenina, cálida
    mike: "TX3LPaxmHKxFdv7VOQHJ",           // Liam — masculina, directa
    alex_discovery: "JBFqnCBsd6RMkjVDRZzb", // George — masculina, neutral
  },
  seller: {
    motivated: "cgSgspJ2msm6clMCkdW9",   // Jessica — mujer adulta, preocupada
    hostile: "nPczCjzI2devNBz1zQrb",     // Brian — hombre maduro, escéptico
    undecided: "pFZP5JQG7iQjIQuC4Bku",   // Lily — mujer, dubitativa
    foreclosure: "onwK4e9ZLuTAKqWW03F9", // Daniel — hombre, estresado
    absentee: "iP95p4xoKVk53GoZ742B",    // Chris — hombre relajado
  },
} as const;

const AGENT_DESCRIPTIONS: Record<string, string> = {
  sarah: "Sarah — warm, empathetic wholesale specialist from KLOSE LLC. Builds trust before talking numbers. Speaks like a friendly neighbor.",
  mike: "Mike — confident, direct cash investor from KLOSE LLC. Cuts to the point in 30 seconds. Doesn't waste time with tire-kickers.",
  alex_discovery: "Alex — KLOSE market researcher. NEVER makes offers. Only asks discovery questions to learn the seller's situation.",
};

const SELLER_DESCRIPTIONS: Record<string, string> = {
  motivated: "A motivated seller who needs to sell fast (job relocation, divorce, or financial pressure). Open to a fair cash offer.",
  hostile: "A skeptical, hostile homeowner who has received many wholesaler calls. Defensive, asks tough questions, may threaten to hang up.",
  undecided: "An indecisive owner who is considering selling but is not sure. Asks lots of questions, hesitates on every answer.",
  foreclosure: "An owner facing pre-foreclosure with 60 days before auction. Stressed, embarrassed, but willing to talk if approached with empathy.",
  absentee: "An out-of-state landlord tired of dealing with a problem property and bad tenants. Pragmatic, wants a clean exit.",
};

interface DialogueTurn {
  speaker: "agent" | "seller";
  text: string;
}

async function generateDialogue(
  agentPersona: string,
  sellerPersona: string,
  language: string,
  lovableApiKey: string
): Promise<{ turns: DialogueTurn[]; scenarioSummary: string }> {
  const langInstruction = language === "es"
    ? "ENTIRE dialogue MUST be in Spanish (Latin American neutral)."
    : "ENTIRE dialogue MUST be in natural conversational American English (Alabama/Southern US flavor when appropriate).";

  const prompt = `Generate a realistic 10-turn cold-call dialogue for KLOSE LLC real estate wholesaling training.

AGENT: ${AGENT_DESCRIPTIONS[agentPersona]}
SELLER: ${SELLER_DESCRIPTIONS[sellerPersona]}

${langInstruction}

REQUIREMENTS:
- 10 turns total, alternating agent/seller, starting with agent
- Each turn: 1-3 sentences MAX (natural phone conversation length)
- MUST sound 100% human, NEVER scripted or robotic
- Include natural filler words: "uh", "um", "you know", "I mean", "well...", "look,"
- Use ellipses (...) to mark thinking pauses, and commas for breath pauses
- Include real emotional reactions: hesitation, surprise, frustration, relief, doubt
- Agent should use contractions (I'm, we're, that's, gonna, wanna) — never formal
- Seller should sound like a real homeowner: tired, suspicious, or stressed depending on persona
- Use a real-sounding fake address (e.g. "1245 Maple Drive in Birmingham, Alabama")
- End with a natural conclusion (callback scheduled, polite no, or hangup)
- NO stage directions, NO "[pause]" markers, NO narrator text — only spoken words
- Each line should read like a real phone transcript, not a sales script

Also provide a 1-sentence scenario summary describing the situation.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You generate realistic real estate cold-call dialogues for training purposes." },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_dialogue",
          description: "Submit the generated dialogue",
          parameters: {
            type: "object",
            properties: {
              scenario_summary: { type: "string" },
              turns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    speaker: { type: "string", enum: ["agent", "seller"] },
                    text: { type: "string" },
                  },
                  required: ["speaker", "text"],
                  additionalProperties: false,
                },
              },
            },
            required: ["scenario_summary", "turns"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_dialogue" } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 429) throw new Error("Rate limit exceeded on AI Gateway");
    if (response.status === 402) throw new Error("AI Gateway credits exhausted");
    throw new Error(`Dialogue generation failed [${response.status}]: ${err}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");
  const args = JSON.parse(toolCall.function.arguments);
  return { turns: args.turns, scenarioSummary: args.scenario_summary };
}

async function synthesizeTurn(
  text: string,
  voiceId: string,
  apiKey: string,
  language: "en" | "es"
): Promise<Uint8Array> {
  // Inglés → turbo_v2_5 (más natural y expresivo en EN-US)
  // Español → multilingual_v2 (único que soporta ES bien)
  const modelId = language === "en" ? "eleven_turbo_v2_5" : "eleven_multilingual_v2";

  // Ajustes más expresivos para sonar humano
  const voiceSettings = language === "en"
    ? { stability: 0.35, similarity_boost: 0.8, style: 0.65, use_speaker_boost: true, speed: 1.0 }
    : { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true, speed: 1.0 };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS failed [${response.status}]: ${err}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function concatMp3(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let demoId: string | null = null;
  let supabaseAdmin: ReturnType<typeof createClient> | null = null;

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const agentPersona = body.agent_persona as keyof typeof VOICES.agent;
    const sellerPersona = body.seller_persona as keyof typeof VOICES.seller;
    const language = (body.language || "en") as "en" | "es";

    if (!VOICES.agent[agentPersona]) throw new Error("Invalid agent_persona");
    if (!VOICES.seller[sellerPersona]) throw new Error("Invalid seller_persona");

    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Crear registro en estado 'generating'
    const { data: demoRow, error: insertErr } = await supabaseAdmin
      .from("agent_demos")
      .insert({
        created_by: user.id,
        agent_persona: agentPersona,
        seller_persona: sellerPersona,
        language,
        transcript: [],
        status: "generating",
      })
      .select()
      .single();

    if (insertErr || !demoRow) throw new Error(`Failed to create demo row: ${insertErr?.message}`);
    demoId = demoRow.id as string;

    // 1. Generar diálogo con Gemini
    console.log(`[demo ${demoId}] Generating dialogue...`);
    const { turns, scenarioSummary } = await generateDialogue(
      agentPersona, sellerPersona, language, LOVABLE_API_KEY
    );
    console.log(`[demo ${demoId}] Generated ${turns.length} turns`);

    // 2. Sintetizar cada turno con la voz correspondiente (secuencial para evitar rate limits)
    const audioChunks: Uint8Array[] = [];
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const voiceId = turn.speaker === "agent"
        ? VOICES.agent[agentPersona]
        : VOICES.seller[sellerPersona];
      console.log(`[demo ${demoId}] Synthesizing turn ${i + 1}/${turns.length} (${turn.speaker})`);
      const chunk = await synthesizeTurn(turn.text, voiceId, ELEVENLABS_API_KEY, language);
      audioChunks.push(chunk);
    }

    // 3. Concatenar y subir a Storage
    const finalAudio = concatMp3(audioChunks);
    const filePath = `${user.id}/${demoId}.mp3`;
    console.log(`[demo ${demoId}] Uploading ${finalAudio.length} bytes to ${filePath}`);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("agent-demos")
      .upload(filePath, finalAudio, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    // Generar URL firmada de larga duración (1 año)
    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from("agent-demos")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
    if (signedErr) throw new Error(`Signed URL failed: ${signedErr.message}`);

    // Estimar duración: ~100KB por 8 segundos a 128kbps
    const estimatedDuration = Math.round(finalAudio.length / 16000);

    // 4. Actualizar registro con resultado final
    const { error: updateErr } = await supabaseAdmin
      .from("agent_demos")
      .update({
        transcript: turns,
        scenario_summary: scenarioSummary,
        audio_path: filePath,
        audio_url: signedData.signedUrl,
        duration_seconds: estimatedDuration,
        status: "ready",
      })
      .eq("id", demoId as string);
    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

    console.log(`[demo ${demoId}] ✅ Ready`);

    return new Response(
      JSON.stringify({
        demo_id: demoId,
        status: "ready",
        audio_url: signedData.signedUrl,
        duration_seconds: estimatedDuration,
        transcript: turns,
        scenario_summary: scenarioSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-agent-demo error:", errorMessage);

    if (demoId && supabaseAdmin) {
      await supabaseAdmin
        .from("agent_demos")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", demoId);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
