import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrgIdSafe, useOrganization } from "@/contexts/OrganizationContext";
import { useICAGuard } from "@/hooks/useICAGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Sparkles, X, ArrowRight } from "lucide-react";
import { RequestKCFYDialog } from "./RequestKCFYDialog";

const DISMISS_KEY = "kcfy-ready-banner-dismissed-at";
const DISMISS_HOURS = 24;

interface KCFYEligibleLead {
  id: string;
  piw_score: number | null;
  property: {
    address: string | null;
    city: string | null;
    state: string | null;
    arv: number | null;
    mao: number | null;
  } | null;
  hasActiveKCFY: boolean;
}

export function KCFYReadyBanner() {
  const orgId = useCurrentOrgIdSafe();
  const { isSuperAdmin } = useOrganization();
  const { hasSigned } = useICAGuard();
  const [selectedLead, setSelectedLead] = useState<KCFYEligibleLead | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(DISMISS_KEY);
    return stored ? Number(stored) : null;
  });

  const { data, isLoading } = useQuery({
    queryKey: ["kcfy-ready-leads", orgId],
    enabled: !!orgId && hasSigned,
    queryFn: async () => {
      // Leads con K-Score >= 75, no archivados, no cerrados, con propiedad completa (address + MAO/ARV)
      const { data: hotLeads, error: leadsErr } = await supabase
        .from("leads")
        .select(`
          id,
          piw_score,
          status,
          archived_at,
          property:properties!inner(address, city, state, arv, mao)
        `)
        .gte("piw_score", 75)
        .is("archived_at", null)
        .neq("status", "cerrado")
        .order("piw_score", { ascending: false });

      if (leadsErr) throw leadsErr;

      // Filtrar leads con dirección y al menos MAO o ARV
      const validLeads = (hotLeads || []).filter((l: any) => {
        const p = l.property;
        if (!p) return false;
        const hasAddress = !!(p.address && String(p.address).trim());
        const hasValue = (p.mao != null && Number(p.mao) > 0) || (p.arv != null && Number(p.arv) > 0);
        return hasAddress && hasValue;
      });

      const leadIds = validLeads.map((l: any) => l.id);
      if (leadIds.length === 0) {
        return { eligible: [], totalKCFYRequests: 0 };
      }

      // KCFY activos (incluye todos los estados intermedios) para deduplicar
      const { data: activeKcfy, error: kcfyErr } = await supabase
        .from("kcfy_requests")
        .select("lead_id, status")
        .in("lead_id", leadIds)
        .in("status", ["pending", "accepted", "in_progress"]);

      if (kcfyErr) throw kcfyErr;

      // Dedupe por lead_id (un lead puede tener múltiples filas históricas; basta con una activa)
      const activeSet = new Set<string>();
      (activeKcfy || []).forEach((k) => activeSet.add(k.lead_id));

      // Total KCFY del usuario (para distinguir "primer KCFY" vs "uno más")
      const { count: totalKCFYRequests } = await supabase
        .from("kcfy_requests")
        .select("id", { count: "exact", head: true });

      const eligible: KCFYEligibleLead[] = validLeads.map((l: any) => ({
        id: l.id,
        piw_score: l.piw_score,
        property: l.property,
        hasActiveKCFY: activeSet.has(l.id),
      }));

      return {
        eligible: eligible.filter((l) => !l.hasActiveKCFY),
        totalKCFYRequests: totalKCFYRequests ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const isDismissed = useMemo(() => {
    if (!dismissedAt) return false;
    const hoursPassed = (Date.now() - dismissedAt) / (1000 * 60 * 60);
    return hoursPassed < DISMISS_HOURS;
  }, [dismissedAt]);

  const handleDismiss = () => {
    const now = Date.now();
    window.localStorage.setItem(DISMISS_KEY, String(now));
    setDismissedAt(now);
  };

  // Estimated deal value (MAO if exists, otherwise ARV)
  const estimatedDealValue = useMemo(() => {
    if (!selectedLead?.property) return null;
    const mao = selectedLead.property.mao ? Number(selectedLead.property.mao) : null;
    const arv = selectedLead.property.arv ? Number(selectedLead.property.arv) : null;
    return mao || arv || null;
  }, [selectedLead]);

  const leadAddress = useMemo(() => {
    if (!selectedLead?.property) return "";
    const parts = [
      selectedLead.property.address,
      selectedLead.property.city,
      selectedLead.property.state,
    ].filter(Boolean);
    return parts.join(", ");
  }, [selectedLead]);

  if (isSuperAdmin) return null; // Klose Internal team no solicita KCFY a sí mismo
  if (isLoading || !data || isDismissed || !hasSigned) return null;
  if (data.eligible.length === 0) return null;

  const isFirstKCFY = data.totalKCFYRequests === 0;
  const eligibleCount = data.eligible.length;
  const topLead = data.eligible[0];

  return (
    <>
      <Card
        variant="glass"
        className="mb-6 border-accent/40 bg-gradient-to-r from-accent/5 via-accent/10 to-transparent relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.15),transparent_60%)] pointer-events-none" />
        <CardContent className="py-5 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="hidden sm:flex h-12 w-12 shrink-0 rounded-xl bg-accent/15 items-center justify-center">
                {isFirstKCFY ? (
                  <Sparkles className="h-6 w-6 text-accent" />
                ) : (
                  <Flame className="h-6 w-6 text-accent" />
                )}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-semibold">
                    {isFirstKCFY
                      ? "🚀 Tienes leads listos para tu primer KCFY"
                      : `🔥 ${eligibleCount} ${eligibleCount === 1 ? "lead listo" : "leads listos"} para KCFY`}
                  </h3>
                  <Badge variant="accent" className="font-mono">
                    K-Score ≥ 75
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isFirstKCFY ? (
                    <>
                      Klose cierra el deal por ti.{" "}
                      <span className="text-foreground font-medium">Tú ganas el 60%.</span> Sin
                      experiencia previa requerida.
                    </>
                  ) : (
                    <>
                      Empieza con el más caliente:{" "}
                      <span className="text-foreground font-medium">
                        {topLead.property?.address || "Sin dirección"}
                        {topLead.property?.city ? `, ${topLead.property.city}` : ""}
                      </span>{" "}
                      ·{" "}
                      <span className="text-accent font-mono font-semibold">
                        K-Score {topLead.piw_score}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button
                size="sm"
                variant="default"
                onClick={() => setSelectedLead(topLead)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1 lg:flex-none"
              >
                {isFirstKCFY ? "Solicitar mi primer KCFY" : "Solicitar KCFY"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title="Ocultar por 24h"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedLead && (
        <RequestKCFYDialog
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
          leadId={selectedLead.id}
          leadAddress={leadAddress}
          estimatedDealValue={estimatedDealValue}
        />
      )}
    </>
  );
}
