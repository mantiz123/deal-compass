import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const pipelineStages = [
  {
    name: "Captación",
    count: 124,
    value: "$2.4M",
    color: "bg-info",
  },
  {
    name: "Contacto",
    count: 48,
    value: "$980K",
    color: "bg-primary",
  },
  {
    name: "Bajo Contrato",
    count: 12,
    value: "$340K",
    color: "bg-warning",
  },
  {
    name: "Cesión",
    count: 5,
    value: "$125K",
    color: "bg-accent",
  },
  {
    name: "Cerrado",
    count: 8,
    value: "$180K",
    color: "bg-success",
  },
];

export function PipelinePreview() {
  const total = pipelineStages.reduce((acc, stage) => acc + stage.count, 0);

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-xl">Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
          {pipelineStages.map((stage, index) => (
            <div
              key={stage.name}
              className={cn("transition-all duration-500", stage.color)}
              style={{ width: `${(stage.count / total) * 100}%` }}
            />
          ))}
        </div>

        {/* Stage list */}
        <div className="space-y-3">
          {pipelineStages.map((stage) => (
            <div
              key={stage.name}
              className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                <span className="font-medium">{stage.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">{stage.count} deals</Badge>
                <span className="font-semibold text-primary">{stage.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
