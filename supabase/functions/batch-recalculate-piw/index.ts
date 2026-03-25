import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const offset = body.offset || 0;
    const forceAll = body.forceAll || false;

    // Get leads that need recalculation
    let query = supabase
      .from('leads')
      .select('id, property_id')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (!forceAll) {
      // Only recalculate leads with null or zero score
      query = query.or('piw_score.is.null,piw_score.eq.0');
    }

    const { data: leads, error: leadsError } = await query;
    if (leadsError) throw leadsError;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No more leads to process', 
        processed: 0, 
        offset,
        done: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let failed = 0;
    const results: any[] = [];

    for (const lead of leads) {
      try {
        // Get full property data
        const { data: property } = await supabase
          .from('properties')
          .select('*')
          .eq('id', lead.property_id)
          .single();

        if (!property) {
          failed++;
          continue;
        }

        // Call the existing calculate-piw-score function
        const calcResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-piw-score`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ leadId: lead.id, propertyData: property }),
        });

        if (calcResponse.ok) {
          const result = await calcResponse.json();
          results.push({
            leadId: lead.id,
            address: property.address,
            score: result.score,
            priority: result.priority,
          });
          processed++;
        } else {
          const errText = await calcResponse.text();
          console.error(`Failed for lead ${lead.id}:`, errText);
          
          // If rate limited, wait and retry
          if (calcResponse.status === 429) {
            await new Promise(r => setTimeout(r, 5000));
            const retryResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-piw-score`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ leadId: lead.id, propertyData: property }),
            });
            if (retryResponse.ok) {
              const result = await retryResponse.json();
              results.push({ leadId: lead.id, address: property.address, score: result.score, priority: result.priority });
              processed++;
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Error processing lead ${lead.id}:`, e);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      processed,
      failed,
      offset,
      nextOffset: offset + batchSize,
      hasMore: leads.length === batchSize,
      done: leads.length < batchSize,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Batch recalculate error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
