// initiate-outbound-call — Places a real outbound phone call to a seller via Twilio.
// Audio is handled by twilio-media-stream (ElevenLabs AI agent in real time).
//
// Required Supabase secrets (set when Twilio is active):
//   TWILIO_ACCOUNT_SID     — from twilio.com/console
//   TWILIO_AUTH_TOKEN      — from twilio.com/console
//   TWILIO_PHONE_NUMBER    — your A2P 10DLC approved number (+1XXXXXXXXXX)
//   SUPABASE_URL           — already set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — already set by Supabase
//
// Usage:
//   POST /functions/v1/initiate-outbound-call
//   Body: { lead_id: string, personality?: "sarah"|"mike"|"discovery", phone_override?: string }
//
// Returns: { call_sid, status, to, lead_summary }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({
          error: "Twilio not configured",
          hint: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Supabase secrets",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const leadId = body.lead_id as string;
    const personality = (body.personality || "sarah") as string;
    const phoneOverride = body.phone_override as string | undefined;

    if (!leadId) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch lead + property ───────────────────────────────
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
    if (!property) {
      return new Response(JSON.stringify({ error: "Property missing" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve phone number to call ────────────────────────
    const sellerPhone =
      phoneOverride ||
      property.owner_phone ||
      (property as any).phone_2 ||
      null;

    if (!sellerPhone) {
      return new Response(
        JSON.stringify({
          error: "No phone number available for this lead",
          hint: "Add a phone via skip-trace or pass phone_override",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check DNC before calling
    if ((property as any).do_not_mail) {
      return new Response(
        JSON.stringify({ error: "Lead is marked DNC — call blocked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build TwiML stream URL ──────────────────────────────
    // twilio-media-stream handles both TwiML (HTTP POST) and audio stream (WebSocket)
    const mediaStreamUrl = `${SUPABASE_URL}/functions/v1/twilio-media-stream?lead_id=${leadId}&personality=${personality}`;

    // ── Place the call via Twilio REST API ──────────────────
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const callParams = new URLSearchParams({
      To: sellerPhone,
      From: TWILIO_PHONE_NUMBER,
      Url: mediaStreamUrl,
      Method: "POST",
      StatusCallback: `${SUPABASE_URL}/functions/v1/twilio-webhook`,
      StatusCallbackMethod: "POST",
      Record: "false",
      MachineDetection: "Enable",
      AsyncAmd: "true",
      AsyncAmdStatusCallback: `${SUPABASE_URL}/functions/v1/twilio-webhook`,
    });

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: callParams.toString(),
      }
    );

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error("Twilio call error:", twilioRes.status, errText);
      throw new Error(`Twilio failed [${twilioRes.status}]: ${errText}`);
    }

    const twilioCall = await twilioRes.json();

    // ── Log the call initiation in interactions ─────────────
    await adminClient.from("interactions").insert({
      lead_id: leadId,
      interaction_type: "ai_call",
      direction: "outbound",
      content: `📞 LLAMADA OUTBOUND INICIADA\nPersonalidad: ${personality}\nTeléfono: ${sellerPhone}\nTwilio SID: ${twilioCall.sid}\nEstado: ${twilioCall.status}`,
      sentiment: "neutral",
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({
        call_sid: twilioCall.sid,
        status: twilioCall.status,
        to: twilioCall.to,
        from: twilioCall.from,
        lead_summary: {
          owner: property.owner_name,
          address: property.address,
          phone: sellerPhone,
        },
        message: "Llamada iniciada. El agente llamará al seller en segundos.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("initiate-outbound-call error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
