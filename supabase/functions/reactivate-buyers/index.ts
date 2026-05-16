// Buyer Network Reactivation — 1-click blast
// Sends personalized emails to all active buyers with an email address.
// Called from the /buyers page by authenticated admin/agent.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildEmail(contactName: string, companyName: string | null): string {
  const firstName = contactName.split(/\s+/)[0];
  const company = companyName ? ` at ${companyName}` : "";

  return `Hi ${firstName},

I hope this message finds you well!

My name is Sergio Mantilla — I'm the founder of Klose LLC, a real estate investment company operating in the Birmingham, Alabama market.

I'm reaching out because we currently have an active pipeline of off-market properties${company ? ` and believe some may fit your buying criteria` : ""} — single-family and multi-family homes, many with significant equity, at prices ranging from $40K to $120K.

These deals are not listed on the MLS. We work directly with motivated sellers and pass deals to our trusted buyers before anyone else.

I'd love to reconnect to make sure we have your most current buying criteria on file. Specifically:

- Are you still actively buying in the Birmingham / Jefferson County area?
- What price range and property types are you targeting right now?
- Has your timeline or financing situation changed?

If you're still active, simply reply to this email with your updated criteria and I'll make sure you're on our priority list for every deal that comes in.

If your situation has changed and you're not buying right now, no worries — just let me know and we can stay in touch for when the timing is right.

Looking forward to hearing from you.

Best,
Sergio Mantilla
Founder & Managing Director
Klose LLC
sergio@goklose.com

---
You are receiving this email because you are in our cash buyer network. Reply STOP to be removed.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 503,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all active buyers with an email address
    const { data: buyers, error: buyersErr } = await supabase
      .from("buyers")
      .select("id, contact_name, company_name, email, tier")
      .eq("is_active", true)
      .not("email", "is", null)
      .neq("email", "");

    if (buyersErr) throw buyersErr;
    if (!buyers?.length) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, message: "No active buyers with email found" }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const buyer of buyers) {
      const body = buildEmail(buyer.contact_name, buyer.company_name);
      const toName = buyer.contact_name;
      const toEmail = buyer.email!;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Sergio Mantilla <sergio@goklose.com>",
            to: [`${toName} <${toEmail}>`],
            subject: "Are you still actively buying in Birmingham? — Klose LLC",
            text: body,
            reply_to: "sergio@goklose.com",
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errData = await res.json();
          failed++;
          errors.push(`${toEmail}: ${errData.message ?? res.status}`);
          console.error(`Failed to send to ${toEmail}:`, errData);
        }

        // Small delay to stay within Resend rate limits (2 req/sec free tier)
        await new Promise((r) => setTimeout(r, 550));
      } catch (err) {
        failed++;
        errors.push(`${toEmail}: ${err}`);
        console.error(`Exception sending to ${toEmail}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        total: buyers.length,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("reactivate-buyers error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
