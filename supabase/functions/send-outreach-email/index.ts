import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Daily limit per user (anti-blocking safeguard)
const DAILY_LIMIT_PER_USER = 50

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const body = await req.json()
    const { leadId, to, subject, bodyText, bcc, replyTo } = body

    if (!to || !subject || !bodyText) {
      return new Response(JSON.stringify({ error: 'to, subject and bodyText are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate basic email
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Daily rate limit (count today's sends by this user)
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { count: sentToday } = await supabase
      .from('outreach_email_log')
      .select('id', { count: 'exact', head: true })
      .eq('sent_by', user.id)
      .gte('sent_at', startOfDay.toISOString())

    if ((sentToday ?? 0) >= DAILY_LIMIT_PER_USER) {
      return new Response(JSON.stringify({
        error: `Daily limit reached (${DAILY_LIMIT_PER_USER} emails). Try again tomorrow.`,
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build HTML body (preserve line breaks)
    const escaped = bodyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #222; white-space: pre-wrap;">${escaped}</div>`

    const PRIMARY_EMAIL = 'sergio@goklose.com'
    const senderName = user.user_metadata?.full_name || 'Klose LLC'
    const fromAddress = `${senderName} <${PRIMARY_EMAIL}>`
    const bccList: string[] = []
    if (bcc && emailRe.test(bcc)) bccList.push(bcc)
    else bccList.push(PRIMARY_EMAIL) // default BCC = sergio@goklose.com (historial centralizado)

    const payload: Record<string, any> = {
      from: fromAddress,
      to: [to],
      subject,
      html: htmlBody,
      text: bodyText,
      reply_to: (replyTo && emailRe.test(replyTo)) ? replyTo : PRIMARY_EMAIL,
    }
    if (bccList.length) payload.bcc = bccList

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const resendData = await resendRes.json().catch(() => ({}))

    const replyToAddr = (replyTo && emailRe.test(replyTo)) ? replyTo : PRIMARY_EMAIL

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      // Log failed attempt
      await supabase.from('outreach_email_log').insert({
        lead_id: leadId ?? null,
        sent_by: user.id,
        recipient_email: to,
        subject,
        status: 'failed',
        error: JSON.stringify(resendData).slice(0, 500),
        bcc_email: bccList[0] ?? null,
      })

      // Also log failed interaction so it shows in the lead timeline
      if (leadId) {
        try {
          const errMsg = (resendData?.message || 'Unknown error').toString().slice(0, 300)
          await supabase.from('interactions').insert({
            lead_id: leadId,
            interaction_type: 'email',
            direction: 'outbound',
            sentiment: 'negative',
            content: `[FAILED] To: ${to}\nBCC: ${bccList[0] ?? '-'}\nReply-To: ${replyToAddr}\nSubject: ${subject}\nError: ${errMsg}\n\n${bodyText}`,
            created_by: user.id,
          })
        } catch (e) {
          console.warn('failed interaction log error', e)
        }
      }

      return new Response(JSON.stringify({ error: resendData?.message || 'Failed to send' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log successful send
    await supabase.from('outreach_email_log').insert({
      lead_id: leadId ?? null,
      sent_by: user.id,
      recipient_email: to,
      subject,
      status: 'sent',
      provider_id: resendData?.id ?? null,
      bcc_email: bccList[0] ?? null,
    })

    // Add to interactions if leadId provided (best-effort, don't fail send)
    if (leadId) {
      try {
        await supabase.from('interactions').insert({
          lead_id: leadId,
          interaction_type: 'email',
          direction: 'outbound',
          content: `Subject: ${subject}\n\n${bodyText}`,
          created_by: user.id,
        })
      } catch (e) {
        console.warn('interaction log failed', e)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: resendData?.id,
      bcc: bccList[0] ?? null,
      remainingToday: DAILY_LIMIT_PER_USER - ((sentToday ?? 0) + 1),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('send-outreach-email error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
