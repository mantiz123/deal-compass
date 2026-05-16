// Twilio Webhook Handler
// Handles two event types from Twilio:
//   1. Status callbacks  — updates sms_outreach_log when Twilio confirms delivery/failure
//   2. Inbound messages  — sets DNC flags when a seller replies STOP/UNSUBSCRIBE/etc.
//
// Configure in Twilio console:
//   - Messaging → Phone Numbers → your number → "A message comes in" → this URL
//   - Messaging → Phone Numbers → your number → Status Callback → this URL
//
// Security: Twilio signs every request with X-Twilio-Signature (HMAC-SHA1).
// Set TWILIO_WEBHOOK_URL in Supabase secrets to the public URL of this function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_WEBHOOK_URL = Deno.env.get('TWILIO_WEBHOOK_URL') ?? ''

// Keywords that trigger DNC — Twilio auto-handles STOP at carrier level,
// but we mirror it in our DB to block future API sends too.
const STOP_KEYWORDS = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'])
const START_KEYWORDS = new Set(['start', 'unstop', 'yes'])

// Validate that the request actually came from Twilio
async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort()
  let str = url
  for (const key of sortedKeys) str += key + (params[key] ?? '')

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign'],
  )
  const raw = await crypto.subtle.sign('HMAC', key, enc.encode(str))
  const computed = btoa(String.fromCharCode(...new Uint8Array(raw)))
  return computed === signature
}

