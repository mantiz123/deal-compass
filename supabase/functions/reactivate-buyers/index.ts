// Buyer Network Reactivation
// Supports bulk (all active buyers) or single buyer (buyer_id in body).
// Professional template — established firm tone, personalized with saved criteria.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuyerRow {
  id: string;
  contact_name: string;
  company_name: string | null;
  email: string;
  preferred_zip_codes: string[] | null;
  preferred_property_types: string[] | null;
  min_arv: number | null;
  max_arv: number | null;
  max_repair_level: string | null;
  avg_close_time_days: number | null;
  notes: string | null;
  tier: string;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: "Single-Family Residential",
  multi_family: "Multi-Family",
  condo: "Condominium",
  townhouse: "Townhouse",
  land: "Land",
  commercial: "Commercial",
};

function fmt$(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function buildCriteriaBlock(buyer: BuyerRow): string {
  const lines: string[] = [];

  if (buyer.preferred_zip_codes?.length) {
    lines.push(`- Target zip codes on file: ${buyer.preferred_zip_codes.join(", ")}`);
  } else {
    lines.push("- Target markets and preferred zip codes");
  }

  if (buyer.min_arv || buyer.max_arv) {
    const min = buyer.min_arv ? fmt$(buyer.min_arv) : "open";
    const max = buyer.max_arv ? fmt$(buyer.max_arv) : "open";
    lines.push(`- ARV range on file: ${min} – ${max}`);
  } else {
    lines.push("- Price range and ARV thresholds");
  }

  if (buyer.preferred_property_types?.length) {
    const types = buyer.preferred_property_types
      .map((t) => PROPERTY_TYPE_LABELS[t] ?? t)
      .join(", ");
    lines.push(`- Property types on file: ${types}`);
  } else {
    lines.push("- Investment strategy (fix & flip, buy & hold, or both)");
  }

  if (buyer.avg_close_time_days) {
    lines.push(`- Preferred closing timeline on file: ${buyer.avg_close_time_days} days`);
  } else {
    lines.push("- Preferred closing timeline");
  }

  if (buyer.max_repair_level) {
    lines.push(`- Max repair level on file: ${buyer.max_repair_level}`);
  }

  lines.push("- Any updated criteria since we last connected");

  return lines.join("\n");
}

function buildEmail(buyer: BuyerRow): { subject: string; text: string } {
  const firstName = buyer.contact_name.split(/\s+/)[0];
  const companyRef = buyer.company_name
    ? `ensure ${buyer.company_name} has first access`
    : `ensure you have first access`;

  const criteriaBlock = buildCriteriaBlock(buyer);

  const subject =
    "Exclusive Off-Market Opportunities — Birmingham, AL | Klose LLC";

  const text = `Dear ${firstName},

I hope this message finds you well.

At Klose LLC, we have been quietly building one of the most comprehensive off-market property pipelines in the Birmingham, Alabama market. Our proprietary acquisition system identifies distressed assets, pre-foreclosures, and high-equity properties before they ever reach the open market.

We are currently preparing to release a curated selection of investment-grade properties that align with our buyers' specific criteria — and I want to ${companyRef}.

Before we proceed, I would like to confirm your current acquisition parameters:

${criteriaBlock}

Simply reply to this email with your current parameters and you will be among the first to receive our upcoming deal flow.

We move quickly — our properties typically go under contract within 48–72 hours of being released to our buyers network.

We look forward to bringing you exceptional opportunities.

Best regards,

Sergio Mantilla
Managing Director
Klose LLC — Off-Market Real Estate Acquisitions
Email: sergio@goklose.com
Web: goklose.com

---
You are receiving this email because you are part of the Klose LLC cash buyer network. Reply STOP to be removed.`;

  return { subject, text };
}

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
    const body = await req.json().catch(() => ({}));
    const buyerId: string | undefined = body?.buyer_id;

    const supabase = createClient(supabaseUrl, serviceKey);

    const BUYER_FIELDS =
      "id, contact_name, company_name, email, preferred_zip_codes, preferred_property_types, min_arv, max_arv, max_repair_level, avg_close_time_days, notes, tier";

    let query = supabase
      .from("buyers")
      .select(BUYER_FIELDS)
      .eq("is_active", true)
      .not("email", "is", null)
      .neq("email", "");

    if (buyerId) {
      query = query.eq("id", buyerId);
    }

    const { data: buyers, error: buyersErr } = await query;
    if (buyersErr) throw buyersErr;

    if (!buyers?.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No active buyers with email found" }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const buyer of buyers as BuyerRow[]) {
      const { subject, text } = buildEmail(buyer);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Sergio Mantilla <sergio@goklose.com>",
            to: [buyer.company_name
              ? `${buyer.contact_name} <${buyer.email}>`
              : `${buyer.contact_name} <${buyer.email}>`],
            subject,
            text,
            reply_to: "sergio@goklose.com",
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errData = await res.json();
          failed++;
          errors.push(`${buyer.email}: ${errData.message ?? res.status}`);
          console.error(`Failed for ${buyer.email}:`, errData);
        }

        // Respect Resend free-tier rate limit (2 req/sec)
        if (buyers.length > 1) {
          await new Promise((r) => setTimeout(r, 550));
        }
      } catch (err) {
        failed++;
        errors.push(`${buyer.email}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: buyers.length, errors: errors.length ? errors : undefined }),
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
