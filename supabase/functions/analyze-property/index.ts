import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  year_built: number | null;
  arv: number | null;
  repair_cost: number | null;
  mao: number | null;
  equity_percent: number | null;
  owner_tenure_years: number | null;
  is_absentee_owner: boolean | null;
  is_foreclosure: boolean | null;
  is_probate: boolean | null;
  tax_delinquent: boolean | null;
  tax_debt: number | null;
  eviction_count: number | null;
  active_liens_count: number | null;
  last_sale_price: number | null;
  last_sale_date: string | null;
  neighborhood_vacancy_rate: number | null;
  price_growth_3yr: number | null;
  mortgage_age_years: number | null;
}

interface LeadData {
  piw_score: number | null;
  listing_price: number | null;
  offer_amount: number | null;
  assignment_fee: number | null;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { property, lead } = await req.json() as { property: PropertyData; lead: LeadData };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing property:", property.address);

    // Build comprehensive property context
    const propertyContext = `
## Datos de la Propiedad
- **Dirección**: ${property.address}, ${property.city}, ${property.state} ${property.zip_code}
- **Tipo**: ${property.property_type?.replace('_', ' ') || 'Desconocido'}
- **Características**: ${property.bedrooms || '?'} hab, ${property.bathrooms || '?'} baños, ${property.sqft?.toLocaleString() || '?'} sqft
- **Año Construcción**: ${property.year_built || 'Desconocido'}

## Datos Financieros
- **ARV (After Repair Value)**: ${property.arv ? '$' + Number(property.arv).toLocaleString() : 'No disponible'}
- **Costo Reparación Estimado**: ${property.repair_cost ? '$' + Number(property.repair_cost).toLocaleString() : 'No disponible'}
- **MAO (Max Allowable Offer)**: ${property.mao ? '$' + Number(property.mao).toLocaleString() : 'No disponible'}
- **Equity del Propietario**: ${property.equity_percent ? property.equity_percent + '%' : 'Desconocido'}
- **Último Precio de Venta**: ${property.last_sale_price ? '$' + Number(property.last_sale_price).toLocaleString() : 'Desconocido'}
- **Fecha Última Venta**: ${property.last_sale_date || 'Desconocida'}

## Indicadores de Motivación del Vendedor
- **Años de Propiedad**: ${property.owner_tenure_years || 'Desconocido'}
- **Propietario Ausente**: ${property.is_absentee_owner ? 'Sí' : 'No'}
- **En Foreclosure**: ${property.is_foreclosure ? 'Sí' : 'No'}
- **Probate/Herencia**: ${property.is_probate ? 'Sí' : 'No'}
- **Delinquencia Fiscal**: ${property.tax_delinquent ? 'Sí - $' + (property.tax_debt || 0).toLocaleString() : 'No'}
- **Historial de Evictions**: ${property.eviction_count || 0}
- **Liens Activos**: ${property.active_liens_count || 0}
- **Edad de Hipoteca**: ${property.mortgage_age_years ? property.mortgage_age_years + ' años' : 'Desconocida'}

## Datos del Mercado/Vecindario
- **Tasa de Vacancia del Vecindario**: ${property.neighborhood_vacancy_rate ? property.neighborhood_vacancy_rate + '%' : 'Desconocida'}
- **Crecimiento de Precios (3 años)**: ${property.price_growth_3yr ? property.price_growth_3yr + '%' : 'Desconocido'}

## Datos del Lead
- **PIW Score**: ${lead.piw_score || 0}/100
- **Precio de Lista**: ${lead.listing_price ? '$' + Number(lead.listing_price).toLocaleString() : 'No disponible'}
- **Oferta Actual**: ${lead.offer_amount ? '$' + Number(lead.offer_amount).toLocaleString() : 'No disponible'}
- **Fee de Cesión Esperado**: ${lead.assignment_fee ? '$' + Number(lead.assignment_fee).toLocaleString() : 'No definido'}
- **Etapa**: ${lead.status}
`;

    const systemPrompt = `Eres un analista de inversiones inmobiliarias experto especializado en wholesaling de propiedades en Estados Unidos. Tu rol es proporcionar análisis profesionales, detallados y accionables para inversionistas.

IMPORTANTE:
- Responde SIEMPRE en español
- Sé directo y profesional
- Usa datos concretos cuando estén disponibles
- Cuando falten datos, indica qué información adicional sería valiosa
- Proporciona números específicos y rangos cuando sea posible
- Considera el mercado de ${property.state} específicamente

Tu respuesta debe ser un JSON válido con la siguiente estructura exacta (sin markdown, solo JSON puro):
{
  "investment_analysis": {
    "roi_potential": "string con análisis de ROI potencial",
    "cap_rate_estimate": "string con estimación de cap rate si es rental",
    "cash_flow_projection": "string con proyección de cash flow",
    "risk_level": "bajo|medio|alto",
    "risk_factors": ["array de factores de riesgo identificados"],
    "opportunity_score": number entre 1-10
  },
  "seller_motivation": {
    "motivation_level": "baja|media|alta|muy_alta",
    "key_indicators": ["array de indicadores de motivación detectados"],
    "negotiation_strategy": "string con estrategia de negociación recomendada",
    "urgency_assessment": "string con evaluación de urgencia"
  },
  "neighborhood_analysis": {
    "market_trend": "string con tendencia del mercado local",
    "investment_potential": "string con potencial de inversión del área",
    "comparable_insight": "string con insights de comparables estimados",
    "exit_strategy_recommendations": ["array de estrategias de salida recomendadas"]
  },
  "recommendations": {
    "offer_range": {
      "min": number,
      "max": number,
      "optimal": number
    },
    "action_items": ["array de acciones recomendadas inmediatas"],
    "due_diligence_checklist": ["array de items a verificar"],
    "deal_verdict": "COMPRAR|NEGOCIAR|PASAR|INVESTIGAR_MAS"
  },
  "executive_summary": "string de 2-3 oraciones con el resumen ejecutivo del deal"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analiza la siguiente propiedad para un inversionista de wholesaling:\n\n${propertyContext}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contacta al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("AI response received, parsing...");

    // Try to parse the JSON response
    let analysis;
    try {
      // Clean up potential markdown formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("Raw content:", content);
      
      // Return a structured error with the raw content
      return new Response(
        JSON.stringify({ 
          error: "Error al procesar respuesta de IA",
          raw_response: content 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analysis complete for:", property.address);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-property function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
