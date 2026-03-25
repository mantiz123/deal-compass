import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useLatestPropertyAnalysis, SavedAnalysis } from "@/hooks/usePropertyAnalysis";
import { useCompsSummary } from "@/hooks/usePropertyComps";
import { GitCompare, Home, DollarSign, TrendingUp, AlertTriangle, Target, ArrowRight } from "lucide-react";
import { KScoreGauge } from "@/components/dashboard/KScoreGauge";

interface PropertyColumnProps {
  lead: Lead | null;
  analysis: SavedAnalysis | null;
  compsSummary: any;
  isLoading: boolean;
}

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const PropertyColumn = ({ lead, analysis, compsSummary, isLoading }: PropertyColumnProps) => {
  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
        <p>Selecciona una propiedad</p>
      </div>
    );
  }

  const property = lead.property;
  const analysisData = analysis?.analysis;

  return (
    <div className="flex-1 space-y-4 p-4">
      {/* Header */}
      <div className="text-center pb-4 border-b border-border">
        <h3 className="font-semibold text-lg truncate">{property?.address}</h3>
        <p className="text-sm text-muted-foreground">{property?.city}, {property?.state} {property?.zip_code}</p>
        <div className="flex justify-center mt-2">
          <PIWScoreGauge score={lead.piw_score || 0} size="sm" />
        </div>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            Financiero
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ARV</span>
            <span className="font-medium">{formatCurrency(property?.arv)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">MAO</span>
            <span className="font-medium">{formatCurrency(property?.mao)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Repair Cost</span>
            <span className="font-medium">{formatCurrency(property?.repair_cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Listing Price</span>
            <span className="font-medium">{formatCurrency(lead.listing_price)}</span>
          </div>
          {compsSummary && (
            <>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Comp Price</span>
                  <span className="font-medium">{formatCurrency(compsSummary.avg_sale_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg $/sqft</span>
                  <span className="font-medium">${compsSummary.avg_price_per_sqft?.toFixed(0) || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"># Comps</span>
                  <span className="font-medium">{compsSummary.comp_count || 0}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Home className="h-4 w-4 text-info" />
            Detalles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <span className="font-medium">{property?.property_type || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Beds/Baths</span>
            <span className="font-medium">{property?.bedrooms || '-'}/{property?.bathrooms || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sqft</span>
            <span className="font-medium">{property?.sqft?.toLocaleString() || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Year Built</span>
            <span className="font-medium">{property?.year_built || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner</span>
            <span className="font-medium truncate max-w-[120px]">{property?.owner_name || '-'}</span>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {isLoading ? (
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : analysisData ? (
        <>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                Análisis IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Veredicto</span>
                <Badge variant={
                  analysis?.deal_verdict === 'COMPRAR' ? 'default' :
                  analysis?.deal_verdict === 'NEGOCIAR' ? 'secondary' :
                  analysis?.deal_verdict === 'PASAR' ? 'destructive' : 'outline'
                }>
                  {analysis?.deal_verdict || '-'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Oportunidad</span>
                <span className="font-medium">{analysis?.opportunity_score || '-'}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Riesgo</span>
                <Badge variant={
                  analysis?.risk_level === 'bajo' ? 'default' :
                  analysis?.risk_level === 'medio' ? 'secondary' : 'destructive'
                }>
                  {analysis?.risk_level || '-'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Motivación</span>
                <Badge variant={
                  analysis?.motivation_level === 'muy_alta' || analysis?.motivation_level === 'alta' ? 'default' :
                  analysis?.motivation_level === 'media' ? 'secondary' : 'outline'
                }>
                  {analysis?.motivation_level || '-'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Rango de Oferta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mínimo</span>
                <span className="font-medium">{formatCurrency(analysis?.offer_min)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Óptimo</span>
                <span className="font-medium text-success">{formatCurrency(analysis?.offer_optimal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Máximo</span>
                <span className="font-medium">{formatCurrency(analysis?.offer_max)}</span>
              </div>
            </CardContent>
          </Card>

          {analysisData.executive_summary && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analysisData.executive_summary}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin análisis de IA</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const PropertyComparisonSheet = () => {
  const [open, setOpen] = useState(false);
  const [leadId1, setLeadId1] = useState<string>('');
  const [leadId2, setLeadId2] = useState<string>('');
  
  const { data: result, isLoading: leadsLoading } = useLeads();
  const leads = result?.data;
  
  const lead1 = leads?.find(l => l.id === leadId1) || null;
  const lead2 = leads?.find(l => l.id === leadId2) || null;
  
  const { data: analysis1, isLoading: analysis1Loading } = useLatestPropertyAnalysis(leadId1 || undefined);
  const { data: analysis2, isLoading: analysis2Loading } = useLatestPropertyAnalysis(leadId2 || undefined);
  
  const { data: comps1 } = useCompsSummary(lead1?.property?.id);
  const { data: comps2 } = useCompsSummary(lead2?.property?.id);

  const leadsWithProperty = leads?.filter(l => l.property) || [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitCompare className="h-4 w-4" />
          Comparar
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparación de Propiedades
          </SheetTitle>
        </SheetHeader>
        
        {/* Property Selectors */}
        <div className="grid grid-cols-2 gap-4 p-4 border-b border-border bg-muted/30">
          <Select value={leadId1} onValueChange={setLeadId1}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar propiedad 1" />
            </SelectTrigger>
            <SelectContent>
              {leadsWithProperty.map((lead) => (
                <SelectItem key={lead.id} value={lead.id} disabled={lead.id === leadId2}>
                  {lead.property?.address} - {lead.property?.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={leadId2} onValueChange={setLeadId2}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar propiedad 2" />
            </SelectTrigger>
            <SelectContent>
              {leadsWithProperty.map((lead) => (
                <SelectItem key={lead.id} value={lead.id} disabled={lead.id === leadId1}>
                  {lead.property?.address} - {lead.property?.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparison Content */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="flex divide-x divide-border">
            <PropertyColumn 
              lead={lead1} 
              analysis={analysis1 || null}
              compsSummary={comps1}
              isLoading={analysis1Loading}
            />
            <PropertyColumn 
              lead={lead2} 
              analysis={analysis2 || null}
              compsSummary={comps2}
              isLoading={analysis2Loading}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
