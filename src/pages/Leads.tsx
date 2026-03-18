import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useServerPagination } from "@/hooks/useServerPagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PIWScoreGauge } from "@/components/dashboard/PIWScoreGauge";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import { PropertyComparisonSheet } from "@/components/leads/PropertyComparisonSheet";
import { ArchiveLeadDialog } from "@/components/leads/ArchiveLeadDialog";
import { useLeads, useLeadsExport, useLeadFilterOptions, useCalculatePIWScore, Lead } from "@/hooks/useLeads";
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
  Archive,
} from "lucide-react";
import { generateCSV, downloadCSV, todayDateString } from "@/lib/csvExport";

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
  const calculateScore = useCalculatePIWScore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [piwRange, setPiwRange] = useState<[number, number]>([0, 100]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);
  const [isBatchCalculating, setIsBatchCalculating] = useState(false);
  const [archiveLeadId, setArchiveLeadId] = useState<string | null>(null);
  const [archiveAddress, setArchiveAddress] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const pagination = useServerPagination(25);
  const { data: filterOptions } = useLeadFilterOptions();

  const filters = useMemo(() => ({
    status: statusFilter,
    source: sourceFilter,
    city: cityFilter,
    search: searchTerm || undefined,
    piwMin: piwRange[0],
    piwMax: piwRange[1],
  }), [statusFilter, sourceFilter, cityFilter, searchTerm, piwRange]);

  const { data: result, isLoading, error } = useLeads({
    filters,
    from: pagination.from,
    to: pagination.to,
  });

  const leads = result?.data || [];
  const totalCount = result?.count ?? 0;
  const leadsPagination = pagination.paginationProps(totalCount);

  const { refetch: fetchExport } = useLeadsExport(filters);

  const uniqueSources = filterOptions?.sources || [];
  const uniqueCities = filterOptions?.cities || [];

  const hasActiveFilters = statusFilter !== "all" || sourceFilter !== "all" || cityFilter !== "all" || piwRange[0] > 0 || piwRange[1] < 100;

  const clearFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setCityFilter("all");
    setPiwRange([0, 100]);
    setSearchTerm("");
    pagination.resetPage();
  };

  const pendingLeads = leads.filter(l => l.piw_score === null && l.property);

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
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestiona y califica tus leads con el scoring PIW impulsado por IA
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              disabled={isExporting || !filteredLeads?.length}
              onClick={() => {
                setIsExporting(true);
                try {
                  const headers = ['Nombre', 'Dirección', 'Teléfono', 'PIW Score', 'ARV', 'MAO', 'Spread', 'Estado', 'Días sin actividad'];
                  const rows = (filteredLeads || []).map(lead => {
                    const arv = lead.property?.arv ? Number(lead.property.arv) : 0;
                    const mao = lead.property?.mao ? Number(lead.property.mao) : (arv > 0 ? Math.round(arv * 0.7 - (Number(lead.property?.repair_cost) || 0)) : 0);
                    const acquisition = Number(lead.offer_amount) || Number(lead.listing_price) || Number(lead.property?.last_sale_price) || 0;
                    const spread = mao > 0 && acquisition > 0 ? mao - acquisition : 0;
                    const statusLabel = statusConfig[lead.status]?.label || lead.status;
                    return [
                      lead.property?.owner_name || '',
                      lead.property?.address || '',
                      lead.property?.owner_phone || '',
                      String(lead.piw_score ?? ''),
                      arv ? String(arv) : '',
                      mao ? String(mao) : '',
                      spread ? String(spread) : '',
                      statusLabel,
                      String(lead.days_without_activity ?? ''),
                    ];
                  });
                  downloadCSV(generateCSV(headers, rows), `leads_export_${todayDateString()}.csv`);
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            {pendingLeads.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
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
            <Button size="sm" onClick={() => setShowNewLeadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {leads && leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-0 sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por dirección, propietario o ciudad..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <PropertyComparisonSheet />
            <Button 
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="accent" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  !
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Limpiar filtros
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border">
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="captacion">Captación</SelectItem>
                    <SelectItem value="contacto">Contacto</SelectItem>
                    <SelectItem value="bajo_contrato">Bajo Contrato</SelectItem>
                    <SelectItem value="cesion">Cesión</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Fuente</label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Todas las fuentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las fuentes</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ciudad</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Todas las ciudades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ciudades</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PIW Score Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  PIW Score: {piwRange[0]} – {piwRange[1]}
                </label>
                <div className="pt-2 px-1">
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={piwRange}
                    onValueChange={(val) => setPiwRange(val as [number, number])}
                  />
                </div>
              </div>
            </div>
          )}
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
            <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Propiedad</th>
                    <th className="p-4 font-medium">Propietario</th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          PIW Score
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            <strong>Probability of Investment Win</strong>: Puntuación IA (0-100) que predice la probabilidad de cerrar el deal exitosamente basado en motivación del vendedor, viabilidad financiera y dificultad de cierre.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          Prioridad
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            <strong>HOT</strong>: PIW ≥80% - Contactar hoy<br/>
                            <strong>WARM</strong>: PIW 50-79% - Seguimiento activo<br/>
                            <strong>COLD</strong>: PIW &lt;50% - Baja prioridad
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          ARV
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            <strong>After Repair Value</strong>: Valor estimado de la propiedad después de reparaciones. Base para calcular la oferta máxima permitida.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          MAO
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            <strong>Maximum Allowable Offer</strong>: Oferta máxima permitida calculada como ARV × 70% - Costo de Reparaciones. Precio máximo a pagar para mantener margen.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          Spread ↓
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            <strong>Margen de Ganancia</strong>: MAO menos precio de adquisición (oferta/listing/última venta). Verde = ganancia potencial, Rojo = pérdida. Ordenado de mayor a menor.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          Indicadores
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            Señales de motivación del vendedor: Ausente (no vive ahí), Deuda Imp. (impuestos atrasados), Ejecución (foreclosure), Sucesión (herencia/probate).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          Estado
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs">
                            Etapa del pipeline: Captación → Contacto → Bajo Contrato → Cesión → Cerrado
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedLeads.map((lead, index) => {
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
                          {(() => {
                            const arv = lead.property?.arv ? Number(lead.property.arv) : 0;
                            const repairCost = lead.property?.repair_cost ? Number(lead.property.repair_cost) : 0;
                            const savedMao = lead.property?.mao ? Number(lead.property.mao) : 0;
                            const calculatedMao = arv > 0 ? Math.round(arv * 0.7 - repairCost) : 0;
                            const displayMao = savedMao || calculatedMao;
                            const isCalculated = !savedMao && calculatedMao > 0;
                            
                            return displayMao > 0 ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <p className={`font-semibold ${isCalculated ? 'text-accent' : 'text-success'}`}>
                                    ${displayMao.toLocaleString()}
                                    {isCalculated && <span className="text-[10px] ml-1">*</span>}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[200px] text-xs">
                                    {isCalculated 
                                      ? `Estimado: ARV ($${arv.toLocaleString()}) × 70% - Reparaciones ($${repairCost.toLocaleString()})`
                                      : 'MAO guardado en la propiedad'
                                    }
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          {(() => {
                            const arv = lead.property?.arv ? Number(lead.property.arv) : 0;
                            const repairCost = lead.property?.repair_cost ? Number(lead.property.repair_cost) : 0;
                            const savedMao = lead.property?.mao ? Number(lead.property.mao) : 0;
                            const mao = savedMao || (arv > 0 ? Math.round(arv * 0.7 - repairCost) : 0);
                            
                            // Use listing_price, offer_amount, or last_sale_price as acquisition cost
                            const listingPrice = lead.listing_price ? Number(lead.listing_price) : 0;
                            const offerAmount = lead.offer_amount ? Number(lead.offer_amount) : 0;
                            const lastSalePrice = lead.property?.last_sale_price ? Number(lead.property.last_sale_price) : 0;
                            
                            const acquisitionCost = offerAmount || listingPrice || lastSalePrice;
                            const spread = mao > 0 && acquisitionCost > 0 ? mao - acquisitionCost : 0;
                            
                            const sourceLabel = offerAmount ? 'Oferta' : listingPrice ? 'Listing' : lastSalePrice ? 'Últ. Venta' : '';
                            
                            return spread !== 0 ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <p className={`font-semibold ${spread > 0 ? 'text-success' : 'text-destructive'}`}>
                                    {spread > 0 ? '+' : ''}${spread.toLocaleString()}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[220px] text-xs">
                                    MAO (${mao.toLocaleString()}) - {sourceLabel} (${acquisitionCost.toLocaleString()})
                                    {spread > 0 ? ' = Ganancia potencial' : ' = Pérdida potencial'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setArchiveLeadId(lead.id);
                                    setArchiveAddress(lead.property?.address || '');
                                  }}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Kill Fast - Archivar lead</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </TooltipProvider>
            <DataPagination {...leadsPagination} />
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

      {/* Archive Lead Dialog */}
      <ArchiveLeadDialog
        leadId={archiveLeadId}
        leadAddress={archiveAddress}
        open={!!archiveLeadId}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveLeadId(null);
            setArchiveAddress('');
          }
        }}
      />
    </Layout>
  );
};

export default Leads;
