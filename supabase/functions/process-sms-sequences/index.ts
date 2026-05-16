// SMS Sequence Scheduler
// Processes pending campaign SMS steps for active enrollments whose next_send_at has passed.
// Called manually from the UI or via a pg_cron daily job.
//
// Scope: SMS channel only. Email campaign steps are excluded (handled separately).
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

function normalizePhone(phone: string): string | null {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
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

  // Allow both user-auth calls (from UI button) and service-role calls (from cron)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Optional user auth — used to log sent_by if called from UI
  let callerUserId: string | null = null
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser()
    callerUserId = user?.id ?? null
  }

  const stats = { processed: 0, sent: 0, skipped_dnc: 0, skipped_no_phone: 0, failed: 0, completed: 0 }

  try {
    const now = new Date().toISOString()

    // Fetch pending enrollments: active + next_send_at has passed
    const { data: enrollments, error: enrollError } = await supabase
      .from('campaign_enrollments')
      .select(`
        id, campaign_id, lead_id, current_sequence, next_send_at,
        lead:leads(id, assigned_agent_id, property:properties(
          id, phone_1, phone_2, phone_3, phone_4, phone_5,
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

      // ── Fetch the next sequence step ──────────────────────────────────────
      const nextOrder = (enrollment.current_sequence ?? 0) + 1

      const { data: sequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', enrollment.campaign_id)
        .order('sequence_order', { ascending: true })

      const step = sequences?.find((s: any) => s.sequence_order === nextOrder)

      // No more steps → mark completed
      if (!step) {
        await supabase
          .from('campaign_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id)
        stats.completed++
        continue
      }

      // Skip email steps — this scheduler only handles SMS
      if (step.channel === 'email') {
        // Advance to next sequence (don't re-process email step endlessly)
        const nextStep = sequences?.find((s: any) => s.sequence_order === nextOrder + 1)
        const nextSendAt = nextStep
          ? new Date(Date.now() + (nextStep.delay_days * 86400 + nextStep.delay_hours * 3600) * 1000).toISOString()
          : null

        await supabase
          .from('campaign_enrollments')
          .update({
            current_sequence: nextOrder,
            last_sent_at: now,
            next_send_at: nextSendAt,
            ...(nextSendAt === null ? { status: 'completed', completed_at: now } : {}),
          })
          .eq('id', enrollment.id)
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
        // Log failed message so it's visible in campaign logs
        await supabase.from('campaign_message_logs').insert({
          enrollment_id: enrollment.id,
          sequence_id: step.id,
          channel: 'sms',
          status: 'failed',
          sent_at: now,
          error_message: 'No valid phone number (all slots empty or DNC)',
        }).catch(() => {})
        // Advance anyway so we don't retry forever
        const nextStep = sequences?.find((s: any) => s.sequence_order === nextOrder + 1)
        const nextSendAt = nextStep
          ? new Date(Date.now() + (nextStep.delay_days * 86400 + nextStep.delay_hours * 3600) * 1000).toISOString()
          : null
        await supabase
          .from('campaign_enrollments')
          .update({
            current_sequence: nextOrder,
            last_sent_at: now,
            next_send_at: nextSendAt,
            ...(nextSendAt === null ? { status: 'completed', completed_at: now } : {}),
          })
          .eq('id', enrollment.id)
        continue
      }

      // ── Personalize message ────────────────────────────────────────────────
      const ownerName = property?.owner_name?.split(' ')[0] ?? 'there'
      const message = step.content.replace(/\{\{nombre\}\}/gi, ownerName)

      // ── Send via Twilio ────────────────────────────────────────────────────
      const twilioResult = await sendTwilioSMS(toPhone, message)
      const sentBy = callerUserId ?? lead?.assigned_agent_id ?? null

      if (twilioResult) {
        // Log to sms_outreach_log
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

        // Update campaign message log
        await supabase.from('campaign_message_logs').insert({
          enrollment_id: enrollment.id,
          sequence_id: step.id,
          channel: 'sms',
          status: 'sent',
          sent_at: now,
        }).catch(() => {})

        // Log to interaction timeline
        if (enrollment.lead_id) {
          await supabase.from('interactions').insert({
            lead_id: enrollment.lead_id,
            interaction_type: 'sms',
            direction: 'outbound',
            sentiment: 'positive',
            content: `[CAMPAIGN SMS] Paso ${nextOrder} → ${toPhone}\nSID: ${twilioResult.sid}\n\n${message}`,
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
      const nextStep = sequences?.find((s: any) => s.sequence_order === nextOrder + 1)
      const nextSendAt = nextStep
        ? new Date(Date.now() + (nextStep.delay_days * 86400 + nextStep.delay_hours * 3600) * 1000).toISOString()
        : null

      await supabase
        .from('campaign_enrollments')
        .update({
          current_sequence: nextOrder,
          last_sent_at: now,
          next_send_at: nextSendAt,
          ...(nextSendAt === null ? { status: 'completed', completed_at: now } : {}),
        })
        .eq('id', enrollment.id)
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
