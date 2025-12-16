import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIWScoreGauge } from "@/components/dashboard/PIWScoreGauge";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import { useLeads, useCalculatePIWScore, Lead } from "@/hooks/useLeads";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Filter,
  Upload,
  Download,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Zap,
  Plus,
  Brain,
  AlertTriangle,
  Home,
  Loader2,
} from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "accent" | "warning" | "secondary" | "glow" }> = {
  captacion: { label: "Captación", variant: "secondary" },
  contacto: { label: "Contacto", variant: "warning" },
  bajo_contrato: { label: "Bajo Contrato", variant: "accent" },
  cesion: { label: "Cesión", variant: "glow" },
  cerrado: { label: "Cerrado", variant: "secondary" },
};

const priorityConfig: Record<string, { label: string; variant: "accent" | "warning" | "secondary" }> = {
  hot: { label: "🔥 HOT", variant: "accent" },
  warm: { label: "⚡ WARM", variant: "warning" },
  cold: { label: "❄️ COLD", variant: "secondary" },
};

const Leads = () => {
  const { data: leads, isLoading, error } = useLeads();
  const calculateScore = useCalculatePIWScore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);
  const [isBatchCalculating, setIsBatchCalculating] = useState(false);

  const pendingLeads = leads?.filter(l => l.piw_score === null && l.property) || [];

  const handleCalculateScore = async (lead: Lead) => {
    if (!lead.property) return;
    
    setCalculatingId(lead.id);
    try {
      await calculateScore.mutateAsync({
        leadId: lead.id,
        propertyData: lead.property,
      });
    } finally {
      setCalculatingId(null);
    }
  };

  const handleBatchCalculate = async () => {
    if (pendingLeads.length === 0) return;
    
    setIsBatchCalculating(true);
    try {
      for (const lead of pendingLeads) {
        if (lead.property) {
          setCalculatingId(lead.id);
          await calculateScore.mutateAsync({
            leadId: lead.id,
            propertyData: lead.property,
          });
        }
      }
    } finally {
      setCalculatingId(null);
      setIsBatchCalculating(false);
    }
  };

  const filteredLeads = leads?.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.property?.address?.toLowerCase().includes(search) ||
      lead.property?.city?.toLowerCase().includes(search) ||
      lead.property?.owner_name?.toLowerCase().includes(search)
    );
  });

  const getPriority = (lead: Lead): string => {
    const factors = lead.piw_score_factors as any;
    return factors?.priority || (
      (lead.piw_score || 0) >= 80 ? 'hot' : 
      (lead.piw_score || 0) >= 50 ? 'warm' : 'cold'
    );
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              Gestiona y califica tus leads con el scoring PIW impulsado por IA
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            {pendingLeads.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleBatchCalculate}
                disabled={isBatchCalculating}
                className="border-accent/50 text-accent hover:bg-accent/10"
              >
                {isBatchCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando ({pendingLeads.length})...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Calcular Todos ({pendingLeads.length})
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setShowNewLeadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {leads && leads.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-primary">{leads.length}</div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </Card>
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-accent">{leads.filter(l => getPriority(l) === 'hot').length}</div>
            <div className="text-sm text-muted-foreground">🔥 Hot Leads</div>
          </Card>
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-warning">{leads.filter(l => getPriority(l) === 'warm').length}</div>
            <div className="text-sm text-muted-foreground">⚡ Warm Leads</div>
          </Card>
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold">{leads.filter(l => !l.piw_score).length}</div>
            <div className="text-sm text-muted-foreground">Sin Analizar</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por dirección, propietario o ciudad..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card variant="glass" className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar leads</h3>
            <p className="text-muted-foreground">Por favor, intenta de nuevo más tarde.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && leads?.length === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay leads todavía</h3>
            <p className="text-muted-foreground mb-6">
              Añade tu primer lead para comenzar a usar el sistema de scoring PIW con IA.
            </p>
            <Button onClick={() => setShowNewLeadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Lead
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      {!isLoading && !error && filteredLeads && filteredLeads.length > 0 && (
        <Card variant="glass">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Propiedad</th>
                    <th className="p-4 font-medium">Propietario</th>
                    <th className="p-4 font-medium">PIW Score</th>
                    <th className="p-4 font-medium">Prioridad</th>
                    <th className="p-4 font-medium">ARV</th>
                    <th className="p-4 font-medium">MAO</th>
                    <th className="p-4 font-medium">Indicadores</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((lead, index) => {
                    const priority = getPriority(lead);
                    const factors = lead.piw_score_factors as any;
                    
                    return (
                      <tr
                        key={lead.id}
                        className="group hover:bg-secondary/30 transition-colors animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="p-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">{lead.property?.address || 'Sin dirección'}</p>
                              <p className="text-sm text-muted-foreground">
                                {lead.property?.city}, {lead.property?.state} {lead.property?.zip_code}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{lead.property?.owner_name || 'Desconocido'}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.source || 'Sin fuente'}
                          </p>
                        </td>
                        <td className="p-4">
                          {lead.piw_score !== null ? (
                            <PIWScoreGauge score={lead.piw_score} size="sm" />
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCalculateScore(lead);
                              }}
                              disabled={calculatingId === lead.id}
                            >
                              {calculatingId === lead.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Brain className="h-4 w-4 mr-1" />
                                  Calcular
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                        <td className="p-4">
                          {lead.piw_score !== null && (
                            <Badge variant={priorityConfig[priority]?.variant || 'secondary'}>
                              {priorityConfig[priority]?.label || priority}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          {lead.property?.arv ? (
                            <p className="font-semibold">
                              ${lead.property.arv.toLocaleString()}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {lead.property?.mao ? (
                            <p className="font-semibold text-success">
                              ${lead.property.mao.toLocaleString()}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <TooltipProvider>
                            <div className="flex gap-1 flex-wrap max-w-[150px]">
                              {lead.property?.is_absentee_owner && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="info" className="text-[10px]">
                                      Ausente
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[200px] text-xs">
                                      El propietario no vive en la propiedad. Mayor probabilidad de motivación para vender.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {lead.property?.tax_delinquent && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="warning" className="text-[10px]">
                                      Deuda Imp.
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[200px] text-xs">
                                      Propiedad con impuestos atrasados. Indica urgencia financiera del propietario.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {lead.property?.is_foreclosure && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="accent" className="text-[10px]">
                                      Ejecución
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[200px] text-xs">
                                      Propiedad en proceso de ejecución hipotecaria. Alta motivación para venta rápida.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {lead.property?.is_probate && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="glow" className="text-[10px]">
                                      Sucesión
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[200px] text-xs">
                                      Propiedad heredada en proceso de sucesión. Herederos suelen preferir venta rápida.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusConfig[lead.status]?.variant || 'secondary'}>
                            {statusConfig[lead.status]?.label || lead.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCalculateScore(lead);
                              }}
                              disabled={calculatingId === lead.id}
                            >
                              {calculatingId === lead.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Zap className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Lead Dialog */}
      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog} 
      />

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onRecalculate={() => selectedLead && handleCalculateScore(selectedLead)}
        isCalculating={calculatingId === selectedLead?.id}
      />
    </Layout>
  );
};

export default Leads;
