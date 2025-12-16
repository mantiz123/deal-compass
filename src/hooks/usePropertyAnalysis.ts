import { useState } from 'react';
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

export interface AnalysisResult {
  success: boolean;
  analysis: PropertyAnalysis;
  generated_at: string;
}

export function usePropertyAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeProperty = async (property: any, lead: any) => {
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

      setAnalysis(data.analysis);
      toast.success('Análisis de IA completado');
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

  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
  };

  return {
    analyzeProperty,
    clearAnalysis,
    isAnalyzing,
    analysis,
    error
  };
}
