import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const stageConfig: Record<string, { name: string; color: string }> = {
  captacion: { name: "Captación", color: "bg-info" },
  contacto: { name: "Contacto", color: "bg-primary" },
  bajo_contrato: { name: "Bajo Contrato", color: "bg-warning" },
  cesion: { name: "Cesión", color: "bg-accent" },
  cerrado: { name: "Cerrado", color: "bg-success" },
};

const stageOrder = ['captacion', 'contacto', 'bajo_contrato', 'cesion', 'cerrado'];

export function PipelinePreview() {
  const { data: stats, isLoading } = useDashboardStats();

  const pipelineStages = stageOrder.map(status => ({
    status,
    ...stageConfig[status],
    count: stats?.leadsByStatus?.[status] || 0,
  }));

  const total = pipelineStages.reduce((acc, stage) => acc + stage.count, 0);

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-xl">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full rounded-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
      <Card variant="glass">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl">Pipeline Overview</CardTitle>
          <Button variant="ghost" size="sm" asChild className="self-start sm:self-auto">
            <Link to="/pipeline">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        {total > 0 ? (
          <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
            {pipelineStages.map((stage) => (
              stage.count > 0 && (
                <div
                  key={stage.status}
                  className={cn("transition-all duration-500", stage.color)}
                  style={{ width: `${(stage.count / total) * 100}%` }}
                />
              )
            ))}
          </div>
        ) : (
          <div className="h-3 rounded-full bg-secondary" />
        )}

        {/* Stage list */}
        <div className="space-y-3">
          {pipelineStages.map((stage) => (
            <div
              key={stage.status}
              className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                <span className="font-medium">{stage.name}</span>
              </div>
              <Badge variant="outline">{stage.count} leads</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
