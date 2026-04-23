import { createClient } from 'npm:@supabase/supabase-js@2';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, environment } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

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

    // Create an ad-hoc transaction with a non-catalog price (custom amount)
    const body = {
      items: [
        {
          quantity: 1,
          price: {
            description: link.title,
            name: link.title,
            tax_mode: 'account_setting',
            unit_price: {
              amount: String(link.amount_cents),
              currency_code: link.currency || 'USD',
            },
            quantity: { minimum: 1, maximum: 1 },
            product: {
              name: link.title,
              description: link.description || link.title,
              tax_category: 'standard',
            },
          },
        },
      ],
      collection_mode: 'automatic',
      custom_data: {
        payment_link_id: link.id,
        payment_link_token: link.token,
      },
      ...(link.customer_email
        ? { customer: { email: link.customer_email } }
        : {}),
    };

    const resp = await gatewayFetch(env, '/transactions', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('Paddle transaction error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Paddle error', details: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const txnId = data.data?.id;
    if (txnId) {
      await supabase
        .from('payment_links')
        .update({ paddle_transaction_id: txnId, environment: env })
        .eq('id', link.id);
    }

    return new Response(
      JSON.stringify({
        transactionId: txnId,
        environment: env,
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
    console.error('create-payment-transaction error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
