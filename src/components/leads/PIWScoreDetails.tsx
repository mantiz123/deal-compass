import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { KScoreGauge } from "@/components/dashboard/KScoreGauge";
import { SendDealPackageSheet } from "@/components/buyers/SendDealPackageSheet";
import { Lead } from "@/hooks/useLeads";
import { 
  Brain, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Home,
  User,
  DollarSign,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";

interface PIWScoreDetailsProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecalculate: () => void;
  isCalculating: boolean;
}

export function PIWScoreDetails({ lead, open, onOpenChange, onRecalculate, isCalculating }: PIWScoreDetailsProps) {
  const [showDealPackage, setShowDealPackage] = useState(false);
  
  if (!lead) return null;

  const factors = lead.piw_score_factors as any;
  const property = lead.property;
  
  const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    hot: { label: "🔥 HOT - Acción Inmediata", color: "text-accent", bg: "bg-accent/10" },
    warm: { label: "⚡ WARM - Seguimiento 48h", color: "text-warning", bg: "bg-warning/10" },
    cold: { label: "❄️ COLD - Nurture Campaign", color: "text-muted-foreground", bg: "bg-secondary" },
  };

  const priority = factors?.priority || (
    (lead.piw_score || 0) >= 80 ? 'hot' : 
    (lead.piw_score || 0) >= 50 ? 'warm' : 'cold'
  );

  const isHotLead = priority === 'hot' || (lead.piw_score && lead.piw_score >= 80);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análisis K-Score
          </SheetTitle>
          <SheetDescription>
            {property?.address}, {property?.city}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Main Score */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {lead.piw_score !== null ? (
                <KScoreGauge score={lead.piw_score} size="lg" />
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Score no calculado</p>
                </div>
              )}
            </div>
            <Button 
              onClick={onRecalculate} 
              variant="outline"
              disabled={isCalculating}
            >
              {isCalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalcular
                </>
              )}
            </Button>
          </div>

          {/* Priority Badge */}
          {factors?.priority && (
            <div className={`rounded-lg p-4 ${priorityConfig[priority]?.bg}`}>
              <p className={`font-semibold ${priorityConfig[priority]?.color}`}>
                {priorityConfig[priority]?.label}
              </p>
              {factors?.recommended_action && (
                <p className="text-sm mt-1">{factors.recommended_action}</p>
              )}
            </div>
          )}

          {/* Send Deal Package Button - Only for HOT leads */}
          {isHotLead && lead.piw_score !== null && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setShowDealPackage(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Deal Package a Compradores
              <Users className="h-4 w-4 ml-2" />
            </Button>
          )}

          {/* Score Breakdown */}
          {factors && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Desglose del Score
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Motivación del Vendedor</span>
                      <span className="font-medium">{factors.seller_motivation_score || 0}/40</span>
                    </div>
                    <Progress value={((factors.seller_motivation_score || 0) / 40) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Viabilidad Financiera</span>
                      <span className="font-medium">{factors.financial_viability_score || 0}/35</span>
                    </div>
                    <Progress value={((factors.financial_viability_score || 0) / 35) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Facilidad de Cierre</span>
                      <span className="font-medium">{factors.closing_difficulty_score || 0}/25</span>
                    </div>
                    <Progress value={((factors.closing_difficulty_score || 0) / 25) * 100} className="h-2" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Key Indicators */}
          {factors?.key_indicators && factors.key_indicators.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Indicadores Clave
                </h4>
                <ul className="space-y-2">
                  {factors.key_indicators.map((indicator: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Risks */}
          {factors?.risks && factors.risks.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Riesgos Identificados
                </h4>
                <ul className="space-y-2">
                  {factors.risks.map((risk: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Analysis */}
          {factors?.analysis && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Análisis IA</h4>
                <p className="text-sm text-muted-foreground">{factors.analysis}</p>
              </div>
            </>
          )}

          {/* Property Details */}
          <Separator />
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" />
              Datos de la Propiedad
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {property?.arv && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ARV</span>
                  <span className="font-medium">${property.arv.toLocaleString()}</span>
                </div>
              )}
              {property?.mao && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MAO</span>
                  <span className="font-medium text-success">${property.mao.toLocaleString()}</span>
                </div>
              )}
              {property?.repair_cost && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reparaciones</span>
                  <span className="font-medium text-warning">${property.repair_cost.toLocaleString()}</span>
                </div>
              )}
              {property?.equity_percent && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equity</span>
                  <span className="font-medium">{property.equity_percent}%</span>
                </div>
              )}
            </div>

            {/* Motivation Indicators */}
            <div className="mt-4 flex flex-wrap gap-2">
              {property?.is_absentee_owner && <Badge variant="info">Absentee Owner</Badge>}
              {property?.tax_delinquent && <Badge variant="warning">Tax Delinquent</Badge>}
              {property?.is_foreclosure && <Badge variant="accent">Foreclosure</Badge>}
              {property?.is_probate && <Badge variant="glow">Probate</Badge>}
              {property?.owner_type === 'corporation' && <Badge variant="secondary">Corporate Owner</Badge>}
            </div>
          </div>

          {/* Owner Info */}
          {property?.owner_name && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </h4>
                <p className="font-medium">{property.owner_name}</p>
                {property.owner_phone && (
                  <p className="text-sm text-muted-foreground">{property.owner_phone}</p>
                )}
              </div>
            </>
          )}

          {/* Calculated Timestamp */}
          {factors?.calculated_at && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Calculado: {new Date(factors.calculated_at).toLocaleString()}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Deal Package Sheet */}
      <SendDealPackageSheet 
        lead={lead}
        open={showDealPackage}
        onOpenChange={setShowDealPackage}
      />
    </Sheet>
  );
}
