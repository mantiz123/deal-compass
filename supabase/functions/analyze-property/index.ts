import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  id: string;
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
  // New enriched fields
  estimated_monthly_rent: number | null;
  walkability_score: number | null;
  school_rating: number | null;
  median_household_income: number | null;
  population_growth_5yr: number | null;
  crime_index: number | null;
  days_on_market_avg: number | null;
}

interface LeadData {
  id: string;
  piw_score: number | null;
  listing_price: number | null;
  offer_amount: number | null;
  assignment_fee: number | null;
  status: string;
}

interface CompData {
  address: string;
  sale_price: number;
  sale_date: string | null;
  sqft: number | null;
  price_per_sqft: number | null;
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

    // Initialize Supabase client to fetch comps
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Analyzing property:", property.address);

    // Fetch comps for this property
    let compsData: CompData[] = [];
    let compsSummary = null;
    
    if (property.id) {
      const { data: comps } = await supabase
        .from('property_comps')
        .select('address, sale_price, sale_date, sqft, price_per_sqft')
        .eq('property_id', property.id)
        .order('sale_date', { ascending: false })
        .limit(10);
      
      if (comps && comps.length > 0) {
        compsData = comps;
        const avgPrice = comps.reduce((sum, c) => sum + Number(c.sale_price), 0) / comps.length;
        const avgPsf = comps.filter(c => c.price_per_sqft).reduce((sum, c) => sum + Number(c.price_per_sqft || 0), 0) / comps.filter(c => c.price_per_sqft).length;
        compsSummary = {
          count: comps.length,
          avgPrice: Math.round(avgPrice),
          avgPricePerSqft: Math.round(avgPsf * 100) / 100,
        };
      }
    }

    // Build comprehensive property context with enriched data
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
${property.estimated_monthly_rent ? `- **Renta Mensual Estimada**: $${Number(property.estimated_monthly_rent).toLocaleString()}` : ''}

## Datos de Comparables (Comps)
${compsSummary ? `
- **Cantidad de Comps**: ${compsSummary.count}
- **Precio Promedio de Venta**: $${compsSummary.avgPrice.toLocaleString()}
- **Precio Promedio por SqFt**: $${compsSummary.avgPricePerSqft}
${compsData.slice(0, 5).map(c => `  - ${c.address}: $${Number(c.sale_price).toLocaleString()} (${c.sale_date || 'fecha desconocida'})`).join('\n')}
` : '- No hay comps ingresados para esta propiedad'}

## Datos del Mercado y Vecindario
- **Walk Score**: ${property.walkability_score ? property.walkability_score + '/100' : 'No disponible'}
- **Rating de Escuelas**: ${property.school_rating ? property.school_rating + '/10' : 'No disponible'}
- **Ingreso Mediano del ZIP**: ${property.median_household_income ? '$' + Number(property.median_household_income).toLocaleString() : 'No disponible'}
- **Crecimiento Poblacional (5 años)**: ${property.population_growth_5yr ? property.population_growth_5yr + '%' : 'No disponible'}
- **Índice de Crimen**: ${property.crime_index ? property.crime_index + '/100 (menor=más seguro)' : 'No disponible'}
- **DOM Promedio en el Área**: ${property.days_on_market_avg ? property.days_on_market_avg + ' días' : 'No disponible'}
- **Tasa de Vacancia del Vecindario**: ${property.neighborhood_vacancy_rate ? property.neighborhood_vacancy_rate + '%' : 'Desconocida'}
- **Crecimiento de Precios (3 años)**: ${property.price_growth_3yr ? property.price_growth_3yr + '%' : 'Desconocido'}

## Indicadores de Motivación del Vendedor
- **Años de Propiedad**: ${property.owner_tenure_years || 'Desconocido'}
- **Propietario Ausente**: ${property.is_absentee_owner ? 'Sí' : 'No'}
- **En Foreclosure**: ${property.is_foreclosure ? 'Sí' : 'No'}
- **Probate/Herencia**: ${property.is_probate ? 'Sí' : 'No'}
- **Delinquencia Fiscal**: ${property.tax_delinquent ? 'Sí - $' + (property.tax_debt || 0).toLocaleString() : 'No'}
- **Historial de Evictions**: ${property.eviction_count || 0}
- **Liens Activos**: ${property.active_liens_count || 0}
- **Edad de Hipoteca**: ${property.mortgage_age_years ? property.mortgage_age_years + ' años' : 'Desconocida'}

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
- SI HAY DATOS DE COMPS, úsalos para calcular ARV y ofertas con mayor precisión
- SI HAY DATOS DE MERCADO (walk score, escuelas, income), úsalos para evaluar el potencial de la zona

Para calcular recomendaciones de oferta:
1. Si hay comps, usa el promedio de $/sqft × sqft de la propiedad como ARV base
2. MAO = ARV × 70% - Costo de Reparación
3. Oferta óptima = MAO - Spread deseado ($10K-$30K típicamente)
4. Si no hay comps, usa el ARV proporcionado o indica que se necesitan comps

Tu respuesta debe ser un JSON válido con la siguiente estructura exacta (sin markdown, solo JSON puro):
{
  "investment_analysis": {
    "roi_potential": "string con análisis de ROI potencial basado en datos disponibles",
    "cap_rate_estimate": "string con estimación de cap rate usando renta estimada si disponible",
    "cash_flow_projection": "string con proyección de cash flow mensual si hay datos de renta",
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
    "market_trend": "string con tendencia del mercado local basada en datos disponibles",
    "investment_potential": "string con potencial de inversión del área",
    "comparable_insight": "string con insights de los comps proporcionados o indicar que faltan",
    "exit_strategy_recommendations": ["array de estrategias de salida recomendadas"]
  },
  "recommendations": {
    "offer_range": {
      "min": number (oferta mínima calculada),
      "max": number (oferta máxima calculada),
      "optimal": number (oferta óptima recomendada)
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
        comps_used: compsSummary?.count || 0,
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
