import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PropertyAnalysis {
  investment_analysis: {
    roi_potential: string;
    cap_rate_estimate: string;
    cash_flow_projection: string;
    risk_level: 'bajo' | 'medio' | 'alto';
    risk_factors: string[];
    opportunity_score: number;
  };
  seller_motivation: {
    motivation_level: 'baja' | 'media' | 'alta' | 'muy_alta';
    key_indicators: string[];
    negotiation_strategy: string;
    urgency_assessment: string;
  };
  neighborhood_analysis: {
    market_trend: string;
    investment_potential: string;
    comparable_insight: string;
    exit_strategy_recommendations: string[];
  };
  recommendations: {
    offer_range: {
      min: number;
      max: number;
      optimal: number;
    };
    action_items: string[];
    due_diligence_checklist: string[];
    deal_verdict: 'COMPRAR' | 'NEGOCIAR' | 'PASAR' | 'INVESTIGAR_MAS';
  };
  executive_summary: string;
}

export interface SavedAnalysis {
  id: string;
  lead_id: string;
  property_id: string;
  analysis: PropertyAnalysis;
  executive_summary: string | null;
  deal_verdict: string | null;
  opportunity_score: number | null;
  risk_level: string | null;
  motivation_level: string | null;
  offer_min: number | null;
  offer_max: number | null;
  offer_optimal: number | null;
  created_at: string;
  created_by: string | null;
}

export interface AnalysisResult {
  success: boolean;
  analysis: PropertyAnalysis;
  generated_at: string;
}

// Hook to fetch saved analyses for a lead
export function usePropertyAnalyses(leadId: string | undefined) {
  return useQuery({
    queryKey: ['property-analyses', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('property_analyses')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SavedAnalysis[];
    },
    enabled: !!leadId,
  });
}

// Hook to fetch the latest analysis for a lead
export function useLatestPropertyAnalysis(leadId: string | undefined) {
  return useQuery({
    queryKey: ['property-analysis-latest', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('property_analyses')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as SavedAnalysis | null;
    },
    enabled: !!leadId,
  });
}

// Hook for generating and saving analysis
export function usePropertyAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const saveAnalysis = useMutation({
    mutationFn: async ({
      leadId,
      propertyId,
      analysis,
    }: {
      leadId: string;
      propertyId: string;
      analysis: PropertyAnalysis;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('property_analyses')
        .insert({
          lead_id: leadId,
          property_id: propertyId,
          analysis: analysis as any,
          executive_summary: analysis.executive_summary,
          deal_verdict: analysis.recommendations.deal_verdict,
          opportunity_score: analysis.investment_analysis.opportunity_score,
          risk_level: analysis.investment_analysis.risk_level,
          motivation_level: analysis.seller_motivation.motivation_level,
          offer_min: analysis.recommendations.offer_range.min,
          offer_max: analysis.recommendations.offer_range.max,
          offer_optimal: analysis.recommendations.offer_range.optimal,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-analyses', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['property-analysis-latest', variables.leadId] });
    },
  });

  const analyzeProperty = async (property: any, lead: any): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-property', {
        body: { property, lead }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        if (data.error.includes('429') || data.error.includes('Límite')) {
          toast.error('Límite de solicitudes excedido. Intenta en unos minutos.');
        } else if (data.error.includes('402') || data.error.includes('Créditos')) {
          toast.error('Créditos de IA agotados.');
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      // Save to database
      if (lead.id && property.id) {
        await saveAnalysis.mutateAsync({
          leadId: lead.id,
          propertyId: property.id,
          analysis: data.analysis,
        });
      }

      toast.success('Análisis de IA completado y guardado');
      return data as AnalysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al analizar propiedad';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeProperty,
    isAnalyzing,
    error,
    isSaving: saveAnalysis.isPending,
  };
}