Deno.serve(async (req) => {
  // Twilio only POSTs form-encoded data
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const rawBody = await req.text()
    const params = Object.fromEntries(new URLSearchParams(rawBody))

    // ── SIGNATURE VALIDATION ──────────────────────────────────────────────────
    if (TWILIO_AUTH_TOKEN && TWILIO_WEBHOOK_URL) {
      const signature = req.headers.get('x-twilio-signature') ?? ''
      const valid = await validateTwilioSignature(
        TWILIO_AUTH_TOKEN, signature, TWILIO_WEBHOOK_URL, params,
      )
      if (!valid) {
        console.warn('Invalid Twilio signature — request rejected')
        return new Response('Forbidden', { status: 403 })
      }
    }

    const messageSid = params['MessageSid'] ?? params['SmsSid'] ?? null
    const messageStatus = params['MessageStatus'] ?? params['SmsStatus'] ?? null
    const fromPhone = params['From'] ?? null
    const body = (params['Body'] ?? '').trim().toLowerCase()

    // ── CASE 1: STATUS CALLBACK (delivery update) ─────────────────────────────
    // Twilio posts MessageStatus = queued|sent|delivered|undelivered|failed
    if (messageSid && messageStatus && !fromPhone) {
      const validStatuses = ['queued', 'sent', 'delivered', 'undelivered', 'failed']
      if (validStatuses.includes(messageStatus)) {
        await supabase
          .from('sms_outreach_log')
          .update({ status: messageStatus })
          .eq('twilio_sid', messageSid)

        // Mirror to campaign_message_logs if linked
        const { data: log } = await supabase
          .from('sms_outreach_log')
          .select('enrollment_id, sequence_id')
          .eq('twilio_sid', messageSid)
          .single()

        if (log?.enrollment_id && log?.sequence_id) {
          const campaignStatus = messageStatus === 'delivered' ? 'delivered'
            : (messageStatus === 'failed' || messageStatus === 'undelivered') ? 'failed'
            : 'sent'

          await supabase
            .from('campaign_message_logs')
            .update({
              status: campaignStatus,
              ...(campaignStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
            })
            .eq('enrollment_id', log.enrollment_id)
            .eq('sequence_id', log.sequence_id)
        }
      }

      return new Response('', { status: 204 })
    }

    // ── CASE 2: INBOUND MESSAGE (seller reply) ────────────────────────────────
    if (fromPhone && body) {
      // Log the inbound message to sms_outreach_log for the record
      // (no sent_by because it's inbound — use service role insert)
      await supabase.from('sms_outreach_log').insert({
        to_phone: fromPhone,   // "to" here is our number but we store the sender
        message: params['Body'] ?? '',
        status: 'delivered',
        direction: 'inbound',
        twilio_sid: messageSid,
      }).catch(e => console.warn('inbound sms log failed', e))

      // Find which lead/property this phone belongs to
      const normalized = fromPhone.replace(/\D/g, '')
      const last10 = normalized.slice(-10)

      // Search all 5 phone slots for a match
      const phoneConditions = [1, 2, 3, 4, 5]
        .map(n => `phone_${n}.like.%${last10}`)
        .join(',')

      const { data: properties } = await supabase
        .from('properties')
        .select('id, phone_1, phone_2, phone_3, phone_4, phone_5')
        .or(phoneConditions)

      if (!properties?.length) {
        // Unknown sender — still return 200 so Twilio stops retrying
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
          { headers: { 'Content-Type': 'text/xml' } },
        )
      }

      // ── STOP: set DNC flag on matched phone slot ──────────────────────────
      if (STOP_KEYWORDS.has(body)) {
        for (const prop of properties) {
          const slots: Record<string, string | null> = {
            phone_1: prop.phone_1, phone_2: prop.phone_2, phone_3: prop.phone_3,
            phone_4: prop.phone_4, phone_5: prop.phone_5,
          }
          const updates: Record<string, boolean> = {}
          for (const [slot, num] of Object.entries(slots)) {
            if (num && num.replace(/\D/g, '').slice(-10) === last10) {
              updates[`${slot}_dnc`] = true
            }
          }
          if (Object.keys(updates).length) {
            await supabase.from('properties').update(updates).eq('id', prop.id)
          }
        }

        // Pause all active campaign enrollments for leads on these properties
        const propertyIds = properties.map(p => p.id)
        const { data: leads } = await supabase
          .from('leads')
          .select('id')
          .in('property_id', propertyIds)

        if (leads?.length) {
          const leadIds = leads.map(l => l.id)
          await supabase
            .from('campaign_enrollments')
            .update({ status: 'unsubscribed' })
            .in('lead_id', leadIds)
            .eq('status', 'active')
        }

        // Log STOP interaction on each matched lead
        if (leads?.length) {
          await supabase.from('interactions').insert(
            leads.map(l => ({
              lead_id: l.id,
              interaction_type: 'sms',
              direction: 'inbound',
              sentiment: 'negative',
              content: `[STOP RECEIVED] From: ${fromPhone} — DNC flag set, campaigns paused.\nOriginal message: "${params['Body']}"`,
            }))
          ).catch(e => console.warn('stop interaction log failed', e))
        }
      }

      // ── START: clear DNC flag if seller opts back in ──────────────────────
      if (START_KEYWORDS.has(body)) {
        for (const prop of properties) {
          const slots: Record<string, string | null> = {
            phone_1: prop.phone_1, phone_2: prop.phone_2, phone_3: prop.phone_3,
            phone_4: prop.phone_4, phone_5: prop.phone_5,
          }
          const updates: Record<string, boolean> = {}
          for (const [slot, num] of Object.entries(slots)) {
            if (num && num.replace(/\D/g, '').slice(-10) === last10) {
              updates[`${slot}_dnc`] = false
            }
          }
          if (Object.keys(updates).length) {
            await supabase.from('properties').update(updates).eq('id', prop.id)
          }
        }
      }

      // Log inbound reply as interaction on matched leads
      const propertyIds = properties.map(p => p.id)
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .in('property_id', propertyIds)

      if (leads?.length && !STOP_KEYWORDS.has(body)) {
        await supabase.from('interactions').insert(
          leads.map(l => ({
            lead_id: l.id,
            interaction_type: 'sms',
            direction: 'inbound',
            sentiment: 'neutral',
            content: `[SMS RECEIVED] From: ${fromPhone}\n\n${params['Body']}`,
          }))
        ).catch(e => console.warn('inbound interaction log failed', e))
      }

      // Return empty TwiML — no auto-reply (agent handles conversation manually)
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: { 'Content-Type': 'text/xml' } },
      )
    }

    return new Response('', { status: 204 })

  } catch (error: any) {
    console.error('twilio-webhook error', error)
    // Always return 200-range to prevent Twilio from retrying indefinitely
    return new Response('', { status: 204 })
  }
})
