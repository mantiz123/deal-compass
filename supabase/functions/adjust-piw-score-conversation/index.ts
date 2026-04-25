import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationData {
  leadId: string;
  urgencyLevel: 'desperate' | 'high' | 'moderate' | 'low' | 'none';
  mainPain: string;
  keyObjection?: string;
  priceFlexibility: 'very_flexible' | 'somewhat_flexible' | 'firm' | 'unrealistic';
  sellerAskingPrice?: number;
  ourOfferDiscussed?: number;
  notes?: string;
  currentPiwScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const conversationData: ConversationData = await req.json();
    
    const { 
      leadId, 
      urgencyLevel, 
      mainPain, 
      keyObjection, 
      priceFlexibility,
      sellerAskingPrice,
      ourOfferDiscussed,
      notes,
      currentPiwScore 
    } = conversationData;

    console.log('Processing conversation for lead:', leadId);
    console.log('Current K-Score:', currentPiwScore);
    console.log('Urgency Level:', urgencyLevel);
    console.log('Price Flexibility:', priceFlexibility);

    // Build the prompt for AI analysis
    const prompt = `Eres un experto en wholesaling inmobiliario analizando una conversación con un vendedor.

DATOS DE LA CONVERSACIÓN:
- Nivel de Urgencia del Vendedor: ${urgencyLevel} (desperate=desesperado, high=alta, moderate=moderada, low=baja, none=ninguna)
- Dolor Principal del Vendedor: ${mainPain}
- Objeción Clave: ${keyObjection || 'Ninguna mencionada'}
- Flexibilidad de Precio: ${priceFlexibility} (very_flexible=muy flexible, somewhat_flexible=algo flexible, firm=firme, unrealistic=irreal)
${sellerAskingPrice ? `- Precio que Pide el Vendedor: $${sellerAskingPrice.toLocaleString()}` : ''}
${ourOfferDiscussed ? `- Nuestra Oferta Discutida: $${ourOfferDiscussed.toLocaleString()}` : ''}
${notes ? `- Notas Adicionales: ${notes}` : ''}

PIW SCORE ACTUAL (basado solo en datos de propiedad): ${currentPiwScore}/100

FILOSOFÍA PIW-SCORE:
- La motivación del vendedor es el factor MÁS IMPORTANTE (pesa más que los fundamentales del mercado)
- Un vendedor desesperado con precio flexible = deal casi seguro
- Un vendedor sin urgencia con precio irreal = deal casi imposible
- Las objeciones superables (necesita tiempo, quiere entender el proceso) son menos graves que las insuperables (precio emocional, no está listo)

ESCALA DE AJUSTE:
- Conversación MUY positiva: +15 a +25 puntos
- Conversación positiva: +5 a +15 puntos
- Conversación neutral: -5 a +5 puntos
- Conversación negativa: -15 a -5 puntos
- Conversación MUY negativa: -25 a -15 puntos

El score final debe estar entre 0 y 100.

Responde EXACTAMENTE en este formato JSON:
{
  "adjustedScore": [número entre 0-100],
  "adjustment": [número del ajuste, puede ser negativo],
  "reason": "[explicación breve en español de por qué este ajuste, máximo 2 oraciones]",
  "dealProbability": "[ALTA/MEDIA/BAJA]",
  "recommendedAction": "[acción específica recomendada en español]"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Eres un experto en wholesaling inmobiliario. Responde SOLO con JSON válido, sin markdown ni explicaciones adicionales.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    let analysisResult;
    try {
      // Clean the response in case it has markdown code blocks
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI analysis response');
    }

    const { adjustedScore, adjustment, reason, dealProbability, recommendedAction } = analysisResult;

    // Ensure score is within bounds
    const finalScore = Math.max(0, Math.min(100, adjustedScore));

    // Get auth header for user identification
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // CRITICAL multi-tenant: derive organization_id from the lead
    // (each lead belongs to exactly one org via RLS)
    const { data: leadRow, error: leadFetchErr } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', leadId)
      .single();

    if (leadFetchErr || !leadRow?.organization_id) {
      console.error('Could not resolve organization_id from lead:', leadFetchErr);
      throw new Error('Lead not found or missing organization');
    }

    // Save the conversation record with explicit org_id
    const { data: conversationRecord, error: insertError } = await supabase
      .from('seller_conversations')
      .insert({
        lead_id: leadId,
        organization_id: leadRow.organization_id,
        urgency_level: urgencyLevel,
        main_pain: mainPain,
        key_objection: keyObjection,
        price_flexibility: priceFlexibility,
        seller_asking_price: sellerAskingPrice,
        our_offer_discussed: ourOfferDiscussed,
        notes: notes,
        ai_adjusted_score: finalScore,
        ai_adjustment_reason: reason,
        previous_piw_score: currentPiwScore,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting conversation:', insertError);
      throw new Error('Failed to save conversation record');
    }

    // Update the lead's K-Score
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        piw_score: finalScore,
        last_contact_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead K-Score:', updateError);
      throw new Error('Failed to update lead K-Score');
    }

    console.log('Successfully adjusted K-Score from', currentPiwScore, 'to', finalScore);

    return new Response(JSON.stringify({
      success: true,
      previousScore: currentPiwScore,
      adjustedScore: finalScore,
      adjustment,
      reason,
      dealProbability,
      recommendedAction,
      conversationId: conversationRecord.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in adjust-piw-score-conversation:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
