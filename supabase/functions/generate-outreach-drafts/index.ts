// Agent 2 — Email Outreach Asistido
// Cron-triggered daily at 9 AM UTC.
// Scans for hot leads (piw_score ≥ 70, captacion, no contact in 24h, no pending draft)
// and generates personalized English email drafts via Claude Haiku.
// Saves drafts to lead_email_drafts and optionally emails TC.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DRAFTS_PER_RUN = 20; // cost guard: ~$0.02/run max

interface LeadRow {
  id: string;
  piw_score: number;
  last_contact_at: string | null;
  property: {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    owner_name: string | null;
    owner_email: string | null;
    arv: number | null;
    mao: number | null;
    repair_cost: number | null;
    equity_percent: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    is_foreclosure: boolean;
    tax_delinquent: boolean;
    is_absentee_owner: boolean;
    is_vacant: boolean;
    is_probate: boolean;
  };
}

function inferDraftType(p: LeadRow["property"]): string {
  if (p.is_foreclosure) return "foreclosure";
  if (p.tax_delinquent) return "tax_delinquent";
  if (p.is_absentee_owner) return "absentee_owner";
  if (p.is_vacant) return "vacant";
  return "general";
}

function buildEmailPrompt(lead: LeadRow): { system: string; user: string; subject: string } {
  const p = lead.property;
  const firstName = (p.owner_name || "there").split(/\s+/)[0];
  const address = `${p.address}, ${p.city}, ${p.state} ${p.zip_code}`;
  const draftType = inferDraftType(p);

  const situationLine: Record<string, string> = {
    foreclosure:
      "I noticed there may be a foreclosure notice on your property and wanted to reach out before things get further along.",
    tax_delinquent:
      "I saw that there may be some tax delinquency associated with your property and wanted to see if we could help.",
    absentee_owner:
      "I noticed the property may not be your primary residence and wanted to see if a cash sale might make sense.",
    vacant:
      "I came across your vacant property and wanted to reach out to see if you'd consider a quick cash offer.",
    general:
      "I came across your property and wanted to see if you might be open to a cash offer.",
  };

  const situation = situationLine[draftType] || situationLine.general;

  const subject =
    draftType === "foreclosure"
      ? `Quick cash offer for ${p.address} — before the deadline`
      : draftType === "tax_delinquent"
      ? `Cash offer — resolve the tax situation on ${p.address}`
      : `Cash offer for your property at ${p.address}`;

  const system = `You are writing a short, personal outreach email on behalf of Sergio Mantilla, a real estate investor in Alabama (Klose LLC).
The email should feel human and direct — no fluff, no hype. Maximum 200 words.
Use plain text only — no markdown, no asterisks, no bullet symbols.
End with this exact signature block:
---
Sergio Mantilla
Klose LLC
sergio@goklose.com

Legal: I am not a licensed real estate agent. Klose LLC is a real estate investment company that purchases properties directly or assigns contracts to end buyers.`;

  const user = `Write an outreach email to ${firstName} about their property at ${address}.

Opening hook: ${situation}

Key facts (use only if relevant, don't force them all in):
- ARV (estimated value): ${p.arv ? `$${p.arv.toLocaleString()}` : "not available"}
- Estimated repairs: ${p.repair_cost ? `$${p.repair_cost.toLocaleString()}` : "not available"}
- Bedrooms/Baths: ${p.bedrooms ?? "?"}bd / ${p.bathrooms ?? "?"}ba
- Square feet: ${p.sqft ? p.sqft.toLocaleString() : "?"}
- Situation: ${draftType.replace(/_/g, " ")}

Core offer: we buy as-is for cash, close in 14-21 days, no commissions, no repairs needed.
Ask one simple question at the end — "Would you be open to a quick call this week?"`;

  return { system, user, subject };
}

