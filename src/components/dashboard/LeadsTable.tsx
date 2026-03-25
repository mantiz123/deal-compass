import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KScoreGauge } from "./KScoreGauge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { MoreHorizontal, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const priorityConfig: Record<string, { label: string; variant: "accent" | "warning" | "secondary" }> = {
  hot: { label: "Alta Prioridad", variant: "accent" },
  warm: { label: "Seguimiento", variant: "warning" },
  cold: { label: "Baja Prioridad", variant: "secondary" },
};

const getPriority = (lead: Lead): string => {
  const factors = lead.piw_score_factors as any;
  return factors?.priority || (
    (lead.piw_score || 0) >= 80 ? 'hot' : 
    (lead.piw_score || 0) >= 50 ? 'warm' : 'cold'
  );
};

export function LeadsTable() {
  const { data: result, isLoading } = useLeads();
  const leads = result?.data;
  
  // Get top 5 leads by K-Score
  const topLeads = leads
    ?.filter(l => l.piw_score !== null)
    .sort((a, b) => (b.piw_score || 0) - (a.piw_score || 0))
    .slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Leads Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-10 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Top Leads por K-Score</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/leads">
            Ver Todos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {topLeads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay leads con K-Score calculado</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/leads">Ir a Leads</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-4 font-medium">Propiedad</th>
                  <th className="pb-4 font-medium">Propietario</th>
                  <th className="pb-4 font-medium">K-Score</th>
                  <th className="pb-4 font-medium">Est. Equity</th>
                  <th className="pb-4 font-medium">Prioridad</th>
                  <th className="pb-4 font-medium">Último Contacto</th>
                  <th className="pb-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topLeads.map((lead) => {
                  const priority = getPriority(lead);
                  const property = lead.property;
                  
                  return (
                    <tr key={lead.id} className="group hover:bg-secondary/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{property?.address || 'Sin dirección'}</p>
                            <p className="text-sm text-muted-foreground">
                              {property?.city}, {property?.state}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="font-medium">{property?.owner_name || 'Desconocido'}</p>
                      </td>
                      <td className="py-4">
                        <KScoreGauge score={lead.piw_score || 0} size="sm" />
                      </td>
                      <td className="py-4">
                        {property?.equity_percent ? (
                          <p className="font-semibold text-success">
                            {property.equity_percent}%
                          </p>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4">
                        <Badge variant={priorityConfig[priority]?.variant || 'secondary'}>
                          {priorityConfig[priority]?.label || priority}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {lead.last_contact_at 
                          ? formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true, locale: es })
                          : 'Nunca'
                        }
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => property?.owner_phone && window.open(`tel:${property.owner_phone}`)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => property?.owner_email && window.open(`mailto:${property.owner_email}`)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
