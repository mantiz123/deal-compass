import { Link } from 'react-router-dom';
import { useLeads, useMarkLeadContacted } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PIWScoreGauge } from "./PIWScoreGauge";
import { Phone, Mail, ChevronRight, Flame, DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { format, isToday } from 'date-fns';

export const LeadsDelDia = () => {
  const { data: leads, isLoading } = useLeads();
  const markContacted = useMarkLeadContacted();

  // Calculate spread and filter/sort leads
  const leadsWithSpread = leads
    ?.filter(lead => lead.piw_score && lead.piw_score > 0)
    .map(lead => {
      const property = lead.property;
      const arv = property?.arv || 0;
      const mao = property?.mao || 0;
      const acquisitionCost = lead.offer_amount || lead.listing_price || property?.last_sale_price || 0;
      const spread = mao > 0 && acquisitionCost > 0 ? mao - acquisitionCost : 0;
      
      return {
        ...lead,
        spread,
        hasValidSpread: spread !== 0
      };
    })
    .sort((a, b) => {
      // Primary: sort by spread descending
      if (b.spread !== a.spread) return b.spread - a.spread;
      // Secondary: sort by PIW score descending
      return (b.piw_score || 0) - (a.piw_score || 0);
    })
    .slice(0, 10) || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Leads del Día</CardTitle>
            <Badge variant="secondary" className="ml-2">Top 10</Badge>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/leads" className="flex items-center gap-1">
              Ver Todos <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Los mejores leads para contactar hoy, ordenados por spread potencial
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {leadsWithSpread.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay leads con PIW Score calculado</p>
            <Button variant="link" size="sm" asChild className="mt-2">
              <Link to="/leads">Calcular PIW Scores</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {leadsWithSpread.map((lead, index) => {
              const property = lead.property;
              const spreadColor = lead.spread > 0 ? "text-success" : lead.spread < 0 ? "text-destructive" : "text-muted-foreground";
              const contactedToday = lead.last_contact_at && isToday(new Date(lead.last_contact_at));
              
              return (
                <div 
                  key={lead.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    contactedToday 
                      ? "border-success/30 bg-success/5" 
                      : "border-border/50 bg-card/50 hover:bg-accent/10 hover:border-primary/30"
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>

                  {/* PIW Score */}
                  <div className="flex-shrink-0">
                    <PIWScoreGauge score={lead.piw_score || 0} size="sm" />
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {property?.address}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{property?.city}, {property?.state}</span>
                      {property?.owner_name && (
                        <>
                          <span>•</span>
                          <span className="truncate">{property.owner_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Spread */}
                  <div className="flex-shrink-0 text-right">
                    <div className={`flex items-center gap-1 font-semibold ${spreadColor}`}>
                      <DollarSign className="h-3 w-3" />
                      <span className="text-sm">{formatCurrency(Math.abs(lead.spread))}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">spread</span>
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
                        <span className="hidden sm:inline">Contactado</span>
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
                        <span className="hidden sm:inline">Contactado</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
