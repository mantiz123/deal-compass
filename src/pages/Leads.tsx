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
import { KScoreGauge } from "@/components/dashboard/KScoreGauge";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import { PropertyComparisonSheet } from "@/components/leads/PropertyComparisonSheet";
import { ArchiveLeadDialog } from "@/components/leads/ArchiveLeadDialog";
import { ArchivedLeadsSection } from "@/components/leads/ArchivedLeadsSection";
import { KCFYReadyBanner } from "@/components/leads/KCFYReadyBanner";
import { useLeads, useLeadsExport, useLeadFilterOptions, useCalculatePIWScore, useBatchRecalculatePIW, Lead } from "@/hooks/useLeads";
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
  RefreshCw,
} from "lucide-react";
import { generateCSV, downloadCSV, todayDateString } from "@/lib/csvExport";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionsBar } from "@/components/leads/BulkActionsBar";

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
  const batchRecalculate = useBatchRecalculatePIW();
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const visibleIds = leads.map(l => l.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.includes(id));
  const headerCheckState: boolean | "indeterminate" = allVisibleSelected
    ? true
    : someVisibleSelected
      ? "indeterminate"
      : false;

  const toggleAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestiona y califica tus leads con el scoring K-Score impulsado por IA
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              disabled={isExporting || !totalCount}
              onClick={async () => {
                setIsExporting(true);
                try {
                  const { data: exportData } = await fetchExport();
                  const exportLeads = exportData || [];
                   const headers = ['Nombre', 'Dirección', 'Teléfono', 'K-Score', 'ARV', 'MAO', 'Spread', 'Estado', 'Días sin actividad'];
                  const rows = exportLeads.map(lead => {
                    const arv = lead.property?.arv ? Number(lead.property.arv) : 0;
                    const mao = lead.property?.mao ? Number(lead.property.mao) : (arv > 0 ? Math.round(arv * 0.65 - (Number(lead.property?.repair_cost) || 0)) : 0);
                    const offerAmt = Number(lead.offer_amount) || 0;
                    const spread = mao > 0 && offerAmt > 0 ? mao - offerAmt : 0;
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
                    Calcular Nuevos ({pendingLeads.length})
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchRecalculate.mutate({ forceAll: true })}
              disabled={batchRecalculate.isPending || !totalCount}
              className="border-warning/50 text-warning hover:bg-warning/10"
            >
              {batchRecalculate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recalculando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recalcular Todos
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowNewLeadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* KCFY Ready Banner — leads with K-Score >= 75 ready for KCFY */}
      <KCFYReadyBanner />

      {/* Stats Summary */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-primary">{totalCount}</div>
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
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
            <div className="relative w-full sm:flex-1 sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por dirección, propietario o ciudad..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <PropertyComparisonSheet />
              <Button 
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 sm:flex-none"
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
                  Limpiar
                </Button>
              )}
            </div>
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

              {/* K-Score Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  K-Score: {piwRange[0]} – {piwRange[1]}
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
      {!isLoading && !error && totalCount === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay leads todavía</h3>
            <p className="text-muted-foreground mb-6">
              Añade tu primer lead para comenzar a usar el sistema de scoring K-Score con IA.
            </p>
            <Button onClick={() => setShowNewLeadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Lead
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

      {/* Leads Table */}
      {!isLoading && !error && leads.length > 0 && (
        <Card variant="glass">
          <CardContent className="p-0">
            <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 w-10">
                      <Checkbox
                        checked={headerCheckState}
                        onCheckedChange={(c) => toggleAllVisible(c === true)}
                        aria-label="Seleccionar todos los leads visibles"
                      />
                    </th>
                    <th className="p-4 font-medium">Propiedad</th>
                    <th className="p-4 font-medium">Propietario</th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          K-Score
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
                            <strong>Maximum Allowable Offer</strong>: Oferta máxima permitida calculada como ARV × 65% (estándar Alabama) - Costo de Reparaciones. Precio máximo a pagar para mantener margen.
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
                            <strong>Margen de Ganancia</strong>: MAO menos tu oferta al vendedor. Solo se calcula cuando tienes una oferta registrada. Verde = ganancia potencial, Rojo = pérdida.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          Net Equity $
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px]">
                          <p className="text-xs">
                            <strong>Equity Neto en Dólares</strong>: ARV menos el balance de hipoteca pendiente. Representa el margen real disponible en la propiedad. Mayor equity = más espacio para negociar y más ganancia potencial.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-4 font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 cursor-help">
                          Fee Rango
                          <AlertTriangle className="h-3 w-3 opacity-50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="text-xs">
                            <strong>Assignment Fee Estimado</strong>: Rango recomendado de ganancia por cesión. Se calcula como un porcentaje del spread (MAO - Costo Adquisición).<br/>
                            <strong>Conservador</strong>: 30% del spread<br/>
                            <strong>Agresivo</strong>: 60% del spread<br/>
                            Mínimo $5K. Si el spread es negativo no hay fee viable.
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
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">
                            <strong>Señales de motivación del vendedor:</strong><br/>
                            🏠 OUT-STATE = dueño fuera de estado<br/>
                            🏚️ VACANT = propiedad vacía<br/>
                            💎 FREE = sin hipoteca (100% equity)<br/>
                            🚨 URGENTE = subasta en &lt;30 días<br/>
                            🕐 10Y+ = dueño por 10+ años<br/>
                            🏚️ FORECL = ejecución hipotecaria<br/>
                            💰 TAX = impuestos atrasados<br/>
                            ⚖️ PROBATE = herencia/sucesión<br/>
                            🔗 LIENS = gravámenes activos<br/>
                            📉 MLS = 180+ días en mercado
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
                  {leads.map((lead, index) => {
                    const priority = getPriority(lead);
                    const factors = lead.piw_score_factors as any;
                    
                    return (
                      <tr
                        key={lead.id}
                        className="group hover:bg-secondary/30 transition-colors animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(lead.id)}
                            onCheckedChange={(c) => toggleOne(lead.id, c === true)}
                            aria-label="Seleccionar lead"
                          />
                        </td>
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
                          {(() => {
                            const p = lead.property;
                            const hasPhone = !!(p?.owner_phone || p?.phone_2 || p?.phone_3 || p?.phone_4 || p?.phone_5);
                            const hasEmail = !!p?.owner_email;
                            if (!hasPhone && !hasEmail) {
                              return (
                                <Badge variant="destructive" className="text-[9px] mt-1 px-1.5 py-0">
                                  📵 SIN CONTACTO
                                </Badge>
                              );
                            }
                            if (!hasPhone) {
                              return (
                                <Badge variant="warning" className="text-[9px] mt-1 px-1.5 py-0">
                                  📵 SIN TEL
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="p-4">
                          {lead.piw_score !== null ? (
                            <KScoreGauge score={lead.piw_score} size="sm" />
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
                            const calculatedMao = arv > 0 ? Math.round(arv * 0.65 - repairCost) : 0;
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
                                      ? `Estimado: ARV ($${arv.toLocaleString()}) × 65% (AL) - Reparaciones ($${repairCost.toLocaleString()})`
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
                            const mao = savedMao || (arv > 0 ? Math.round(arv * 0.65 - repairCost) : 0);

                            const offerAmount = lead.offer_amount ? Number(lead.offer_amount) : 0;

                            if (mao > 0 && offerAmount === 0) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="text-muted-foreground text-xs">Sin oferta</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs max-w-[220px]">
                                      Registra tu oferta al vendedor para calcular el spread. MAO disponible: ${mao.toLocaleString()}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            
                            const spread = mao > 0 && offerAmount > 0 ? mao - offerAmount : 0;
                            
                            return spread !== 0 ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <p className={`font-semibold ${spread > 0 ? 'text-success' : 'text-destructive'}`}>
                                    {spread > 0 ? '+' : ''}${spread.toLocaleString()}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[220px] text-xs">
                                    MAO (${mao.toLocaleString()}) - Oferta (${offerAmount.toLocaleString()})
                                    {spread > 0 ? ' = Margen para assignment fee' : ' = Oferta por encima del MAO'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
                        </td>
                        {/* Net Equity $ */}
                        <td className="p-4">
                          {(() => {
                            const arv = lead.property?.arv ? Number(lead.property.arv) : 0;
                            const mortgageBalance = (lead.property as any)?.mortgage_balance ? Number((lead.property as any).mortgage_balance) : 0;
                            const netEquity = arv > 0 && mortgageBalance > 0 ? arv - mortgageBalance : 0;
                            
                            if (netEquity === 0 && arv > 0 && mortgageBalance === 0) {
                              // Has ARV but no mortgage data
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="text-muted-foreground text-xs">Sin datos hipoteca</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">No hay balance de hipoteca registrado. Importa datos con "Open Mortgage Balance" para calcular el equity neto.</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            
                            if (netEquity === 0) return <span className="text-muted-foreground">-</span>;
                            
                            const equityPercent = arv > 0 ? Math.round((netEquity / arv) * 100) : 0;
                            const color = netEquity > 100000 ? 'text-success' : netEquity > 50000 ? 'text-accent' : 'text-foreground';
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger>
                                  <p className={`font-semibold ${color}`}>
                                    ${netEquity.toLocaleString()}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px]">
                                  <p className="text-xs">
                                    ARV (${arv.toLocaleString()}) - Hipoteca (${mortgageBalance.toLocaleString()}) = <strong>${netEquity.toLocaleString()}</strong> ({equityPercent}% equity)<br/>
                                    {netEquity > 100000 ? '✅ Excelente margen para deal' : netEquity > 50000 ? '👍 Buen margen' : '⚠️ Margen ajustado'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </td>
                        {/* Assignment Fee Range */}
                        <td className="p-4">
                          {(() => {
                            const arv = lead.property?.arv ? Number(lead.property.arv) : 0;
                            const repairCost = lead.property?.repair_cost ? Number(lead.property.repair_cost) : 0;
                            const savedMao = lead.property?.mao ? Number(lead.property.mao) : 0;
                            const mao = savedMao || (arv > 0 ? Math.round(arv * 0.65 - repairCost) : 0);
                            const offerAmount = lead.offer_amount ? Number(lead.offer_amount) : 0;
                            const spread = mao > 0 && offerAmount > 0 ? mao - offerAmount : 0;
                            
                            if (spread <= 0) return <span className="text-muted-foreground text-xs">-</span>;
                            
                            const feeMin = Math.max(5000, Math.round(spread * 0.3));
                            const feeMax = Math.round(spread * 0.6);
                            
                            if (feeMax < 5000) return (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-destructive text-xs font-medium">Bajo</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">El spread de ${spread.toLocaleString()} es muy bajo para un assignment fee viable (mínimo $5K).</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div>
                                    <p className="font-semibold text-success text-sm">
                                      ${(feeMin/1000).toFixed(0)}K - ${(feeMax/1000).toFixed(0)}K
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px]">
                                  <p className="text-xs">
                                    <strong>Rango de Assignment Fee recomendado:</strong><br/>
                                    Conservador (30%): <strong>${feeMin.toLocaleString()}</strong><br/>
                                    Agresivo (60%): <strong>${feeMax.toLocaleString()}</strong><br/>
                                    Basado en spread de ${spread.toLocaleString()}<br/>
                                    <em>Tip: Empieza agresivo y negocia hacia abajo con el buyer.</em>
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          <TooltipProvider>
                            <div className="flex gap-1 flex-wrap max-w-[220px]">
                              {/* OUT-STATE: Owner lives in different state */}
                              {lead.property?.absentee_type === 'out_of_state' && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="accent" className="text-[10px]">🏠 OUT-STATE</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>Propietario Fuera de Estado</strong>: Vive en otro estado. Alta probabilidad de querer vender porque no puede gestionar la propiedad a distancia.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* VACANT: Property is unoccupied */}
                              {lead.property?.is_vacant && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="warning" className="text-[10px]">🏚️ VACANT</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>Propiedad Vacante</strong>: Nadie vive aquí. El dueño está pagando impuestos y seguro sin recibir ingresos. Fuerte señal de motivación.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* FREE: 100% equity, no mortgage */}
                              {lead.property?.equity_percent != null && Number(lead.property.equity_percent) >= 100 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="success" className="text-[10px]">💎 FREE</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>Libre de Hipoteca</strong>: Propiedad 100% pagada. El dueño se queda con todo el dinero de la venta, lo que facilita negociar un precio justo.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* URGENTE: Auction within 30 days */}
                              {(() => {
                                const ad = (lead.property as any)?.auction_date;
                                if (!ad) return null;
                                const days = Math.ceil((new Date(ad).getTime() - Date.now()) / (1000*60*60*24));
                                if (days > 0 && days <= 30) return (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="destructive" className="text-[10px] animate-pulse">🚨 URGENTE {days}d</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[220px]">
                                      <p className="text-xs"><strong>Subasta en {days} días</strong>: La propiedad se va a subasta pronto. El vendedor puede perder su casa — máxima urgencia para negociar rápido.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                                if (days > 30 && days <= 90) return (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="warning" className="text-[10px]">⏰ SUBASTA {days}d</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[220px]">
                                      <p className="text-xs"><strong>Subasta en {days} días</strong>: Hay tiempo para negociar, pero la presión del timeline favorece un cierre rápido.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                                return null;
                              })()}
                              {/* 10Y+: Long-term ownership fatigue */}
                              {lead.property?.owner_tenure_years != null && lead.property.owner_tenure_years >= 10 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="secondary" className="text-[10px]">🕐 {lead.property.owner_tenure_years}Y+</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>Propietario por {lead.property.owner_tenure_years} años</strong>: Fatiga de propiedad — después de 10+ años, muchos dueños están cansados de mantener y quieren salir.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* FORECLOSURE */}
                              {lead.property?.is_foreclosure && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="accent" className="text-[10px]">🏚️ FORECL</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>En Ejecución Hipotecaria</strong>: El banco está por tomar la propiedad. El dueño prefiere vender antes de perderlo todo. Urgencia máxima.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* TAX DEBT */}
                              {lead.property?.tax_delinquent && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="warning" className="text-[10px]">💰 TAX</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>Impuestos Atrasados</strong>{lead.property?.tax_debt ? ` ($${Number(lead.property.tax_debt).toLocaleString()})` : ''}: El dueño no está pagando impuestos, señal de problemas financieros y motivación para vender.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* PROBATE */}
                              {lead.property?.is_probate && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="glow" className="text-[10px]">⚖️ PROBATE</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>Herencia/Sucesión</strong>: Los herederos generalmente no quieren la propiedad y prefieren venta rápida para repartir el dinero.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* LIENS */}
                              {lead.property?.active_liens_count != null && lead.property.active_liens_count > 0 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive" className="text-[10px]">🔗 {lead.property.active_liens_count} LIENS</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>{lead.property.active_liens_count} Gravámenes Activos</strong>: La propiedad tiene deudas registradas. Puede complicar el cierre pero indica presión financiera del dueño.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* STALE MLS */}
                              {lead.property?.days_on_market != null && lead.property.days_on_market > 180 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="info" className="text-[10px]">📉 {lead.property.days_on_market}d MLS</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px]">
                                    <p className="text-xs"><strong>{lead.property.days_on_market} días en MLS</strong>: La propiedad lleva mucho tiempo sin venderse en el mercado público. El vendedor está frustrado y más abierto a ofertas por debajo del mercado.</p>
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

      {/* Archived Leads Section */}
      <ArchivedLeadsSection />

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
