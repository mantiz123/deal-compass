import { Link } from 'react-router-dom';
import { useLeads, useMarkLeadContacted } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KScoreGauge } from "./KScoreGauge";
import { Phone, Mail, ChevronRight, Flame, DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { isToday } from 'date-fns';

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const getIndicatorBadges = (property: any) => {
  if (!property) return [];
  const badges: { label: string; variant: string }[] = [];

  if (property.absentee_type === 'out_of_state') badges.push({ label: '🏠 OUT', variant: 'accent' });
  if (property.is_vacant) badges.push({ label: '🏚️ VAC', variant: 'warning' });
  if (property.is_foreclosure) badges.push({ label: '🏚️ FORECL', variant: 'accent' });
  if (property.tax_delinquent) badges.push({ label: '💰 TAX', variant: 'warning' });
  if (property.is_probate) badges.push({ label: '⚖️ PROB', variant: 'glow' });
  if (property.equity_percent != null && Number(property.equity_percent) >= 100) badges.push({ label: '💎 FREE', variant: 'success' });

  const ad = property.auction_date;
  if (ad) {
    const days = Math.ceil((new Date(ad).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > 0 && days <= 30) badges.push({ label: `🚨 ${days}d`, variant: 'destructive' });
    else if (days > 30 && days <= 90) badges.push({ label: `⏰ ${days}d`, variant: 'warning' });
  }

  if (property.owner_tenure_years != null && property.owner_tenure_years >= 10) badges.push({ label: `🕐 ${property.owner_tenure_years}Y`, variant: 'secondary' });
  if (property.active_liens_count > 0) badges.push({ label: `🔗 ${property.active_liens_count}L`, variant: 'destructive' });

  return badges;
};

export const LeadsDelDia = () => {
  const { data: result, isLoading } = useLeads();
  const markContacted = useMarkLeadContacted();
  const leads = result?.data;

  const leadsWithSpread = leads
    ?.filter(lead => lead.piw_score && lead.piw_score > 0)
    .map(lead => {
      const property = lead.property;
      const arv = Number(property?.arv) || 0;
      const repairCost = Number(property?.repair_cost) || 0;
      const savedMao = Number(property?.mao) || 0;
      const mao = savedMao || (arv > 0 ? Math.round(arv * 0.7 - repairCost) : 0);
      const acquisitionCost = Number(lead.offer_amount) || Number(lead.listing_price) || Number(property?.last_sale_price) || 0;
      const spread = mao > 0 && acquisitionCost > 0 ? mao - acquisitionCost : 0;
      const mortgageBalance = Number((property as any)?.mortgage_balance) || 0;
      const netEquity = arv > 0 && mortgageBalance > 0 ? arv - mortgageBalance : 0;

      return { ...lead, spread, netEquity, mao };
    })
    .sort((a, b) => {
      if (b.spread !== a.spread) return b.spread - a.spread;
      return (b.piw_score || 0) - (a.piw_score || 0);
    })
    .slice(0, 10) || [];

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hotCount = leadsWithSpread.filter(l => (l.piw_score || 0) >= 80).length;
  const contactedCount = leadsWithSpread.filter(l => l.last_contact_at && isToday(new Date(l.last_contact_at))).length;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Centro de Acción</CardTitle>
            <Badge variant="accent" className="ml-1">{hotCount} 🔥 HOT</Badge>
            <Badge variant="secondary" className="ml-1">{contactedCount}/{leadsWithSpread.length} contactados</Badge>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/leads" className="flex items-center gap-1">
              Ver Todos <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Top 10 oportunidades ordenadas por spread potencial — llama de arriba hacia abajo
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {leadsWithSpread.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay leads con K-Score calculado</p>
            <Button variant="link" size="sm" asChild className="mt-2">
              <Link to="/leads">Calcular K-Scores</Link>
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-2">
              {leadsWithSpread.map((lead, index) => {
                const property = lead.property;
                const spreadColor = lead.spread > 0 ? "text-success" : lead.spread < 0 ? "text-destructive" : "text-muted-foreground";
                const contactedToday = lead.last_contact_at && isToday(new Date(lead.last_contact_at));
                const priority = (lead.piw_score || 0) >= 80 ? 'hot' : (lead.piw_score || 0) >= 50 ? 'warm' : 'cold';
                const indicators = getIndicatorBadges(property);

                // Fee rango
                let feeLabel = '';
                if (lead.spread > 0) {
                  const feeMin = Math.max(5000, Math.round(lead.spread * 0.3));
                  const feeMax = Math.round(lead.spread * 0.6);
                  if (feeMax >= 5000) {
                    feeLabel = `$${(feeMin / 1000).toFixed(0)}K-${(feeMax / 1000).toFixed(0)}K`;
                  }
                }

                return (
                  <div
                    key={lead.id}
                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      contactedToday
                        ? "border-success/30 bg-success/5 opacity-60"
                        : priority === 'hot'
                        ? "border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50"
                        : "border-border/50 bg-card/50 hover:bg-accent/10 hover:border-primary/30"
                    }`}
                  >
                    {/* Rank */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      priority === 'hot' ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'
                    }`}>
                      {index + 1}
                    </div>

                    {/* K-Score */}
                    <div className="flex-shrink-0">
                      <KScoreGauge score={lead.piw_score || 0} size="sm" />
                    </div>

                    {/* Property Info + Indicators */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {property?.address}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{property?.city}</span>
                        {indicators.length > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            {indicators.slice(0, 3).map((ind, i) => (
                              <Badge key={i} variant={ind.variant as any} className="text-[9px] px-1 py-0 h-4">
                                {ind.label}
                              </Badge>
                            ))}
                            {indicators.length > 3 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                    +{indicators.length - 3}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="flex gap-1 flex-wrap">
                                    {indicators.slice(3).map((ind, i) => (
                                      <Badge key={i} variant={ind.variant as any} className="text-[9px]">
                                        {ind.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Net Equity */}
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      {lead.netEquity > 0 ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <div>
                              <div className={`text-sm font-semibold ${lead.netEquity > 100000 ? 'text-success' : lead.netEquity > 50000 ? 'text-accent' : 'text-foreground'}`}>
                                {formatCurrency(lead.netEquity)}
                              </div>
                              <span className="text-[10px] text-muted-foreground">equity</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">ARV - Hipoteca = Net Equity</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Spread */}
                    <div className="flex-shrink-0 text-right">
                      <Tooltip>
                        <TooltipTrigger>
                          <div>
                            <div className={`flex items-center gap-0.5 font-semibold ${spreadColor}`}>
                              <DollarSign className="h-3 w-3" />
                              <span className="text-sm">{formatCurrency(Math.abs(lead.spread))}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">spread</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            MAO ({formatCurrency(lead.mao)}) - Costo adq.
                            {feeLabel && <><br />Fee estimado: <strong>{feeLabel}</strong></>}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {property?.owner_phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${property.owner_phone}`;
                          }}
                        >
                          <Phone className="h-3.5 w-3.5 text-success" />
                        </Button>
                      )}
                      {property?.owner_email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${property.owner_email}`;
                          }}
                        >
                          <Mail className="h-3.5 w-3.5 text-info" />
                        </Button>
                      )}
                    </div>

                    {/* Contacted Today Button */}
                    <div className="flex-shrink-0">
                      {contactedToday ? (
                        <div className="flex items-center gap-1 text-success text-xs">
                          <CheckCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">✓</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            markContacted.mutate(lead.id);
                          }}
                          disabled={markContacted.isPending}
                        >
                          <Clock className="h-3 w-3" />
                          <span className="hidden sm:inline">Hecho</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
};
