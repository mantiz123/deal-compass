import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  usePropertyAnalysis, 
  PropertyAnalysis 
} from '@/hooks/usePropertyAnalysis';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  Lightbulb,
  Shield,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface AIPropertyInsightsProps {
  lead: Lead;
}

const riskColors = {
  bajo: 'text-success',
  medio: 'text-warning',
  alto: 'text-destructive',
};

const motivationColors = {
  baja: 'secondary',
  media: 'warning',
  alta: 'accent',
  muy_alta: 'destructive',
} as const;

const verdictConfig = {
  COMPRAR: { color: 'bg-success text-success-foreground', icon: CheckCircle, label: 'COMPRAR' },
  NEGOCIAR: { color: 'bg-warning text-warning-foreground', icon: Target, label: 'NEGOCIAR' },
  PASAR: { color: 'bg-destructive text-destructive-foreground', icon: XCircle, label: 'PASAR' },
  INVESTIGAR_MAS: { color: 'bg-secondary text-secondary-foreground', icon: Lightbulb, label: 'INVESTIGAR MÁS' },
};

export function AIPropertyInsights({ lead }: AIPropertyInsightsProps) {
  const { analyzeProperty, isAnalyzing, analysis, error, clearAnalysis } = usePropertyAnalysis();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!lead.property) return;
    
    await analyzeProperty(lead.property, {
      piw_score: lead.piw_score,
      listing_price: lead.listing_price,
      offer_amount: lead.offer_amount,
      assignment_fee: lead.assignment_fee,
      status: lead.status,
    });
    setHasAnalyzed(true);
  };

  const handleRefresh = () => {
    clearAnalysis();
    handleAnalyze();
  };

  if (!hasAnalyzed && !analysis) {
    return (
      <Card variant="glass" className="p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Análisis de IA para Inversores</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Obtén un análisis profesional completo: ROI potencial, motivación del vendedor, 
              análisis de vecindario y recomendaciones de inversión.
            </p>
          </div>
          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar Análisis de IA
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="space-y-4">
        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </Card>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="glass" className="p-4">
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <Card variant="glass" className="p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error en el Análisis</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleAnalyze} variant="outline">
          Reintentar
        </Button>
      </Card>
    );
  }

  if (!analysis) return null;

  const verdict = verdictConfig[analysis.recommendations.deal_verdict];
  const VerdictIcon = verdict.icon;

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <Card variant="glass" className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${verdict.color}`}>
              <VerdictIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Veredicto del Deal</h3>
                <Badge className={verdict.color}>{verdict.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.executive_summary}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Regenerar análisis">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Offer Range */}
      {analysis.recommendations.offer_range.optimal > 0 && (
        <Card variant="glass" className="p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-success" />
            <h4 className="font-semibold">Rango de Oferta Recomendado</h4>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Mínimo</p>
              <p className="text-lg font-bold">${analysis.recommendations.offer_range.min.toLocaleString()}</p>
            </div>
            <div className="bg-success/10 rounded-lg p-2">
              <p className="text-xs text-success">Óptimo</p>
              <p className="text-xl font-bold text-success">${analysis.recommendations.offer_range.optimal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Máximo</p>
              <p className="text-lg font-bold">${analysis.recommendations.offer_range.max.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Investment Analysis */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Análisis de Inversión</h4>
            <Badge variant="outline" className="ml-auto">
              {analysis.investment_analysis.opportunity_score}/10
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">ROI Potencial</p>
              <p>{analysis.investment_analysis.roi_potential}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cap Rate Estimado</p>
              <p>{analysis.investment_analysis.cap_rate_estimate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cash Flow</p>
              <p>{analysis.investment_analysis.cash_flow_projection}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Nivel de Riesgo:</p>
              <span className={`font-semibold uppercase ${riskColors[analysis.investment_analysis.risk_level]}`}>
                {analysis.investment_analysis.risk_level}
              </span>
            </div>
            {analysis.investment_analysis.risk_factors.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Factores de Riesgo</p>
                <ul className="text-xs space-y-1">
                  {analysis.investment_analysis.risk_factors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* Seller Motivation */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-accent" />
            <h4 className="font-semibold">Motivación del Vendedor</h4>
            <Badge variant={motivationColors[analysis.seller_motivation.motivation_level]} className="ml-auto">
              {analysis.seller_motivation.motivation_level.replace('_', ' ')}
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Evaluación de Urgencia</p>
              <p>{analysis.seller_motivation.urgency_assessment}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estrategia de Negociación</p>
              <p>{analysis.seller_motivation.negotiation_strategy}</p>
            </div>
            {analysis.seller_motivation.key_indicators.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Indicadores Clave</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.seller_motivation.key_indicators.map((indicator, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Neighborhood Analysis */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-warning" />
            <h4 className="font-semibold">Análisis de Vecindario</h4>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tendencia del Mercado</p>
              <p>{analysis.neighborhood_analysis.market_trend}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Potencial de Inversión</p>
              <p>{analysis.neighborhood_analysis.investment_potential}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Insight de Comparables</p>
              <p>{analysis.neighborhood_analysis.comparable_insight}</p>
            </div>
            {analysis.neighborhood_analysis.exit_strategy_recommendations.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estrategias de Salida</p>
                <ul className="text-xs space-y-1">
                  {analysis.neighborhood_analysis.exit_strategy_recommendations.map((strategy, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-success mt-0.5 shrink-0" />
                      {strategy}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* Recommendations */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-success" />
            <h4 className="font-semibold">Recomendaciones</h4>
          </div>
          <div className="space-y-3 text-sm">
            {analysis.recommendations.action_items.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Acciones Inmediatas</p>
                <ul className="space-y-1">
                  {analysis.recommendations.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.recommendations.due_diligence_checklist.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Diligence Checklist</p>
                <ul className="text-xs space-y-1">
                  {analysis.recommendations.due_diligence_checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
