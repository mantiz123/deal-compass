import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Catálogo cerrado (server-side, no se acepta amount del cliente)
// Usa price IDs reales de Stripe para atribución completa de producto en el dashboard.
const CATALOG: Record<string, {
  name: string;
  amount_cents: number;
  kind: 'track' | 'bundle';
  tracks: string[];
  stripe_price_id: string;
}> = {
  closer: {
    name: 'KLOSE Academy — Closer Track',
    amount_cents: 29700,
    kind: 'track',
    tracks: ['closer'],
    stripe_price_id: 'price_1TQY815Be8qCgMV2rIh6LoO4',
  },
  scaler: {
    name: 'KLOSE Academy — Scaler Track',
    amount_cents: 49700,
    kind: 'track',
    tracks: ['scaler'],
    stripe_price_id: 'price_1TQY905Be8qCgMV2CLGFvYlS',
  },
  creative_finance: {
    name: 'KLOSE Academy — Creative Finance Track',
    amount_cents: 99700,
    kind: 'track',
    tracks: ['creative_finance'],
    stripe_price_id: 'price_1TQY9T5Be8qCgMV2TJRval34',
  },
  bundle_creative: {
    name: 'KLOSE Academy — Bundle Creative (3 tracks)',
    amount_cents: 149700,
    kind: 'bundle',
    tracks: ['closer', 'scaler', 'creative_finance'],
    stripe_price_id: 'price_1TQY9s5Be8qCgMV2eVmkVN4W',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const { product_key, returnUrl } = await req.json();
    const item = CATALOG[product_key as string];
    if (!item) {
      return new Response(JSON.stringify({ error: 'Invalid product_key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Bloquear si ya tiene acceso a TODOS los tracks del item
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: existing } = await supabaseService
      .from('academy_track_purchases')
      .select('track_slug')
      .eq('user_id', user.id)
      .in('track_slug', item.tracks);

    const ownedSlugs = new Set((existing ?? []).map((r) => r.track_slug));
    const allOwned = item.tracks.every((t) => ownedSlugs.has(t));
    if (allOwned) {
      return new Response(JSON.stringify({ error: 'Already owned', already_owned: true }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const baseUrl = returnUrl || 'https://goklose.com';
    const successUrl = `${baseUrl}/academy?purchase=success&product=${product_key}`;
    const cancelUrl = `${baseUrl}/academy?purchase=canceled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: item.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: 'academy',
        product_key,
        product_kind: item.kind,
        tracks: item.tracks.join(','),
        user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          product_type: 'academy',
          product_key,
          product_kind: item.kind,
          tracks: item.tracks.join(','),
          user_id: user.id,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('create-academy-checkout error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
