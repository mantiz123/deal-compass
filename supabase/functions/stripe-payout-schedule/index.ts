import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_API = "https://api.stripe.com/v1";

const VALID_INTERVALS = ["daily", "weekly", "monthly", "manual"] as const;
const VALID_WEEKLY = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

type Interval = (typeof VALID_INTERVALS)[number];
type WeeklyAnchor = (typeof VALID_WEEKLY)[number];

interface UpdatePayload {
  action: "get" | "update";
  interval?: Interval;
  weekly_anchor?: WeeklyAnchor;
  monthly_anchor?: number; // 1-31
  delay_days?: number | "minimum";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as UpdatePayload;

    // Get current account info
    const accountRes = await fetch(`${STRIPE_API}/account`, {
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });
    const account = await accountRes.json();

    if (!accountRes.ok) {
      return new Response(
        JSON.stringify({ error: "Stripe account fetch failed", details: account }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "get") {
      return new Response(
        JSON.stringify({
          schedule: account.settings?.payouts?.schedule ?? null,
          payouts_enabled: account.payouts_enabled,
          country: account.country,
          default_currency: account.default_currency,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "update") {
      const interval = body.interval;
      if (!interval || !VALID_INTERVALS.includes(interval)) {
        return new Response(
          JSON.stringify({ error: "Invalid interval" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const params = new URLSearchParams();
      params.append("settings[payouts][schedule][interval]", interval);

      if (interval === "weekly") {
        const anchor = body.weekly_anchor ?? "friday";
        if (!VALID_WEEKLY.includes(anchor)) {
          return new Response(
            JSON.stringify({ error: "Invalid weekly_anchor" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        params.append(
          "settings[payouts][schedule][weekly_anchor]",
          anchor,
        );
      }

      if (interval === "monthly") {
        const day = body.monthly_anchor ?? 1;
        if (day < 1 || day > 31) {
          return new Response(
            JSON.stringify({ error: "monthly_anchor must be 1-31" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        params.append(
          "settings[payouts][schedule][monthly_anchor]",
          String(day),
        );
      }

      const updateRes = await fetch(`${STRIPE_API}/account`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const updated = await updateRes.json();

      if (!updateRes.ok) {
        console.error("Stripe update failed:", updated);
        return new Response(
          JSON.stringify({
            error: "Stripe update failed",
            details: updated.error?.message ?? updated,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          schedule: updated.settings?.payouts?.schedule ?? null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
