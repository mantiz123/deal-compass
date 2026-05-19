// SMS Sequence Scheduler
// Processes pending campaign SMS steps for active enrollments whose next_send_at has passed.
// Called manually from the UI or via a pg_cron daily job.
//
// Scope: SMS channel only. Email steps are skipped automatically.
// Batch limit: 50 enrollments per run to avoid Twilio rate limits.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

const BATCH_LIMIT = 50
const STOP_DISCLOSURE = '\n\nReply STOP to opt out.'

function normalizePhone(phone: string): string | null {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}

// TCPA: SMS allowed 8am-9pm recipient local time (Alabama = US Central Time)
function isCentralTimeBusinessHours(): boolean {
  const now = new Date()
  const y = now.getUTCFullYear()
  const dstStart = new Date(Date.UTC(y, 2, 8, 7))
  dstStart.setUTCDate(8 + (7 - dstStart.getUTCDay()) % 7)
  const dstEnd = new Date(Date.UTC(y, 10, 1, 6))
  dstEnd.setUTCDate(1 + (7 - dstEnd.getUTCDay()) % 7)
  const isDST = now >= dstStart && now < dstEnd
  const ctHour = (now.getUTCHours() - (isDST ? 5 : 6) + 24) % 24
  const ctMinute = now.getUTCMinutes()
  return (ctHour + ctMinute / 60) >= 8 && (ctHour + ctMinute / 60) < 21
}

// Personalize all supported template variables in a message body
function personalizeMessage(template: string, property: any): string {
  const firstName = property?.owner_name?.split(/\s+/)[0] ?? 'there'
  const address = property?.address ?? 'your property'
  const city = property?.city ?? 'the area'
  const mao = property?.mao
    ? `$${Number(property.mao).toLocaleString()}`
    : 'a fair cash offer'
  const arv = property?.arv
    ? `$${Number(property.arv).toLocaleString()}`
    : ''

  return template
    .replace(/\{\{nombre\}\}/gi, firstName)
    .replace(/\{\{name\}\}/gi, firstName)
    .replace(/\{\{owner_name\}\}/gi, firstName)
    .replace(/\{\{address\}\}/gi, address)
    .replace(/\{\{city\}\}/gi, city)
    .replace(/\{\{mao\}\}/gi, mao)
    .replace(/\{\{arv\}\}/gi, arv)
}

