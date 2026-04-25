// Returns a playable MP3 audio URL (as base64 data URL) for an ElevenLabs
// conversation. Audio is fetched from the ElevenLabs API which requires
// the xi-api-key. We proxy through this edge function so the client never
// sees the API key.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const { conversation_id } = await req.json();
    if (!conversation_id || typeof conversation_id !== "string") {
      return new Response(
        JSON.stringify({ error: "conversation_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ElevenLabs endpoint for conversation audio (MP3)
    const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}/audio`;
    const elRes = await fetch(url, {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });

    if (!elRes.ok) {
      const errText = await elRes.text();
      console.error("ElevenLabs audio fetch failed:", elRes.status, errText);
      // Common: audio not ready yet (it processes a few seconds after the call ends)
      if (elRes.status === 404) {
        return new Response(
          JSON.stringify({ error: "Audio not yet available. Try again in 30s." }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error(`ElevenLabs error [${elRes.status}]: ${errText}`);
    }

    const arrayBuf = await elRes.arrayBuffer();
    // Stream the audio back directly as audio/mpeg so the client can use it
    // in an <audio> tag via a blob URL (we send raw bytes, client wraps them).
    return new Response(arrayBuf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("get-training-audio error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
