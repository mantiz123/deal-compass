import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return new Response('Server not configured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
  const isTest = stripeKey.startsWith('sk_test_');
  const env = isTest ? 'sandbox' : 'live';

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log(`[stripe-webhook] event=${event.type} id=${event.id} env=${env}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};

        // ===== Academy purchases (tracks o bundle) =====
        if (meta.product_type === 'academy') {
          const userId = meta.user_id;
          const productKey = meta.product_key;
          const productKind = meta.product_kind;
          const tracks = (meta.tracks ?? '').split(',').map((s) => s.trim()).filter(Boolean);
          if (!userId || tracks.length === 0) {
            console.warn('academy checkout missing user_id or tracks', session.id);
            break;
          }

          const piId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          const totalAmount = session.amount_total ?? 0;
          const perTrackAmount = productKind === 'bundle'
            ? Math.round(totalAmount / tracks.length)
            : totalAmount;

          const bundlePurchaseId = productKind === 'bundle' ? crypto.randomUUID() : null;

          const rows = tracks.map((slug) => ({
            user_id: userId,
            track_slug: slug,
            source: productKind === 'bundle' ? 'bundle' : 'individual',
            amount_cents: perTrackAmount,
            currency: (session.currency ?? 'usd').toUpperCase(),
            stripe_session_id: session.id,
            stripe_payment_intent_id: piId,
            bundle_purchase_id: bundlePurchaseId,
          }));

          const { error: insErr } = await getSupabase()
            .from('academy_track_purchases')
            .upsert(rows, { onConflict: 'user_id,track_slug', ignoreDuplicates: true });
          if (insErr) console.error('academy purchase insert error:', insErr);
          else console.log(`[stripe-webhook] academy ${productKey} -> user ${userId} (${tracks.length} tracks)`);
          break;
        }

        // ===== Payment links genéricos =====
        const linkId = meta.payment_link_id;
        if (!linkId) {
          console.warn('checkout.session.completed without payment_link_id or academy metadata', session.id);
          break;
        }
        const { error } = await getSupabase()
          .from('payment_links')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
            environment: env,
          })
          .eq('id', linkId);
        if (error) console.error('Failed to mark paid:', error);
        else console.log(`[stripe-webhook] payment_link ${linkId} -> paid`);
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const linkId = session.metadata?.payment_link_id;
        if (!linkId) break;
        // Idempotency: don't downgrade an already-paid link
        const { data: existing } = await getSupabase()
          .from('payment_links')
          .select('status')
          .eq('id', linkId)
          .maybeSingle();
        if (existing?.status === 'paid') {
          console.log(`[stripe-webhook] ignore ${event.type} for already-paid link ${linkId}`);
          break;
        }
        const newStatus = event.type === 'checkout.session.expired' ? 'expired' : 'failed';
        const { error } = await getSupabase()
          .from('payment_links')
          .update({ status: newStatus, environment: env })
          .eq('id', linkId);
        if (error) console.error(`Failed to mark ${newStatus}:`, error);
        else console.log(`[stripe-webhook] payment_link ${linkId} -> ${newStatus}`);
        break;
      }
      default:
        console.log('[stripe-webhook] unhandled event:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[stripe-webhook] handler error:', e);
    return new Response('Webhook handler error', { status: 500 });
  }
});
