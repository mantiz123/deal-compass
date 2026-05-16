// twilio-media-stream — Handles two roles on the same URL:
//   1. HTTP POST  → returns TwiML XML telling Twilio to stream audio here
//   2. WebSocket  → proxies real-time audio between Twilio and ElevenLabs
//
// Audio pipeline:
//   Twilio  → MULAW 8kHz → decode → upsample 16kHz → ElevenLabs PCM_16000
//   ElevenLabs PCM_16000 → downsample 8kHz → encode MULAW → Twilio
//
// Required secrets: ELEVENLABS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALEX_AGENT_ID = "agent_6101kpkakyxmev8rddtv93eazfsn";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── MULAW codec ──────────────────────────────────────────────────────────────

function mulawDecode(u: number): number {
  u = ~u & 0xFF;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0F;
  let sample = ((mantissa << 1) + 33) << exponent;
  return sign ? -(sample - 33) : (sample - 33);
}

function mulawEncode(s: number): number {
  const MAX_CLIP = 32635;
  const BIAS = 0x84;
  s = Math.max(-MAX_CLIP, Math.min(MAX_CLIP, s));
  const sign = s < 0 ? 0x80 : 0;
  if (sign) s = -s;
  s += BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exponent > 0; exponent--, mask >>= 1);
  const mantissa = (s >> (exponent + 3)) & 0x0F;
  return ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

// ── Resampling ───────────────────────────────────────────────────────────────

function upsample8to16(pcm8: Int16Array): Int16Array {
  const out = new Int16Array(pcm8.length * 2);
  for (let i = 0; i < pcm8.length - 1; i++) {
    out[i * 2] = pcm8[i];
    out[i * 2 + 1] = Math.round((pcm8[i] + pcm8[i + 1]) / 2);
  }
  const last = pcm8.length - 1;
  out[last * 2] = pcm8[last];
  out[last * 2 + 1] = pcm8[last];
  return out;
}

