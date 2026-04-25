import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // ── AUTH GUARD ──
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedCronSecret = req.headers.get('x-cron-secret');
    const isCronCall = !!cronSecret && providedCronSecret === cronSecret;

    if (!isCronCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userId = claimsData.claims.sub;
      const adminCheck = createClient(supabaseUrl, serviceRoleKey);
      const { data: hasRole } = await adminCheck.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });
      if (!hasRole) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split('T')[0];

    // Find active leads with expired auction dates
    const { data: expiredLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, property:properties!inner(id, auction_date, address, is_foreclosure)')
      .is('archived_at', null)
      .not('status', 'eq', 'cerrado');

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      throw fetchError;
    }

    const toArchive = (expiredLeads || []).filter((lead: any) => {
      const p = lead.property;
      return p?.is_foreclosure && p?.auction_date && p.auction_date < today;
    });

    console.log(`Found ${toArchive.length} leads with expired auction dates`);

    let archived = 0;
    for (const lead of toArchive) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          archived_at: new Date().toISOString(),
          archive_reason: 'other',
          archive_notes: `Auto-archivado: subasta vencida el ${(lead as any).property.auction_date}`,
          status: 'captacion',
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`Error archiving lead ${lead.id}:`, updateError);
      } else {
        archived++;
        console.log(`Archived lead ${lead.id} - auction expired: ${(lead as any).property.auction_date}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Archived ${archived} leads with expired auctions`,
        total_checked: expiredLeads?.length || 0,
        archived,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-archive:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
