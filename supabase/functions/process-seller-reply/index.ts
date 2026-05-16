// Agent 2 — Seller Reply Handler
// Resend inbound email webhook.
// Matches sender email to property.owner_email, translates reply to Spanish via Haiku,
// logs interaction, and alerts Sergio with a Spanish summary.
//
// In Resend dashboard: set inbound route to POST this endpoint.
// Optional: set RESEND_WEBHOOK_SECRET to validate signatures.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  // Resend sends a JSON payload for inbound emails
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  try {
    const payload = await req.json();

    // Resend inbound webhook shape
    const fromEmail: string = payload.from?.email ?? payload.from ?? "";
    const rawBody: string = payload.text ?? payload.html ?? payload.body ?? "";
    const inboundSubject: string = payload.subject ?? "(no subject)";

    if (!fromEmail || !rawBody) {
      return new Response(JSON.stringify({ skipped: "missing from or body" }), { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Match sender email to a property
    const { data: properties } = await supabase
      .from("properties")
      .select("id, address, city, owner_name, owner_email")
      .ilike("owner_email", fromEmail)
      .limit(1);

    if (!properties?.length) {
      console.log(`No property matched for sender: ${fromEmail}`);
      return new Response(JSON.stringify({ skipped: "no matching property" }), { status: 200 });
    }

    const property = properties[0];

    // Find the most recent lead for this property
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("property_id", property.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const leadId = leads?.[0]?.id ?? null;

    // Translate reply + generate next-action summary via Haiku
    let spanishSummary = rawBody;
    let nextAction = "Review and respond to the seller.";

    if (anthropicKey) {
      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            system:
              "You analyze seller email replies for a real estate wholesaler in Alabama. " +
              "Respond in Spanish. Be concise.",
            messages: [
              {
                role: "user",
                content: `Seller replied to our outreach about ${property.address}, ${property.city}.\n\nEmail:\n${rawBody}\n\nProvide:\n1. Spanish translation of the email (2-3 sentences summary, not word-for-word)\n2. Sentiment: interested / neutral / not_interested / angry\n3. Suggested next action for Sergio (in Spanish, 1 sentence)\n\nFormat:\nTRADUCCIÓN: ...\nSENTIMIENTO: ...\nACCIÓN: ...`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content?.[0]?.text ?? "";
          spanishSummary = text;
          const actionMatch = text.match(/ACCIÓN:\s*(.+)/);
          if (actionMatch) nextAction = actionMatch[1].trim();
        }
      } catch (err) {
        console.error("Haiku translation failed:", err);
      }
    }

    // Log interaction
    if (leadId) {
      await supabase.from("interactions").insert({
        lead_id: leadId,
        interaction_type: "email",
        direction: "inbound",
        content: rawBody,
        sentiment: "neutral",
      });

      // Update lead.last_contact_at
      await supabase
        .from("leads")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", leadId);
    }

    // Alert Sergio
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "KLOSE AI <noreply@goklose.com>",
            to: ["sergio@goklose.com"],
            subject: `Seller responded — ${property.address}`,
            text: [
              `📬 RESPUESTA DE SELLER`,
              ``,
              `Propiedad: ${property.address}, ${property.city}`,
              `Seller: ${property.owner_name ?? fromEmail}`,
              `Asunto original: ${inboundSubject}`,
              ``,
              `RESUMEN (IA):`,
              spanishSummary,
              ``,
              `PRÓXIMA ACCIÓN: ${nextAction}`,
              ``,
              `---`,
              `Email original:`,
              rawBody,
            ].join("\n"),
          }),
        });
      } catch (err) {
        console.error("Sergio alert email failed:", err);
      }
    }

    return new Response(JSON.stringify({ ok: true, property: property.address }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-seller-reply error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