function downsample16to8(pcm16: Int16Array): Int16Array {
  const out = new Int16Array(Math.floor(pcm16.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = pcm16[i * 2];
  }
  return out;
}

// ── Utility: base64 ─────────────────────────────────────────────────────────

function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function uint8ToB64(buf: Uint8Array): string {
  let str = "";
  for (let i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
  return btoa(str);
}

// ── Lead context helpers ─────────────────────────────────────────────────────

function buildDistressSignals(property: any): string[] {
  const s: string[] = [];
  if (property.is_foreclosure) s.push("PRE-FORECLOSURE");
  if (property.is_vacant) s.push("VACANT");
  if (property.tax_delinquent) s.push("TAX-DELINQUENT");
  if (property.is_absentee_owner) s.push("ABSENTEE-OWNER");
  if (property.is_probate) s.push("PROBATE");
  return s;
}

function buildOpeningHook(signals: string[], ownerName: string, address: string): string {
  if (signals.includes("PRE-FORECLOSURE")) {
    return `${ownerName}, I'm reaching out because I saw there may be a foreclosure notice on ${address}. We work with homeowners every week to help them avoid that — get cash in hand and move on with dignity. Wanted to see if there's any way we could help your situation.`;
  }
  if (signals.includes("TAX-DELINQUENT")) {
    return `${ownerName}, I noticed there are some overdue taxes on ${address}. We work with owners in this exact situation all the time — we can close fast and handle the back taxes so they don't follow you. Wanted to see if a quick cash sale would make sense.`;
  }
  if (signals.includes("ABSENTEE-OWNER")) {
    return `${ownerName}, I'm calling about ${address} — looks like you're managing it from out of the area. A lot of owners find that a headache. Wanted to see if you'd considered simplifying with a clean cash sale.`;
  }
  if (signals.includes("VACANT")) {
    return `${ownerName}, I noticed ${address} has been sitting vacant. Vacant homes get costly fast. We buy them as-is, close in 2-3 weeks. Worth a quick conversation?`;
  }
  return `${ownerName}, I'm calling because we're actively buying properties in the Birmingham area, including near ${address}. We buy as-is for cash, close fast — no agents, no repairs.`;
}

// ── Personality prompts (mirrors elevenlabs-conversation-token) ──────────────

const PERSONALITIES: Record<string, string> = {
  sarah: `You are Sarah, a warm and empathetic real estate wholesale specialist from KLOSE LLC (Wyoming).
You speak naturally, like a friendly neighbor — never pushy. You build trust before discussing numbers.
Your job is to qualify if {{owner_name}} is open to selling {{property_address}} quickly for cash.

KEY CONTEXT:
- K-Score: {{k_score}}/100 | ARV: ${{arv}} | MAO: ${{mao}} | Min offer: ${{min_offer}}
- Distress: {{distress_signals}} | Situation: {{situation_type}}

OPENING: Start with this hook naturally: "{{opening_hook}}"

NEGOTIATION RULES:
- MAX offer (MAO): ${{mao}}. NEVER go above without calling request_approval tool.
- MIN offer: ${{min_offer}}. Start here, only increase if seller pushes back firmly.
- If seller demands above ${{mao}}, call request_approval.
- If seller says "do not call me again", call mark_dnc and end politely.

FLOW: intro hook → discovery → identify pain → position cash offer → numbers → next step.
Keep responses SHORT (1-2 sentences). Let them talk.
LANGUAGE: Match seller (English/Spanish).`,

  mike: `You are Mike, a confident, direct real estate investor from KLOSE LLC.
Respectful but no wasted time. Qualify hard and disqualify fast.

KEY CONTEXT:
- ARV: ${{arv}} | MAO: ${{mao}} | Min: ${{min_offer}}
- Distress: {{distress_signals}} | K-Score: {{k_score}}

OPENING: "{{opening_hook}}"

RULES:
- MAX: ${{mao}}. Call request_approval if seller wants more.
- MIN: ${{min_offer}}.
- If not motivated, thank them and end. Don't chase tire-kickers.
- "do not contact me" → call mark_dnc.

Keep responses 1-2 sentences. Match seller's language.`,

  discovery: `You are Alex, a real estate market researcher from KLOSE LLC.
NOT trying to buy today. ONLY learning about {{owner_name}}'s situation with {{property_address}}.

KEY CONTEXT (do NOT reveal to seller):
- K-Score: {{k_score}} | ARV estimate: ${{arv}} | Distress: {{distress_signals}}

OPENING: "{{opening_hook}}"

GOALS:
1. Confirm property details (beds/baths/condition)
2. Understand situation (living there? renting? inherited? behind on payments?)
3. Gauge timeline
4. Identify real pain
5. NEVER make an offer. If asked "what would you pay?": "I'd need our team to do a quick walkthrough first."

mark_dnc if "do not contact". Don't use request_approval (no offers in this mode).
SHORT responses. Ask one question at a time. Match language.`,
};

const FIRST_MESSAGES: Record<string, string> = {
  sarah: "Hi, is this {{owner_name}}? This is Sarah calling about your property at {{property_address}}. Do you have a quick minute?",
  mike: "Hey {{owner_name}}, this is Mike. I'm a local cash buyer looking at {{property_address}}. Got 60 seconds?",
  discovery: "Hi {{owner_name}}, this is Alex with KLOSE. I'm doing some research on properties in your area, including {{property_address}}. Is now an okay time?",
};

// ── WebSocket audio proxy ────────────────────────────────────────────────────

async function handleMediaStream(req: Request): Promise<Response> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const url = new URL(req.url);
  const leadId = url.searchParams.get("lead_id") || "";
  const personality = url.searchParams.get("personality") || "sarah";

  // Fetch lead context
  let dynamicVars: Record<string, string | number> = {
    owner_name: "the owner",
    property_address: "the property",
    k_score: 0,
    arv: "0",
    mao: "0",
    min_offer: "0",
    distress_signals: "none",
    situation_type: "General",
    opening_hook: "Hi, I'm calling about your property. Do you have a quick minute?",
  };

  if (leadId) {
    try {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: lead } = await adminClient
        .from("leads")
        .select("*, properties(*)")
        .eq("id", leadId)
        .single();

      if (lead?.properties) {
        const p = lead.properties;
        const arv = Number(p.arv || 0);
        const mao = Number(lead.offer_amount || p.mao || Math.round(arv * 0.65));
        const minOffer = Math.round(mao * 0.85);
        const signals = buildDistressSignals(p);
        const ownerName = p.owner_name || "the owner";
        const address = `${p.address}, ${p.city}`;

        dynamicVars = {
          owner_name: ownerName,
          property_address: `${p.address}, ${p.city}, ${p.state}`,
          k_score: lead.piw_score || 0,
          arv: arv.toLocaleString(),
          mao: mao.toLocaleString(),
          min_offer: minOffer.toLocaleString(),
          distress_signals: signals.length ? signals.join(", ") : "none detected",
          situation_type: signals[0]?.replace(/-/g, " ") || "General",
          opening_hook: buildOpeningHook(signals, ownerName, address),
        };
      }
    } catch (e) {
      console.error("Failed to fetch lead for media stream:", e);
    }
  }

  // Get ElevenLabs conversation token
  const tokenRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ALEX_AGENT_ID}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`ElevenLabs token failed: ${errText}`);
  }

  const { token: elevenLabsToken } = await tokenRes.json();

  // Upgrade to WebSocket (Twilio connects here)
  const { socket: twilioWs, response } = Deno.upgradeWebSocket(req);

  let streamSid = "";
  let elevenWs: WebSocket | null = null;
  let elevenReady = false;
  const audioQueue: string[] = [];

  // Flush queued audio to Twilio
  function flushQueue() {
    while (audioQueue.length > 0 && twilioWs.readyState === WebSocket.OPEN && streamSid) {
      const payload = audioQueue.shift()!;
      twilioWs.send(JSON.stringify({
        event: "media",
        streamSid,
        media: { payload },
      }));
    }
  }

  // Connect to ElevenLabs WebSocket
  function connectElevenLabs() {
    const promptText = PERSONALITIES[personality] ?? PERSONALITIES.sarah;
    const firstMsg = FIRST_MESSAGES[personality] ?? FIRST_MESSAGES.sarah;

    // Interpolate dynamic variables into prompts
    const interpolate = (template: string) =>
      template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(dynamicVars[key] ?? ""));

    elevenWs = new WebSocket("wss://api.elevenlabs.io/v1/convai/conversation", [
      `xi-api-key.${ELEVENLABS_API_KEY}`,
    ]);

    elevenWs.onopen = () => {
      // Send conversation init
      elevenWs!.send(JSON.stringify({
        type: "conversation_initiation_client_data",
        conversation_config_override: {
          agent: {
            prompt: { prompt: interpolate(promptText) },
            first_message: interpolate(firstMsg),
          },
          tts: {
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.30,
              similarity_boost: 0.80,
              style: 0.70,
              use_speaker_boost: true,
              speed: personality === "mike" ? 1.05 : personality === "sarah" ? 0.96 : 1.0,
            },
            output_format: "pcm_16000",
          },
          conversation: {
            client_events: ["audio"],
          },
        },
        dynamic_variables: dynamicVars,
        authorization: elevenLabsToken,
      }));
      elevenReady = true;
    };

    elevenWs.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        if (msg.type === "audio" && msg.audio_event?.audio_base64) {
          // ElevenLabs PCM 16kHz → MULAW 8kHz → Twilio
          const pcm16Bytes = b64ToUint8(msg.audio_event.audio_base64);
          const pcm16 = new Int16Array(pcm16Bytes.buffer, pcm16Bytes.byteOffset, pcm16Bytes.byteLength / 2);
          const pcm8 = downsample16to8(pcm16);
          const mulaw = new Uint8Array(pcm8.length);
          for (let i = 0; i < pcm8.length; i++) {
            mulaw[i] = mulawEncode(pcm8[i]);
          }
          audioQueue.push(uint8ToB64(mulaw));
          flushQueue();
        }

        if (msg.type === "agent_response_correction" || msg.type === "client_tool_call") {
          // Forward tool calls / corrections back — these are client-side tools
          // In phone mode there's no human-in-the-loop, so auto-reject offers above MAO
          if (msg.type === "client_tool_call" && msg.tool_name === "request_approval") {
            elevenWs!.send(JSON.stringify({
              type: "client_tool_result",
              tool_call_id: msg.tool_call_id,
              result: "Human not available during automated call. Do NOT exceed MAO. Tell seller you need to confirm with your team and schedule a callback.",
            }));
          }
          if (msg.type === "client_tool_call" && msg.tool_name === "mark_dnc") {
            // DNC handling — fire-and-forget to Supabase
            if (leadId) {
              const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
              adminClient.from("properties")
                .update({ do_not_mail: true })
                .eq("id", leadId)
                .then(() => console.log("DNC marked for lead:", leadId));
            }
            elevenWs!.send(JSON.stringify({
              type: "client_tool_result",
              tool_call_id: msg.tool_call_id,
              result: "DNC marked. End the conversation politely.",
            }));
          }
        }
      } catch (e) {
        console.error("ElevenLabs message parse error:", e);
      }
    };

    elevenWs.onerror = (e) => console.error("ElevenLabs WS error:", e);
    elevenWs.onclose = () => {
      console.log("ElevenLabs WS closed");
      if (twilioWs.readyState === WebSocket.OPEN) {
        // Send Twilio stop message
        twilioWs.send(JSON.stringify({ event: "stop", streamSid }));
      }
    };
  }

  twilioWs.onopen = () => {
    connectElevenLabs();
  };

  twilioWs.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);

      if (msg.event === "start") {
        streamSid = msg.start?.streamSid || "";
        flushQueue();
      }

      if (msg.event === "media" && msg.media?.track === "inbound") {
        if (!elevenWs || !elevenReady) return;
        // Twilio MULAW 8kHz → PCM 8kHz → upsample to 16kHz → ElevenLabs
        const mulawBytes = b64ToUint8(msg.media.payload);
        const pcm8 = new Int16Array(mulawBytes.length);
        for (let i = 0; i < mulawBytes.length; i++) {
          pcm8[i] = mulawDecode(mulawBytes[i]);
        }
        const pcm16 = upsample8to16(pcm8);
        const pcm16Bytes = new Uint8Array(pcm16.buffer);
        elevenWs.send(JSON.stringify({
          user_audio_chunk: uint8ToB64(pcm16Bytes),
        }));
      }

      if (msg.event === "stop") {
        elevenWs?.close();
      }
    } catch (e) {
      console.error("Twilio message parse error:", e);
    }
  };

  twilioWs.onclose = () => {
    elevenWs?.close();
  };

  return response;
}

// ── TwiML generator ──────────────────────────────────────────────────────────

function handleTwiML(req: Request): Response {
  const url = new URL(req.url);
  const leadId = url.searchParams.get("lead_id") || "";
  const personality = url.searchParams.get("personality") || "sarah";

  // The WebSocket URL is the same endpoint
  const wsUrl = `wss://${url.host}${url.pathname}?lead_id=${leadId}&personality=${personality}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="lead_id" value="${leadId}"/>
      <Parameter name="personality" value="${personality}"/>
    </Stream>
  </Connect>
</Response>`;

  return new Response(twiml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // WebSocket upgrade → audio proxy
  if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
    return await handleMediaStream(req);
  }

  // HTTP POST → TwiML for Twilio
  if (req.method === "POST" || req.method === "GET") {
    return handleTwiML(req);
  }

  return new Response("Method not allowed", { status: 405 });
});
