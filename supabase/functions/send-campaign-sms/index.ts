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

const DAILY_LIMIT_PER_USER = 200
const STOP_DISCLOSURE = '\n\nReply STOP to opt out.'

// Normalizes US phone numbers to E.164 (+1XXXXXXXXXX)
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

// TCPA: SMS allowed 8am-9pm recipient local time (Alabama = US Central Time).
// CDT = UTC-5 (Mar-Nov), CST = UTC-6 (Nov-Mar). Use DST-aware check.
function isCentralTimeBusinessHours(): boolean {
  const now = new Date()
  const y = now.getUTCFullYear()
  // DST start: 2nd Sunday in March at 2am
  const dstStart = new Date(Date.UTC(y, 2, 8, 7)) // March 8 07:00 UTC (2am CST)
  dstStart.setUTCDate(8 + (7 - dstStart.getUTCDay()) % 7)
  // DST end: 1st Sunday in November at 2am
  const dstEnd = new Date(Date.UTC(y, 10, 1, 6)) // Nov 1 06:00 UTC (2am CDT)
  dstEnd.setUTCDate(1 + (7 - dstEnd.getUTCDay()) % 7)

  const isDST = now >= dstStart && now < dstEnd
  const ctHour = (now.getUTCHours() - (isDST ? 5 : 6) + 24) % 24
  const ctMinute = now.getUTCMinutes()
  const ctTime = ctHour + ctMinute / 60
  return ctTime >= 8 && ctTime < 21
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── AUTH ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── TWILIO CONFIG CHECK ───────────────────────────────────────────────────
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(JSON.stringify({
        error: 'SMS service not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Supabase secrets.',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const body = await req.json()
    const { leadId, to, message, enrollmentId, sequenceId } = body

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'to and message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const toPhone = normalizePhone(to)
    if (!toPhone) {
      return new Response(JSON.stringify({ error: 'Invalid phone number. Use 10-digit US format.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── TIME WINDOW CHECK (TCPA) ──────────────────────────────────────────────
    if (!isCentralTimeBusinessHours()) {
      return new Response(JSON.stringify({
        error: 'Outside allowed hours. TCPA restricts SMS to 8:00 AM – 9:00 PM Central Time (Alabama).',
        allowed_window: '8:00 AM – 9:00 PM CT',
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── DNC CHECK ─────────────────────────────────────────────────────────────
    const dnc_checked_at = new Date().toISOString()

    if (leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('property_id')
        .eq('id', leadId)
        .single()

      if (lead?.property_id) {
        const { data: property } = await supabase
          .from('properties')
          .select(
            'phone_1, phone_2, phone_3, phone_4, phone_5,' +
            'phone_1_dnc, phone_2_dnc, phone_3_dnc, phone_4_dnc, phone_5_dnc,' +
            'do_not_mail'
          )
          .eq('id', lead.property_id)
          .single()

        if (property) {
          if (property.do_not_mail) {
            return new Response(JSON.stringify({
              error: 'DNC_BLOCKED',
              reason: 'Lead is marked Do Not Contact',
            }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          const slots = [
            { num: property.phone_1, dnc: property.phone_1_dnc },
            { num: property.phone_2, dnc: property.phone_2_dnc },
            { num: property.phone_3, dnc: property.phone_3_dnc },
            { num: property.phone_4, dnc: property.phone_4_dnc },
            { num: property.phone_5, dnc: property.phone_5_dnc },
          ]
          const match = slots.find(s => s.num && normalizePhone(s.num) === toPhone)
          if (match?.dnc) {
            return new Response(JSON.stringify({
              error: 'DNC_BLOCKED',
              reason: `${toPhone} is on the DNC list for this property`,
            }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
      }
    }

    // ── DAILY RATE LIMIT ──────────────────────────────────────────────────────
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { count: sentToday } = await supabase
      .from('sms_outreach_log')
      .select('id', { count: 'exact', head: true })
      .eq('sent_by', user.id)
      .eq('direction', 'outbound')
      .gte('sent_at', startOfDay.toISOString())

    if ((sentToday ?? 0) >= DAILY_LIMIT_PER_USER) {
      return new Response(JSON.stringify({
        error: `Daily SMS limit reached (${DAILY_LIMIT_PER_USER}). Try again tomorrow.`,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── STOP DISCLOSURE on first ever outbound SMS to this number ─────────────
    // TCPA requires opt-out instructions in the first message of any campaign.
    const { count: priorSent } = await supabase
      .from('sms_outreach_log')
      .select('id', { count: 'exact', head: true })
      .eq('to_phone', toPhone)
      .eq('direction', 'outbound')

    const isFirstMessage = (priorSent ?? 0) === 0
    const finalMessage = isFirstMessage && !message.toLowerCase().includes('stop')
      ? `${message}${STOP_DISCLOSURE}`
      : message

    // ── SEND VIA TWILIO ───────────────────────────────────────────────────────
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_PHONE_NUMBER, To: toPhone, Body: finalMessage }).toString(),
    })

    const twilioData = await twilioRes.json().catch(() => ({}))

    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioData)

      await supabase.from('sms_outreach_log').insert({
        lead_id: leadId ?? null,
        sent_by: user.id,
        to_phone: toPhone,
        message: finalMessage,
        status: 'failed',
        direction: 'outbound',
        enrollment_id: enrollmentId ?? null,
        sequence_id: sequenceId ?? null,
        dnc_checked_at,
        error: JSON.stringify(twilioData).slice(0, 500),
      })

      if (leadId) {
        await supabase.from('interactions').insert({
          lead_id: leadId,
          interaction_type: 'sms',
          direction: 'outbound',
          sentiment: 'negative',
          content: `[SMS FAILED] To: ${toPhone}\nError: ${twilioData?.message ?? 'Unknown'}\n\n${finalMessage}`,
          created_by: user.id,
        }).catch(e => console.warn('interaction log failed', e))
      }

      return new Response(JSON.stringify({ error: twilioData?.message || 'Failed to send SMS' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const twilio_sid = twilioData?.sid ?? null

    // ── LOG SUCCESS ───────────────────────────────────────────────────────────
    await supabase.from('sms_outreach_log').insert({
      lead_id: leadId ?? null,
      sent_by: user.id,
      to_phone: toPhone,
      message: finalMessage,
      status: twilioData?.status ?? 'sent',
      direction: 'outbound',
      twilio_sid,
      enrollment_id: enrollmentId ?? null,
      sequence_id: sequenceId ?? null,
      dnc_checked_at,
    })

    if (leadId) {
      await supabase.from('interactions').insert({
        lead_id: leadId,
        interaction_type: 'sms',
        direction: 'outbound',
        sentiment: 'positive',
        content: `[SMS SENT] To: ${toPhone}\nSID: ${twilio_sid ?? '-'}\n\n${finalMessage}`,
        created_by: user.id,
      }).catch(e => console.warn('interaction log failed', e))
    }

    if (enrollmentId && sequenceId) {
      await supabase.from('campaign_message_logs').insert({
        enrollment_id: enrollmentId,
        sequence_id: sequenceId,
        channel: 'sms',
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).catch(e => console.warn('campaign_message_log failed', e))
    }

    return new Response(JSON.stringify({
      success: true,
      sid: twilio_sid,
      status: twilioData?.status,
      first_message: isFirstMessage,
      remainingToday: DAILY_LIMIT_PER_USER - ((sentToday ?? 0) + 1),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('send-campaign-sms error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
