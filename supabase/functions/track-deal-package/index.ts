import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1x1 transparent pixel GIF
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
])

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const packageId = url.searchParams.get('id')
    const action = url.searchParams.get('action') // 'open' or 'click'
    const redirectUrl = url.searchParams.get('redirect')

    console.log(`[Track] Package: ${packageId}, Action: ${action}`)

    if (!packageId) {
      console.error('[Track] Missing package ID')
      return new Response('Missing package ID', { status: 400, headers: corsHeaders })
    }

    // Initialize Supabase client with service role for writes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update tracking based on action
    const now = new Date().toISOString()
    
    if (action === 'open') {
      // Track email open (pixel load)
      const { error } = await supabase
        .from('deal_packages')
        .update({ opened_at: now })
        .eq('id', packageId)
        .is('opened_at', null) // Only update if not already opened

      if (error) {
        console.error('[Track] Error updating opened_at:', error)
      } else {
        console.log(`[Track] Marked package ${packageId} as opened`)
      }

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    } 
    
    if (action === 'click') {
      // Track link click
      const { error } = await supabase
        .from('deal_packages')
        .update({ clicked_at: now })
        .eq('id', packageId)

      if (error) {
        console.error('[Track] Error updating clicked_at:', error)
      } else {
        console.log(`[Track] Marked package ${packageId} as clicked`)
      }

      // Redirect to the actual deal page or provided URL
      const destination = redirectUrl || `${supabaseUrl}/deal/${packageId}`
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': destination,
        },
      })
    }

    // Default: return success
    return new Response(JSON.stringify({ success: true, packageId, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[Track] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
