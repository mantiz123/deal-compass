// Agent 2 — TC 1-click send
// Authenticated endpoint: TC calls this after reviewing a draft.
// Sends via Resend, marks draft as sent, updates lead.last_contact_at, logs interaction.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Verify the user is authenticated
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const { draft_id, subject_override, body_override } = await req.json();
    if (!draft_id) throw new Error("draft_id is required");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch draft with lead + property
    const { data: draft, error: draftErr } = await supabase
      .from("lead_email_drafts")
      .select(`
        id, lead_id, to_email, to_name, subject, body, status, draft_type,
        lead:leads(
          id, last_contact_at,
          property:properties(address, city, state, zip_code, owner_name, owner_email)
        )
      `)
      .eq("id", draft_id)
      .single();

    if (draftErr || !draft) throw new Error("Draft not found");
    if (draft.status !== "pending_review") throw new Error(`Draft is already ${draft.status}`);

    const toEmail = draft.to_email ?? draft.lead?.property?.owner_email;
    if (!toEmail) throw new Error("No recipient email on draft or property");

    const finalSubject = subject_override ?? draft.subject;
    const finalBody = body_override ?? draft.body;
    const toName = draft.to_name ?? draft.lead?.property?.owner_name ?? undefined;

    // Send via Resend
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Sergio Mantilla <sergio@goklose.com>",
        to: toName ? [`${toName} <${toEmail}>`] : [toEmail],
        subject: finalSubject,
        text: finalBody,
        reply_to: "sergio@goklose.com",
      }),
    });

    const sendResult = await sendRes.json();

    if (!sendRes.ok) {
      throw new Error(`Resend error: ${JSON.stringify(sendResult)}`);
    }

    const now = new Date().toISOString();

    // Mark draft as sent
    await supabase
      .from("lead_email_drafts")
      .update({ status: "sent", sent_at: now, sent_by: user.id, send_result: sendResult })
      .eq("id", draft_id);

    // Update lead.last_contact_at
    await supabase
      .from("leads")
      .update({ last_contact_at: now })
      .eq("id", draft.lead_id);

    // Log interaction
    await supabase.from("interactions").insert({
      lead_id: draft.lead_id,
      interaction_type: "email",
      direction: "outbound",
      content: `Subject: ${finalSubject}\n\n${finalBody}`,
    });

    return new Response(JSON.stringify({ ok: true, resend_id: sendResult.id }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-draft-email error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