async function sendTwilioSMS(to: string, body: string): Promise<{ sid: string; status: string } | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return null

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_PHONE_NUMBER, To: to, Body: body }).toString(),
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('Twilio send failed:', data)
    return null
  }
  return { sid: data?.sid, status: data?.status ?? 'queued' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let callerUserId: string | null = null
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser()
    callerUserId = user?.id ?? null
  }

  const stats = { processed: 0, sent: 0, skipped_hours: 0, skipped_dnc: 0, skipped_no_phone: 0, failed: 0, completed: 0 }

  try {
    // ── TCPA TIME WINDOW ──────────────────────────────────────────────────────
    if (!isCentralTimeBusinessHours()) {
      return new Response(JSON.stringify({
        ...stats,
        message: 'Outside allowed hours (8am-9pm CT). No SMS sent.',
        next_window: '8:00 AM CT',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const now = new Date().toISOString()

    // Fetch pending enrollments: active + next_send_at has passed
    const { data: enrollments, error: enrollError } = await supabase
      .from('campaign_enrollments')
      .select(`
        id, campaign_id, lead_id, current_sequence, next_send_at,
        lead:leads(id, assigned_agent_id, property:properties(
          id, address, city, state, mao, arv,
          phone_1, phone_2, phone_3, phone_4, phone_5,
          phone_1_dnc, phone_2_dnc, phone_3_dnc, phone_4_dnc, phone_5_dnc,
          do_not_mail, owner_name
        ))
      `)
      .eq('status', 'active')
      .lte('next_send_at', now)
      .not('next_send_at', 'is', null)
      .limit(BATCH_LIMIT)

    if (enrollError) throw enrollError
    if (!enrollments?.length) {
      return new Response(JSON.stringify({ ...stats, message: 'No pending SMS in queue' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const enrollment of enrollments) {
      stats.processed++
      const lead = enrollment.lead as any
      const property = lead?.property

      // Fetch all sequence steps for this campaign
      const { data: sequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', enrollment.campaign_id)
        .order('sequence_order', { ascending: true })

      // Find next SMS step — skip any consecutive email steps
      let stepOrder = (enrollment.current_sequence ?? 0) + 1
      let step = sequences?.find((s: any) => s.sequence_order === stepOrder)

      while (step && step.channel === 'email') {
        stepOrder++
        step = sequences?.find((s: any) => s.sequence_order === stepOrder)
      }

      // No more steps (or only email steps remain) → mark completed
      if (!step) {
        await supabase
          .from('campaign_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id)
        stats.completed++
        continue
      }

      // ── DNC check ──────────────────────────────────────────────────────────
      if (property?.do_not_mail) {
        await supabase
          .from('campaign_enrollments')
          .update({ status: 'unsubscribed' })
          .eq('id', enrollment.id)
        stats.skipped_dnc++
        continue
      }

      // Find first non-DNC phone slot
      const phoneSlots = [
        { num: property?.phone_1, dnc: property?.phone_1_dnc },
        { num: property?.phone_2, dnc: property?.phone_2_dnc },
        { num: property?.phone_3, dnc: property?.phone_3_dnc },
        { num: property?.phone_4, dnc: property?.phone_4_dnc },
        { num: property?.phone_5, dnc: property?.phone_5_dnc },
      ]
      const cleanSlot = phoneSlots.find(s => s.num && !s.dnc)
      const toPhone = cleanSlot?.num ? normalizePhone(cleanSlot.num) : null

      if (!toPhone) {
        stats.skipped_no_phone++
        await supabase.from('campaign_message_logs').insert({
          enrollment_id: enrollment.id,
          sequence_id: step.id,
          channel: 'sms',
          status: 'failed',
          sent_at: now,
          error_message: 'No valid phone number (all slots empty or DNC)',
        }).catch(() => {})
        // Advance past this step so we don't retry forever
        const nextStep = sequences?.find((s: any) => s.sequence_order === stepOrder + 1)
        const nextSendAt = nextStep
          ? new Date(Date.now() + (nextStep.delay_days * 86400 + nextStep.delay_hours * 3600) * 1000).toISOString()
          : null
        await supabase.from('campaign_enrollments').update({
          current_sequence: stepOrder,
          last_sent_at: now,
          next_send_at: nextSendAt,
          ...(nextSendAt === null ? { status: 'completed', completed_at: now } : {}),
        }).eq('id', enrollment.id)
        continue
      }

      // ── Personalize message ────────────────────────────────────────────────
      let message = personalizeMessage(step.content, property)

      // ── STOP disclosure on first ever outbound SMS to this number ──────────
      const { count: priorSent } = await supabase
        .from('sms_outreach_log')
        .select('id', { count: 'exact', head: true })
        .eq('to_phone', toPhone)
        .eq('direction', 'outbound')

      if ((priorSent ?? 0) === 0 && !message.toLowerCase().includes('stop')) {
        message = `${message}${STOP_DISCLOSURE}`
      }

      // ── Send via Twilio ────────────────────────────────────────────────────
      const twilioResult = await sendTwilioSMS(toPhone, message)
      const sentBy = callerUserId ?? lead?.assigned_agent_id ?? null

      if (twilioResult) {
        await supabase.from('sms_outreach_log').insert({
          lead_id: enrollment.lead_id,
          sent_by: sentBy,
          to_phone: toPhone,
          message,
          status: twilioResult.status,
          direction: 'outbound',
          twilio_sid: twilioResult.sid,
          enrollment_id: enrollment.id,
          sequence_id: step.id,
          dnc_checked_at: now,
        }).catch(() => {})

        await supabase.from('campaign_message_logs').insert({
          enrollment_id: enrollment.id,
          sequence_id: step.id,
          channel: 'sms',
          status: 'sent',
          sent_at: now,
        }).catch(() => {})

        if (enrollment.lead_id) {
          await supabase.from('interactions').insert({
            lead_id: enrollment.lead_id,
            interaction_type: 'sms',
            direction: 'outbound',
            sentiment: 'positive',
            content: `[CAMPAIGN SMS] Paso ${stepOrder} → ${toPhone}\nSID: ${twilioResult.sid}\n\n${message}`,
            created_by: sentBy,
          }).catch(() => {})
        }

        stats.sent++
      } else {
        await supabase.from('campaign_message_logs').insert({
          enrollment_id: enrollment.id,
          sequence_id: step.id,
          channel: 'sms',
          status: 'failed',
          sent_at: now,
          error_message: 'Twilio API error or credentials not configured',
        }).catch(() => {})
        stats.failed++
      }

      // ── Advance enrollment to next step ───────────────────────────────────
      const nextStep = sequences?.find((s: any) => s.sequence_order === stepOrder + 1)
      const nextSendAt = nextStep
        ? new Date(Date.now() + (nextStep.delay_days * 86400 + nextStep.delay_hours * 3600) * 1000).toISOString()
        : null

      await supabase.from('campaign_enrollments').update({
        current_sequence: stepOrder,
        last_sent_at: now,
        next_send_at: nextSendAt,
        ...(nextSendAt === null ? { status: 'completed', completed_at: now } : {}),
      }).eq('id', enrollment.id)
    }

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('process-sms-sequences error:', error)
    return new Response(JSON.stringify({ error: error.message, ...stats }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
