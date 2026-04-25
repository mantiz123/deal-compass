import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@18';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const { token, returnUrl } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: link, error: linkErr } = await supabase
      .from('payment_links')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: 'Payment link not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Already paid', status: 'paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const isTest = stripeKey.startsWith('sk_test_');

    const baseUrl = returnUrl || 'https://goklose.com';
    const successUrl = `${baseUrl}/pay/${token}?success=true`;
    const cancelUrl = `${baseUrl}/pay/${token}?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (link.currency || 'USD').toLowerCase(),
            product_data: {
              name: link.title,
              description: link.description || undefined,
            },
            unit_amount: link.amount_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: link.customer_email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        payment_link_id: link.id,
        payment_link_token: link.token,
      },
      payment_intent_data: {
        metadata: {
          payment_link_id: link.id,
          payment_link_token: link.token,
        },
      },
    });

    await supabase
      .from('payment_links')
      .update({
        stripe_session_id: session.id,
        environment: isTest ? 'sandbox' : 'live',
      })
      .eq('id', link.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        environment: isTest ? 'sandbox' : 'live',
        link: {
          title: link.title,
          description: link.description,
          amount_cents: link.amount_cents,
          currency: link.currency,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('create-stripe-checkout error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
