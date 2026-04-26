import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Interval = "daily" | "weekly" | "monthly" | "manual";
type WeeklyAnchor =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

interface ScheduleData {
  interval: Interval;
  weekly_anchor?: WeeklyAnchor;
  monthly_anchor?: number;
  delay_days?: number;
}

const WEEKLY_LABELS: Record<WeeklyAnchor, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
};

const intervalLabel = (s: ScheduleData) => {
  switch (s.interval) {
    case "daily":
      return `Diario (T+${s.delay_days ?? 2} días)`;
    case "weekly":
      return `Semanal — ${WEEKLY_LABELS[s.weekly_anchor ?? "friday"]}`;
    case "monthly":
      return `Mensual — día ${s.monthly_anchor ?? 1}`;
    case "manual":
      return "Manual";
  }
};

const isOptimal = (s: ScheduleData | null) =>
  s?.interval === "weekly" && s?.weekly_anchor === "friday";

export const PayoutScheduleWidget = () => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean>(false);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-payout-schedule",
        { body: { action: "get" } },
      );
      if (error) throw error;
      setSchedule(data.schedule);
      setPayoutsEnabled(!!data.payouts_enabled);
    } catch (err) {
      console.error("[PayoutSchedule] fetch error:", err);
      toast.error("No se pudo cargar el payout schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const optimal = isOptimal(schedule);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <CardTitle className="text-base">Payout Schedule</CardTitle>
              <CardDescription className="text-xs">
                Frecuencia de depósitos Stripe → Mercury
              </CardDescription>
            </div>
          </div>
          {!loading &&
            (payoutsEnabled ? (
              <Badge variant="secondary" className="gap-1 shrink-0 self-start sm:self-auto">
                <CheckCircle2 className="h-3 w-3" /> Activo
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 shrink-0 self-start sm:self-auto">
                <AlertCircle className="h-3 w-3" /> Pendiente
              </Badge>
            ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            {schedule && (
              <div
                className={`rounded-md p-3 text-sm border ${
                  optimal
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/50 border-border"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  Configuración actual
                </div>
                <div className="font-semibold text-base">
                  {intervalLabel(schedule)}
                </div>
                {!optimal && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    💡 Recomendado: <span className="font-medium">Semanal — Viernes</span> para
                    facilitar la conciliación contable.
                  </div>
                )}
                {optimal && (
                  <div className="mt-2 text-xs text-primary">
                    ✓ Configuración óptima para wholesaling
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                asChild
                size="sm"
                variant={optimal ? "outline" : "default"}
                className="w-full"
              >
                <a
                  href="https://dashboard.stripe.com/settings/payouts"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {optimal ? "Gestionar en Stripe" : "Cambiar a Semanal-Viernes"}
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchSchedule}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Actualizar estado
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Stripe no permite modificar el schedule vía API en cuentas standalone.
              Configúralo una vez en el Dashboard → quedará guardado permanentemente.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
