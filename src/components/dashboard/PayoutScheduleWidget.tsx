import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CheckCircle2, AlertCircle } from "lucide-react";
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
      return "Diario";
    case "weekly":
      return `Semanal (${WEEKLY_LABELS[s.weekly_anchor ?? "friday"]})`;
    case "monthly":
      return `Mensual (día ${s.monthly_anchor ?? 1})`;
    case "manual":
      return "Manual";
  }
};

export const PayoutScheduleWidget = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean>(false);

  const fetchSchedule = async () => {
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

  const updateSchedule = async (payload: {
    interval: Interval;
    weekly_anchor?: WeeklyAnchor;
    monthly_anchor?: number;
  }) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-payout-schedule",
        { body: { action: "update", ...payload } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSchedule(data.schedule);
      toast.success("Payout schedule actualizado en Stripe");
    } catch (err) {
      console.error("[PayoutSchedule] update error:", err);
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleIntervalChange = (value: Interval) => {
    if (value === "weekly") {
      updateSchedule({ interval: "weekly", weekly_anchor: "friday" });
    } else if (value === "monthly") {
      updateSchedule({ interval: "monthly", monthly_anchor: 1 });
    } else {
      updateSchedule({ interval: value });
    }
  };

  const handleWeeklyAnchorChange = (value: WeeklyAnchor) => {
    updateSchedule({ interval: "weekly", weekly_anchor: value });
  };

  const handleMonthlyAnchorChange = (value: string) => {
    updateSchedule({ interval: "monthly", monthly_anchor: parseInt(value) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Payout Schedule (Stripe)</CardTitle>
              <CardDescription>
                Frecuencia con la que Stripe deposita en Mercury
              </CardDescription>
            </div>
          </div>
          {!loading &&
            (payoutsEnabled ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Activo
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" /> Pendiente
              </Badge>
            ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            {schedule && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Configuración actual: </span>
                <span className="font-semibold">{intervalLabel(schedule)}</span>
              </div>
            )}

            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Frecuencia
                </label>
                <Select
                  value={schedule?.interval ?? "weekly"}
                  onValueChange={(v) => handleIntervalChange(v as Interval)}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {schedule?.interval === "weekly" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Día de depósito
                  </label>
                  <Select
                    value={schedule.weekly_anchor ?? "friday"}
                    onValueChange={(v) =>
                      handleWeeklyAnchorChange(v as WeeklyAnchor)
                    }
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(WEEKLY_LABELS) as WeeklyAnchor[]).map(
                        (d) => (
                          <SelectItem key={d} value={d}>
                            {WEEKLY_LABELS[d]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {schedule?.interval === "monthly" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Día del mes
                  </label>
                  <Select
                    value={String(schedule.monthly_anchor ?? 1)}
                    onValueChange={handleMonthlyAnchorChange}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Día {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Los cambios se aplican automáticamente en tu cuenta de Stripe.
              Los fondos llegan a Mercury vía ACH (T+2 días hábiles).
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
