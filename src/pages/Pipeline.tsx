import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIWScoreGauge } from "@/components/dashboard/PIWScoreGauge";
import { Plus, MoreHorizontal, Phone, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const pipelineColumns = [
  {
    id: "captacion",
    name: "Captación",
    color: "border-t-info",
    deals: [
      { id: 1, address: "1234 Oak Street", owner: "John Smith", piwScore: 87, value: 45000 },
      { id: 2, address: "567 Pine Avenue", owner: "Sarah Johnson", piwScore: 72, value: 32000 },
      { id: 3, address: "890 Maple Drive", owner: "Michael Brown", piwScore: 54, value: 28000 },
    ],
  },
  {
    id: "contacto",
    name: "Contacto",
    color: "border-t-primary",
    deals: [
      { id: 4, address: "321 Cedar Lane", owner: "Emily Davis", piwScore: 91, value: 67000 },
      { id: 5, address: "654 Birch Court", owner: "Robert Wilson", piwScore: 45, value: 22000 },
    ],
  },
  {
    id: "bajo_contrato",
    name: "Bajo Contrato",
    color: "border-t-warning",
    deals: [
      { id: 6, address: "987 Elm Road", owner: "Jennifer Lee", piwScore: 78, value: 55000 },
    ],
  },
  {
    id: "cesion",
    name: "Cesión",
    color: "border-t-accent",
    deals: [
      { id: 7, address: "147 Spruce Way", owner: "David Martinez", piwScore: 83, value: 42000 },
    ],
  },
  {
    id: "cerrado",
    name: "Cerrado",
    color: "border-t-success",
    deals: [
      { id: 8, address: "258 Willow Blvd", owner: "Amanda Clark", piwScore: 95, value: 85000 },
      { id: 9, address: "369 Ash Street", owner: "Christopher Moore", piwScore: 88, value: 38000 },
    ],
  },
];

const Pipeline = () => {
  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            Drag and drop deals through your wholesaling workflow
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Deal
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineColumns.map((column, columnIndex) => (
          <div
            key={column.id}
            className="min-w-[300px] flex-shrink-0 animate-fade-in"
            style={{ animationDelay: `${columnIndex * 100}ms` }}
          >
            <Card variant="glass" className={cn("border-t-4", column.color)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {column.name}
                  </CardTitle>
                  <Badge variant="outline">{column.deals.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.deals.map((deal) => (
                  <Card
                    key={deal.id}
                    variant="interactive"
                    className="p-4 cursor-grab active:cursor-grabbing"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{deal.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.owner}
                          </p>
                        </div>
                        <PIWScoreGauge score={deal.piwScore} size="sm" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-success">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold text-sm">
                            ${deal.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="ghost" className="w-full border border-dashed border-border">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Deal
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Pipeline;
