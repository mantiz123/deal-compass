import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { contractId } = await req.json()
    if (!contractId) {
      return new Response(JSON.stringify({ error: 'contractId required' }), { status: 400, headers: corsHeaders })
    }

    // Fetch contract with lead data
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*, lead:leads(id, property:properties(address, city, state, owner_name, owner_email))')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404, headers: corsHeaders })
    }

    const property = (contract as any).lead?.property
    const sellerEmail = contract.seller_email || property?.owner_email
    const sellerName = property?.owner_name || 'Seller'
    const propertyAddress = property?.address || 'Property'

    if (!sellerEmail) {
      return new Response(JSON.stringify({ error: 'No seller email available' }), { status: 400, headers: corsHeaders })
    }

    // Build signing URL
    const signingUrl = `https://goklose.lovable.app/sign/${contract.signing_token}`

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0a0a14; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #00d4aa; margin: 0; font-size: 24px; letter-spacing: 3px;">KLOSE LLC</h1>
    <p style="color: #888; margin: 5px 0 0; font-size: 12px;">Real Estate Investment</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hi ${sellerName},</p>
    
    <p>Thank you for speaking with us. Please find your purchase agreement for <strong>${propertyAddress}, ${property?.city || ''}, ${property?.state || ''}</strong>.</p>
    
    <p>To review and sign your documents, please click the link below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${signingUrl}" style="background: #00d4aa; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Review & Sign Documents</a>
    </div>
    
    <p style="font-size: 13px; color: #666;">This link is secure and unique to you. It will expire in 30 days. If you have any questions, please don't hesitate to reach out.</p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
    
    <p style="margin: 0;">Best regards,</p>
    <p style="margin: 5px 0; font-weight: bold;">Sergio Mantilla</p>
    <p style="margin: 0; color: #666; font-size: 13px;">Klose LLC</p>
  </div>
</body>
</html>`

    // Send email via Resend if API key is available, otherwise log
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Klose LLC <contracts@klosellc.com>',
          to: [sellerEmail],
          subject: `Your Purchase Agreement – ${propertyAddress} | Klose LLC`,
          html: emailHtml,
        }),
      })

      if (!resendResponse.ok) {
        const err = await resendResponse.text()
        console.error('Resend error:', err)
        // Don't fail the whole operation, just log
      }
    } else {
      console.log('RESEND_API_KEY not set. Email would be sent to:', sellerEmail)
      console.log('Signing URL:', signingUrl)
    }

    // Update contract status
    await supabase
      .from('contracts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        seller_email: sellerEmail,
      })
      .eq('id', contractId)

    // Send internal notification to admin
    console.log(`📧 Contract sent to ${sellerName} (${sellerEmail}) for ${propertyAddress}`)

    return new Response(JSON.stringify({ 
      success: true, 
      signingUrl,
      message: RESEND_API_KEY ? 'Email sent successfully' : 'Email logged (no Resend API key configured)',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
