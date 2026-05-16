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
    // Allow either:
    // 1) Cron invocation with shared secret header (X-Cron-Secret)
    // 2) Authenticated admin user
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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const staleThreshold = new Date(today);
    staleThreshold.setDate(staleThreshold.getDate() - 14);
    const deleteThreshold = new Date(today);
    deleteThreshold.setDate(deleteThreshold.getDate() - 7);

    const results = {
      archived_expired_auctions: 0,
      archived_stale: 0,
      permanently_deleted: 0,
      sms_sequences_sent: 0,
      errors: [] as string[],
    };

    // ── STEP 1: Auto-archive leads with expired auction dates ──
    const { data: activeLeads, error: fetchErr1 } = await supabase
      .from('leads')
      .select('id, assigned_agent_id, piw_score, source, status, created_at, last_contact_at, property:properties!inner(id, address, city, auction_date, is_foreclosure)')
      .is('archived_at', null)
      .not('status', 'eq', 'cerrado');

    if (fetchErr1) {
      console.error('Error fetching active leads:', fetchErr1);
      results.errors.push(`Fetch active leads: ${fetchErr1.message}`);
    } else {
      // Expired auctions
      const expiredAuction = (activeLeads || []).filter((l: any) => {
        const p = l.property;
        return p?.is_foreclosure && p?.auction_date && p.auction_date < todayStr;
      });

      for (const lead of expiredAuction) {
        const prop = (lead as any).property;
        const note = `Auto-archivado: subasta vencida el ${prop.auction_date}`;
        const { error } = await supabase.from('leads').update({
          archived_at: today.toISOString(),
          archive_reason: 'other',
          archive_notes: note,
        }).eq('id', lead.id);

        if (error) {
          results.errors.push(`Archive auction ${lead.id}: ${error.message}`);
        } else {
          results.archived_expired_auctions++;
          // Log to cleanup history
          await supabase.from('lead_cleanup_log').insert({
            lead_id: lead.id,
            property_address: prop.address,
            property_city: prop.city,
            action: 'auto_archived',
            reason: 'expired_auction',
            notes: note,
            user_id: lead.assigned_agent_id,
            lead_data: { piw_score: lead.piw_score, source: lead.source, status: lead.status, auction_date: prop.auction_date },
          });
        }
      }

      // Stale leads (14+ days without activity)
      const staleLeads = (activeLeads || []).filter((l: any) => {
        const lastActivity = l.last_contact_at || l.created_at;
        return new Date(lastActivity) < staleThreshold;
      });

      for (const lead of staleLeads) {
        // Skip if already archived above
        if (expiredAuction.some((e: any) => e.id === lead.id)) continue;
        
        const prop = (lead as any).property;
        const days = Math.floor((today.getTime() - new Date(lead.last_contact_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const note = `Auto-archivado: ${days} días sin actividad`;
        
        const { error } = await supabase.from('leads').update({
          archived_at: today.toISOString(),
          archive_reason: 'no_response',
          archive_notes: note,
        }).eq('id', lead.id);

        if (error) {
          results.errors.push(`Archive stale ${lead.id}: ${error.message}`);
        } else {
          results.archived_stale++;
          await supabase.from('lead_cleanup_log').insert({
            lead_id: lead.id,
            property_address: prop.address,
            property_city: prop.city,
            action: 'auto_archived',
            reason: 'stale_no_activity',
            notes: note,
            user_id: lead.assigned_agent_id,
            lead_data: { piw_score: lead.piw_score, source: lead.source, status: lead.status, days_stale: days },
          });
        }
      }
    }

    // ── STEP 2: Auto-delete leads archived 7+ days ago ──
    const { data: oldArchived, error: fetchErr2 } = await supabase
      .from('leads')
      .select('id, assigned_agent_id, piw_score, source, status, archived_at, archive_reason, archive_notes, property:properties(address, city)')
      .not('archived_at', 'is', null)
      .lt('archived_at', deleteThreshold.toISOString());

    if (fetchErr2) {
      results.errors.push(`Fetch archived leads: ${fetchErr2.message}`);
    } else {
      for (const lead of (oldArchived || [])) {
        const prop = (lead as any).property;
        // Log before deleting
        await supabase.from('lead_cleanup_log').insert({
          lead_id: lead.id,
          property_address: prop?.address,
          property_city: prop?.city,
          action: 'auto_deleted',
          reason: lead.archive_reason || 'expired_archive',
          notes: `Auto-eliminado: archivado por más de 7 días. Razón original: ${lead.archive_notes || lead.archive_reason || 'N/A'}`,
          user_id: lead.assigned_agent_id,
          lead_data: { piw_score: lead.piw_score, source: lead.source, status: lead.status, archived_at: lead.archived_at, archive_reason: lead.archive_reason },
        });

        const { error } = await supabase.from('leads').delete().eq('id', lead.id);
        if (error) {
          results.errors.push(`Delete ${lead.id}: ${error.message}`);
        } else {
          results.permanently_deleted++;
        }
      }
    }

    // ── STEP 3: Process pending SMS campaign sequences ──────────────────────
    try {
      const smsRes = await fetch(`${supabaseUrl}/functions/v1/process-sms-sequences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      const smsData = await smsRes.json().catch(() => ({}));
      results.sms_sequences_sent = smsData.sent ?? 0;
      if (smsData.error) results.errors.push(`SMS sequences: ${smsData.error}`);
    } catch (err) {
      results.errors.push(`SMS scheduler: ${String(err)}`);
    }

    console.log(`Cleanup complete:`, results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
