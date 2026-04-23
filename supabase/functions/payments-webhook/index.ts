import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const txnId = data.id;
  const customerId = data.customerId;
  const linkId = data.customData?.payment_link_id;

  if (!linkId) {
    console.warn('transaction.completed without payment_link_id', { txnId });
    return;
  }

  await getSupabase()
    .from('payment_links')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paddle_transaction_id: txnId,
      paddle_customer_id: customerId,
      environment: env,
    })
    .eq('id', linkId);
}

async function handleTransactionFailed(data: any, env: PaddleEnv) {
  const linkId = data.customData?.payment_link_id;
  if (!linkId) return;
  await getSupabase()
    .from('payment_links')
    .update({ status: 'failed', environment: env })
    .eq('id', linkId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    const event = await verifyWebhook(req, env);

    switch (event.eventType) {
      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event.data, env);
        break;
      case EventName.TransactionPaymentFailed:
        await handleTransactionFailed(event.data, env);
        break;
      default:
        console.log('Unhandled event:', event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
