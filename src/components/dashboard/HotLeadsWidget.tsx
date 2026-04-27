import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { Flame, AlertTriangle, Phone, PhoneOff, Search, ExternalLink, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast } from 'date-fns';
import type { Lead } from '@/hooks/useLeads';

function useHotLeads() {
  return useQuery({
    queryKey: ['hot-leads-widget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, property:properties(*)')
        .is('archived_at', null)
        .gte('piw_score', 65)
        .order('piw_score', { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      return (data as Lead[]).filter(lead => {
        const p = lead.property;
        if (!p) return false;
        // High equity OR distress signals
        const highEquity = p.equity_percent != null && Number(p.equity_percent) >= 40;
        const distress = p.is_foreclosure || p.is_vacant || p.tax_delinquent || p.is_probate;
        return highEquity || distress;
      });
    },
  });
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

function needsSkipTracing(property: any): boolean {
  if (!property) return true;
  const hasPhone = property.owner_phone || property.phone_2 || property.phone_3 || property.phone_4 || property.phone_5;
  return !hasPhone;
}

function allPhonesDNC(property: any): boolean {
  if (!property) return false;
  const phones = [
    { phone: property.owner_phone, dnc: property.phone_1_dnc },
    { phone: property.phone_2, dnc: property.phone_2_dnc },
    { phone: property.phone_3, dnc: property.phone_3_dnc },
    { phone: property.phone_4, dnc: property.phone_4_dnc },
    { phone: property.phone_5, dnc: property.phone_5_dnc },
  ].filter(p => p.phone);
  
  if (phones.length === 0) return false;
  return phones.every(p => p.dnc);
}

function getDistressBadges(property: any) {
  const badges: { label: string; shortLabel: string; color: string }[] = [];
  if (!property) return badges;
  
  // Auction urgency badge
  if (property.is_foreclosure && property.auction_date) {
    const daysUntil = differenceInDays(new Date(property.auction_date), new Date());
    const expired = isPast(new Date(property.auction_date));
    if (expired) {
      badges.push({ label: '⚠️ SUBASTA VENCIDA', shortLabel: '⚠️ VENCIDA', color: 'bg-destructive/30 text-destructive border-destructive/40 animate-pulse' });
    } else if (daysUntil <= 7) {
      badges.push({ label: `🔨 ${daysUntil}d SUBASTA`, shortLabel: `🔨 ${daysUntil}d`, color: 'bg-destructive/20 text-destructive border-destructive/30' });
    } else if (daysUntil <= 30) {
      badges.push({ label: `🔨 ${daysUntil}d SUBASTA`, shortLabel: `🔨 ${daysUntil}d`, color: 'bg-warning/20 text-warning border-warning/30' });
    }
  }
  
  if (property.is_foreclosure) badges.push({ label: '🏚️ FORECL', shortLabel: '🏚️ FC', color: 'bg-destructive/20 text-destructive border-destructive/30' });
  if (property.is_vacant) badges.push({ label: '🏚️ VACANT', shortLabel: '🏚️ VAC', color: 'bg-warning/20 text-warning border-warning/30' });
  if (property.tax_delinquent) badges.push({ label: '💰 TAX', shortLabel: '💰 TAX', color: 'bg-warning/20 text-warning border-warning/30' });
  if (property.is_probate) badges.push({ label: '⚖️ PROBATE', shortLabel: '⚖️ PRB', color: 'bg-accent/20 text-accent border-accent/30' });
  if (property.equity_percent != null && Number(property.equity_percent) >= 100) badges.push({ label: '💎 FREE&CLEAR', shortLabel: '💎 F&C', color: 'bg-success/20 text-success border-success/30' });
  if (property.do_not_mail) badges.push({ label: '🚫 DNM', shortLabel: '🚫 DNM', color: 'bg-muted text-muted-foreground border-border' });
  
  return badges;
}

export function HotLeadsWidget() {
  const { data: hotLeads, isLoading } = useHotLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  if (isLoading) {
    return (
      <Card variant="glow">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const needsAction = hotLeads?.filter(l => needsSkipTracing(l.property) || allPhonesDNC(l.property)) || [];
  const hasContact = hotLeads?.filter(l => !needsSkipTracing(l.property) && !allPhonesDNC(l.property)) || [];

  return (
    <>
      <Card variant="glow" className="overflow-hidden">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg min-w-0">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Hot Leads</span>
                <span className="hidden sm:inline">Hot Leads — Acción Requerida</span>
              </span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] sm:text-xs font-mono flex-shrink-0">
              {hotLeads?.length || 0}
            </Badge>
          </div>
          {needsAction.length > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-[11px] sm:text-xs text-warning min-w-0">
                <strong>{needsAction.length} HOT</strong> sin contacto — skip-tracing
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6 overflow-hidden">
          {(!hotLeads || hotLeads.length === 0) ? (
            <div className="text-center py-8">
              <Flame className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hay leads HOT actualmente</p>
              <p className="text-xs text-muted-foreground mt-1">Los leads con PIW ≥65 + distress aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Leads that need skip-tracing first */}
              {needsAction.map((lead) => (
                <HotLeadRow
                  key={lead.id}
                  lead={lead}
                  needsSkipTrace
                  onClick={() => setSelectedLead(lead)}
                />
              ))}

              {/* Leads with contact info */}
              {hasContact.map((lead) => (
                <HotLeadRow
                  key={lead.id}
                  lead={lead}
                  onClick={() => setSelectedLead(lead)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLead && (
        <LeadDetailSheet
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
        />
      )}
    </>
  );
}

function HotLeadRow({
  lead,
  needsSkipTrace = false,
  onClick,
}: {
  lead: Lead;
  needsSkipTrace?: boolean;
  onClick: () => void;
}) {
  const p = lead.property;
  const badges = getDistressBadges(p);
  const equity = p?.equity_percent != null ? Number(p.equity_percent) : null;
  const arv = p?.arv ? Number(p.arv) : null;
  const mortgageBalance = p?.mortgage_balance ? Number(p.mortgage_balance) : null;
  const netEquity = arv && mortgageBalance ? arv - mortgageBalance : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-2 sm:p-3 transition-all hover:scale-[1.01] overflow-hidden",
        needsSkipTrace
          ? "border-warning/40 bg-warning/5 hover:bg-warning/10 hover:border-warning/60"
          : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0 w-full">
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Address & Score */}
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            <span className="font-semibold text-xs sm:text-sm truncate min-w-0 flex-1">
              {p?.address || 'Sin dirección'}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] sm:text-xs font-mono flex-shrink-0 px-1 sm:px-1.5 py-0",
                (lead.piw_score || 0) >= 75
                  ? "border-warning/50 text-warning bg-warning/10"
                  : "border-primary/50 text-primary bg-primary/10"
              )}
            >
              {lead.piw_score}
            </Badge>
          </div>

          {/* City & Owner */}
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 truncate">
            <span>{p?.city}, {p?.state} {p?.zip_code}</span>
            {p?.owner_name && <span className="hidden sm:inline"> • {p.owner_name}</span>}
          </p>

          {/* Distress Badges */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            {badges.slice(0, 3).map((b, i) => (
              <Badge key={i} className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", b.color)}>
                <span className="hidden sm:inline">{b.label}</span>
                <span className="sm:hidden">{b.shortLabel}</span>
              </Badge>
            ))}
            {badges.length > 3 && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 sm:hidden">
                +{badges.length - 3}
              </Badge>
            )}
          </div>

          {/* Financial Row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
            {equity !== null && (
              <span className={cn(equity >= 60 ? "text-success" : "")}>
                Eq: {equity}%
              </span>
            )}
            {netEquity !== null && netEquity > 0 && (
              <span className="text-success font-medium">
                Net: {formatCurrency(netEquity)}
              </span>
            )}
            {arv && <span className="hidden sm:inline">ARV: {formatCurrency(arv)}</span>}
          </div>
        </div>

        {/* Right side: Contact status (icon-only on mobile) */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {needsSkipTrace ? (
            <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] whitespace-nowrap px-1 sm:px-2 py-0.5">
              <Search className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">SKIP</span>
            </Badge>
          ) : allPhonesDNC(p) ? (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] whitespace-nowrap px-1 sm:px-2 py-0.5">
              <PhoneOff className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">DNC</span>
            </Badge>
          ) : (
            <Badge className="bg-success/20 text-success border-success/30 text-[10px] whitespace-nowrap px-1 sm:px-2 py-0.5">
              <Phone className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">OK</span>
            </Badge>
          )}
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
