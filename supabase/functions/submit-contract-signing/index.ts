const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    ''
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { token, signatures, contractData, signerName, consentData, browserData } = body

    if (!token || !signatures || !signerName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Validate token server-side
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('id, contract_type, status, signing_token_expires_at, seller_email, document_hash, created_at, contract_data')
      .eq('signing_token', token)
      .single()

    if (error || !contract) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 404, headers: corsHeaders })
    }

    if (contract.status === 'signed' || contract.status === 'completed') {
      return new Response(JSON.stringify({ error: 'already_signed' }), { status: 409, headers: corsHeaders })
    }

    if (contract.signing_token_expires_at && new Date() > new Date(contract.signing_token_expires_at)) {
      return new Response(JSON.stringify({ error: 'Token expired' }), { status: 410, headers: corsHeaders })
    }

    const serverIp = getClientIp(req)
    const signedAt = new Date().toISOString()

    // Insert ESIGN/UETA consent audit record
    if (consentData) {
      await supabase.from('contract_signatures').insert({
        contract_id: contract.id,
        signer_name: 'ESIGN_CONSENT',
        signer_email: contract.seller_email,
        signature_image: 'CONSENT_GIVEN',
        ip_address: serverIp,
        user_agent: JSON.stringify({
          type: 'esign_consent',
          esign_act: true,
          ueta_alabama: true,
          clientIp: consentData.ip || '',
          serverIp,
          userAgent: consentData.userAgent || browserData?.userAgent || '',
          platform: consentData.platform || browserData?.platform || '',
          screenWidth: consentData.screenWidth || browserData?.screenWidth || 0,
          screenHeight: consentData.screenHeight || browserData?.screenHeight || 0,
          timezone: consentData.timezone || browserData?.timezone || '',
          consentTimestamp: consentData.timestamp || signedAt,
        }),
      })
    }

    // Insert per-page signature records with full audit trail
    const sigInserts = Object.entries(signatures as Record<string, string>).map(([pageNum, sigImage]) => ({
      contract_id: contract.id,
      signer_name: signerName,
      signer_email: contract.seller_email,
      signature_image: sigImage,
      ip_address: serverIp,
      user_agent: JSON.stringify({
        userAgent: browserData?.userAgent || '',
        platform: browserData?.platform || '',
        screenWidth: browserData?.screenWidth || 0,
        screenHeight: browserData?.screenHeight || 0,
        timezone: browserData?.timezone || '',
        consentTimestamp: consentData?.timestamp || '',
        clientIp: consentData?.ip || '',
        serverIp,
        page: Number(pageNum),
      }),
    }))

    const { error: sigError } = await supabase.from('contract_signatures').insert(sigInserts)
    if (sigError) throw sigError

    // Merge seller info form data with existing contract_data
    const mergedData = { ...(contract.contract_data as Record<string, any> || {}), ...(contractData || {}) }

    await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: signedAt,
        ip_address: serverIp,
        contract_data: mergedData,
      })
      .eq('id', contract.id)

    // Trigger signed PDF + Certificate of Completion generation (best-effort)
    let signedPdfUrl = ''
    try {
      const pdfController = new AbortController()
      const pdfTimeout = setTimeout(() => pdfController.abort(), 25000)
      const pdfRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-signed-pdf`, {
        method: 'POST',
        signal: pdfController.signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ contractId: contract.id }),
      })
      clearTimeout(pdfTimeout)
      if (pdfRes.ok) {
        const pdfData = await pdfRes.json()
        signedPdfUrl = pdfData.signedPdfUrl || ''
      }
    } catch (e) {
      console.error('PDF generation error (non-fatal):', e)
    }

    return new Response(
      JSON.stringify({ success: true, signedPdfUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('submit-contract-signing error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
