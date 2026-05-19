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
    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), { status: 400, headers: corsHeaders })
    }

    // Use service role to bypass RLS — token validation is done here server-side
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*, lead:leads(id, property:properties(address, city, state, county, owner_name, owner_phone, owner_email))')
      .eq('signing_token', token)
      .single()

    if (error || !contract) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 404, headers: corsHeaders })
    }

    // Already signed?
    if (contract.status === 'signed' || contract.status === 'completed') {
      return new Response(JSON.stringify({ error: 'already_signed' }), { status: 409, headers: corsHeaders })
    }

    // Server-side expiry check (explicit column)
    if (contract.signing_token_expires_at && new Date() > new Date(contract.signing_token_expires_at)) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 410, headers: corsHeaders })
    }

    // Fallback: created_at + 30 days
    const created = new Date(contract.created_at)
    if ((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) > 30) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 410, headers: corsHeaders })
    }

    // Mark as viewed on first open
    if (!contract.viewed_at) {
      const ip = getClientIp(req)
      await supabase
        .from('contracts')
        .update({ viewed_at: new Date().toISOString(), ip_address: ip, status: 'viewed' })
        .eq('id', contract.id)
    }

    // Fetch Klose rep pre-signatures to display on the signing pages
    const { data: kloseSigs } = await supabase
      .from('contract_signatures')
      .select('signer_name, signature_image, signed_at, user_agent')
      .eq('contract_id', contract.id)
      .like('user_agent', '%Klose Rep%')

    return new Response(
      JSON.stringify({
        contract: {
          id: contract.id,
          contract_type: contract.contract_type,
          status: contract.status,
          contract_data: contract.contract_data,
          seller_email: contract.seller_email,
          signing_token: contract.signing_token,
          document_hash: contract.document_hash,
          signed_pdf_url: contract.signed_pdf_url,
          pdf_url: contract.pdf_url,
          lead: contract.lead,
        },
        kloseSignatures: kloseSigs || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('get-contract-for-signing error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