async function generateDraft(
  anthropicKey: string,
  lead: LeadRow
): Promise<{ subject: string; body: string }> {
  const { system, user, subject } = buildEmailPrompt(lead);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const body = data.content?.[0]?.text ?? "";
  return { subject, body };
}

async function notifyTC(
  resendKey: string,
  tcEmail: string,
  count: number,
  drafts: Array<{ address: string; ownerName: string | null }>
): Promise<void> {
  const listHtml = drafts
    .map((d) => `<li>${d.ownerName ?? "Unknown"} — ${d.address}</li>`)
    .join("");

  const html = `<p>Hello!</p>
<p>KLOSE AI has generated <strong>${count} new email draft${count !== 1 ? "s" : ""}</strong> for your review:</p>
<ul>${listHtml}</ul>
<p>Log in to <a href="https://goklose.com">goklose.com</a> to review and send them with one click.</p>
<p>— KLOSE AI</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "KLOSE AI <noreply@goklose.com>",
      to: [tcEmail],
      subject: `${count} new email draft${count !== 1 ? "s" : ""} ready for review`,
      html,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const tcEmail = Deno.env.get("TC_NOTIFY_EMAIL");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find hot leads: score ≥70, captacion, no recent contact
    const { data: candidates, error: leadsErr } = await supabase
      .from("leads")
      .select(`
        id, piw_score, last_contact_at,
        property:properties(
          address, city, state, zip_code,
          owner_name, owner_email,
          arv, mao, repair_cost, equity_percent,
          bedrooms, bathrooms, sqft,
          is_foreclosure, tax_delinquent, is_absentee_owner, is_vacant, is_probate
        )
      `)
      .eq("status", "captacion")
      .gte("piw_score", 70)
      .or(`last_contact_at.is.null,last_contact_at.lt.${cutoff}`)
      .order("piw_score", { ascending: false })
      .limit(MAX_DRAFTS_PER_RUN * 2); // fetch extra; we'll filter duplicates below

    if (leadsErr) throw leadsErr;
    if (!candidates?.length) {
      return new Response(JSON.stringify({ generated: 0, message: "No qualifying leads" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Exclude leads that already have a pending_review draft
    const leadIds = candidates.map((l: LeadRow) => l.id);
    const { data: existingDrafts } = await supabase
      .from("lead_email_drafts")
      .select("lead_id")
      .in("lead_id", leadIds)
      .eq("status", "pending_review");

    const alreadyDrafted = new Set((existingDrafts ?? []).map((d: { lead_id: string }) => d.lead_id));
    const toProcess = (candidates as LeadRow[])
      .filter((l) => !alreadyDrafted.has(l.id))
      .slice(0, MAX_DRAFTS_PER_RUN);

    if (!toProcess.length) {
      return new Response(JSON.stringify({ generated: 0, message: "All qualifying leads already have drafts" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ address: string; ownerName: string | null }> = [];
    let generated = 0;

    for (const lead of toProcess) {
      try {
        const { subject, body } = await generateDraft(anthropicKey, lead);
        const p = lead.property;

        const { error: insertErr } = await supabase.from("lead_email_drafts").insert({
          lead_id: lead.id,
          to_email: p.owner_email ?? null,
          to_name: p.owner_name ?? null,
          subject,
          body,
          draft_type: inferDraftType(p),
          status: "pending_review",
        });

        if (insertErr) {
          console.error(`Draft insert failed for lead ${lead.id}:`, insertErr.message);
          continue;
        }

        results.push({ address: p.address, ownerName: p.owner_name });
        generated++;
      } catch (err) {
        console.error(`Draft generation failed for lead ${lead.id}:`, err);
      }
    }

    // Notify TC if we generated anything and have both keys
    if (generated > 0 && resendKey && tcEmail) {
      try {
        await notifyTC(resendKey, tcEmail, generated, results);
      } catch (err) {
        console.error("TC notification failed:", err);
      }
    }

    return new Response(
      JSON.stringify({ generated, leads: results }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-outreach-drafts error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
