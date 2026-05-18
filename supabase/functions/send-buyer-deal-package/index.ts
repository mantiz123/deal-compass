import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

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
    const { buyer_id } = await req.json()

    if (!buyer_id) {
      return new Response(JSON.stringify({ error: 'buyer_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', buyer_id)
      .single()

    if (buyerError || !buyer) {
      return new Response(JSON.stringify({ error: 'Buyer not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!buyer.email) {
      return new Response(JSON.stringify({ error: 'Buyer has no email address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const firstName = buyer.contact_name?.split(' ')[0] || buyer.contact_name || 'there'
    const company = buyer.company_name || 'your company'

    const subject = 'Exclusive Off-Market Opportunities — Birmingham, AL | Klose LLC'
    const bodyText = `Dear ${firstName},

At Klose LLC, we have been building one of the most comprehensive off-market property pipelines in Birmingham, Alabama. Our proprietary acquisition system identifies distressed assets and high-equity properties before they reach the open market.

We are preparing to release a curated selection of investment-grade properties and want to ensure ${company} has first access.

Please confirm your current acquisition parameters:
• Target markets and preferred zip codes
• Price range and ARV thresholds
• Investment strategy (fix & flip / buy & hold)
• Preferred closing timeline

Reply to this email and you will be among the first to receive our upcoming deal flow. We move quickly — properties go under contract within 48–72 hours of release.

Best regards,
Sergio Mantilla
Managing Director — Klose LLC
(205) 660-2117
sergio@goklose.com
goklose.com`

    const escaped = bodyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #222; white-space: pre-wrap;">${escaped}</div>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sergio Mantilla <sergio@goklose.com>',
        to: [buyer.email],
        subject,
        html: htmlBody,
        text: bodyText,
        reply_to: 'sergio@goklose.com',
        bcc: ['sergio@goklose.com'],
      }),
    })

    const resendData = await resendRes.json().catch(() => ({}))

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return new Response(JSON.stringify({ error: resendData?.message || 'Failed to send email' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: resendData?.id,
      to: buyer.email,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('send-buyer-deal-package error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
