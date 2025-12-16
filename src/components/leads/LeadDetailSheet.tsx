import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PIWScoreGauge } from '@/components/dashboard/PIWScoreGauge';
import { LeadTimeline } from './LeadTimeline';
import { LeadDocuments } from './LeadDocuments';
import { NewInteractionDialog } from './NewInteractionDialog';
import { AIPropertyInsights } from './AIPropertyInsights';
import { PropertyCompsManager } from './PropertyCompsManager';
import { MarketDataInput } from './MarketDataInput';
import { DealPackageGenerator } from './DealPackageGenerator';
import { ListingDataParser } from './ListingDataParser';
import { useInteractions } from '@/hooks/useInteractions';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  DollarSign,
  Calendar,
  Plus,
  Brain,
  Loader2,
  Sparkles,
  Clock,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Save,
  TrendingUp,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Lead } from '@/hooks/useLeads';

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecalculate?: () => void;
  isCalculating?: boolean;
}

const statusConfig: Record<string, { label: string; variant: "accent" | "warning" | "secondary" | "glow" }> = {
  captacion: { label: "Captación", variant: "secondary" },
  contacto: { label: "Contacto", variant: "warning" },
  bajo_contrato: { label: "Bajo Contrato", variant: "accent" },
  cesion: { label: "Cesión", variant: "glow" },
  cerrado: { label: "Cerrado", variant: "secondary" },
};

export function LeadDetailSheet({ 
  lead, 
  open, 
  onOpenChange, 
  onRecalculate,
  isCalculating 
}: LeadDetailSheetProps) {
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [showDealPackage, setShowDealPackage] = useState(false);
  const { data: interactions, isLoading: loadingInteractions } = useInteractions(lead?.id || '');
  const updateProperty = useUpdateProperty();
  const queryClient = useQueryClient();
  
  // Editable financial fields
  const [repairCost, setRepairCost] = useState<string>('');
  const [medianPriceSqft, setMedianPriceSqft] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when lead changes
  useEffect(() => {
    if (lead?.property) {
      setRepairCost(lead.property.repair_cost?.toString() || '');
      setMedianPriceSqft('');
    }
  }, [lead?.property?.id]);

  if (!lead) return null;

  const property = lead.property;
  const factors = lead.piw_score_factors as any;
  const priority = factors?.priority || (
    (lead.piw_score || 0) >= 80 ? 'hot' : 
    (lead.piw_score || 0) >= 50 ? 'warm' : 'cold'
  );

  // Calculate ARV from median $/sqft if provided
  const sqft = property?.sqft || 0;
  const currentArv = property?.arv ? Number(property.arv) : 0;
  const calculatedArv = medianPriceSqft && sqft 
    ? sqft * parseFloat(medianPriceSqft) 
    : currentArv;
  
  // Calculate MAO: ARV × 70% - Repair Cost
  const repairCostNum = parseFloat(repairCost) || 0;
  const calculatedMao = calculatedArv > 0 
    ? Math.round(calculatedArv * 0.7 - repairCostNum)
    : 0;

  const handleSaveFinancials = async () => {
    if (!property?.id) return;
    
    setIsSaving(true);
    try {
      const updates: Record<string, number | null> = {
        repair_cost: repairCostNum || null,
        mao: calculatedMao > 0 ? calculatedMao : null,
      };
      
      // Update ARV if calculated from median $/sqft
      if (medianPriceSqft && calculatedArv > 0) {
        updates.arv = calculatedArv;
      }

      await updateProperty.mutateAsync({
        id: property.id,
        ...updates,
      });
      
      // Invalidate leads query to refresh data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = repairCost !== (property?.repair_cost?.toString() || '') || medianPriceSqft !== '';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle className="text-xl">
                  {property?.address || 'Sin dirección'}
                </SheetTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  {property?.city}, {property?.state} {property?.zip_code}
                </div>
              </div>
              <Badge variant={statusConfig[lead.status]?.variant || 'secondary'}>
                {statusConfig[lead.status]?.label || lead.status}
              </Badge>
            </div>
          </SheetHeader>

          {/* PIW Score Header */}
          <Card variant="glass" className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <PIWScoreGauge score={lead.piw_score || 0} size="md" />
                <div>
                  <p className="text-sm text-muted-foreground">PIW Score</p>
                  <p className="text-2xl font-bold">{lead.piw_score || 0}%</p>
                  <Badge 
                    variant={priority === 'hot' ? 'accent' : priority === 'warm' ? 'warning' : 'secondary'}
                    className="mt-1"
                  >
                    {priority === 'hot' ? '🔥 HOT' : priority === 'warm' ? '⚡ WARM' : '❄️ COLD'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={onRecalculate}
                  disabled={isCalculating}
                  size="sm"
                >
                  {isCalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="mr-2 h-4 w-4" />
                  )}
                  Recalcular
                </Button>
                <Button 
                  onClick={() => setShowDealPackage(true)}
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Deal Package
                </Button>
              </div>
            </div>

            {/* Score Breakdown */}
            {factors && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Motivación Vendedor</p>
                  <p className="text-lg font-semibold">{factors.seller_motivation_score || 0}/40</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Viabilidad Financiera</p>
                  <p className="text-lg font-semibold">{factors.financial_viability_score || 0}/35</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dificultad Cierre</p>
                  <p className="text-lg font-semibold">{factors.closing_difficulty_score || 0}/25</p>
                </div>
              </div>
            )}
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="timeline" className="gap-1 text-xs sm:text-sm">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="gap-1 text-xs sm:text-sm">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">IA</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-1 text-xs sm:text-sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Detalles</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Docs</span>
              </TabsTrigger>
            </TabsList>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Historial de Interacciones</h3>
                <Button size="sm" onClick={() => setShowNewInteraction(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </Button>
              </div>
              
              {loadingInteractions ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <LeadTimeline interactions={interactions || []} />
              )}
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai-insights" className="mt-4">
              <AIPropertyInsights lead={lead} />
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-6">
              {/* Property Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Información de la Propiedad
                </h3>
                <Card variant="glass" className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium capitalize">{property?.property_type?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Año Construcción</p>
                      <p className="font-medium">{property?.year_built || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Superficie</p>
                      <p className="font-medium">{property?.sqft ? `${property.sqft.toLocaleString()} sqft` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Habitaciones</p>
                      <p className="font-medium">{property?.bedrooms || 'N/A'} bd / {property?.bathrooms || 'N/A'} ba</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Financial Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Información Financiera
                </h3>
                <Card variant="glass" className="p-4 space-y-4">
                  {/* Display Values */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">ARV {medianPriceSqft && <span className="text-accent">(calculado)</span>}</p>
                      <p className="font-medium text-lg">
                        {calculatedArv > 0 ? `$${Math.round(calculatedArv).toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">MAO {(repairCost || medianPriceSqft) && calculatedMao > 0 && <span className="text-accent">(calculado)</span>}</p>
                      <p className="font-medium text-lg text-success">
                        {calculatedMao > 0 ? `$${calculatedMao.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Equity</p>
                      <p className="font-medium">{property?.equity_percent ? `${property.equity_percent}%` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Superficie</p>
                      <p className="font-medium">{sqft ? `${sqft.toLocaleString()} sqft` : 'N/A'}</p>
                    </div>
                    {lead.offer_amount && (
                      <div>
                        <p className="text-muted-foreground">Oferta</p>
                        <p className="font-medium text-primary">${Number(lead.offer_amount).toLocaleString()}</p>
                      </div>
                    )}
                    {lead.assignment_fee && (
                      <div>
                        <p className="text-muted-foreground">Fee Cesión</p>
                        <p className="font-medium text-success">${Number(lead.assignment_fee).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Editable Fields */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calculator className="h-4 w-4" />
                      <span>Calculadora de Comps y MAO</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="medianPriceSqft" className="text-xs flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Median $/SqFt (Mercado)
                        </Label>
                        <Input
                          id="medianPriceSqft"
                          type="number"
                          placeholder="ej: 105"
                          value={medianPriceSqft}
                          onChange={(e) => setMedianPriceSqft(e.target.value)}
                          className="bg-secondary/50"
                        />
                        {medianPriceSqft && sqft > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ARV = {sqft.toLocaleString()} × ${medianPriceSqft} = <span className="text-accent font-medium">${Math.round(calculatedArv).toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="repairCost" className="text-xs flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Costo Reparación
                        </Label>
                        <Input
                          id="repairCost"
                          type="number"
                          placeholder="ej: 25000"
                          value={repairCost}
                          onChange={(e) => setRepairCost(e.target.value)}
                          className="bg-secondary/50"
                        />
                      </div>
                    </div>

                    {/* MAO Calculation Display */}
                    {calculatedArv > 0 && (
                      <Card className="p-3 bg-success/10 border-success/30">
                        <div className="text-xs text-muted-foreground mb-1">
                          Fórmula MAO: ARV × 70% - Reparaciones
                        </div>
                        <div className="text-sm">
                          ${Math.round(calculatedArv).toLocaleString()} × 0.70 - ${repairCostNum.toLocaleString()} = 
                          <span className="text-success font-bold text-lg ml-2">
                            ${calculatedMao > 0 ? calculatedMao.toLocaleString() : '0'}
                          </span>
                        </div>
                      </Card>
                    )}

                    {/* Save Button */}
                    {hasChanges && (
                      <Button 
                        onClick={handleSaveFinancials} 
                        disabled={isSaving}
                        className="w-full"
                        size="sm"
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar Cambios
                      </Button>
                    )}
                  </div>
                </Card>
              </div>

              {/* Owner Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información del Propietario
                </h3>
                <Card variant="glass" className="p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{property?.owner_name || 'Desconocido'}</span>
                    </div>
                    {property?.owner_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${property.owner_phone}`} className="hover:text-primary">
                          {property.owner_phone}
                        </a>
                      </div>
                    )}
                    {property?.owner_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${property.owner_email}`} className="hover:text-primary">
                          {property.owner_email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Tenencia: {property?.owner_tenure_years ? `${property.owner_tenure_years} años` : 'N/A'}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Indicators */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Indicadores
                </h3>
                <div className="flex flex-wrap gap-2">
                  {property?.is_absentee_owner && (
                    <Badge variant="info">Absentee Owner</Badge>
                  )}
                  {property?.tax_delinquent && (
                    <Badge variant="warning">Tax Delinquent</Badge>
                  )}
                  {property?.is_foreclosure && (
                    <Badge variant="accent">Foreclosure</Badge>
                  )}
                  {property?.is_probate && (
                    <Badge variant="glow">Probate</Badge>
                  )}
                  {property?.mailing_address_different && (
                    <Badge variant="secondary">Mailing Address Different</Badge>
                  )}
                  {(property?.active_liens_count || 0) > 0 && (
                    <Badge variant="warning">{property?.active_liens_count} Liens</Badge>
                  )}
                </div>
              </div>

              {/* Key Indicators from AI */}
              {factors?.key_indicators && factors.key_indicators.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Indicadores Clave (IA)
                  </h3>
                  <ul className="space-y-1">
                    {factors.key_indicators.map((indicator: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks from AI */}
              {factors?.risks && factors.risks.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Riesgos Identificados (IA)
                  </h3>
                  <ul className="space-y-1">
                    {factors.risks.map((risk: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dates */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fechas
                </h3>
                <Card variant="glass" className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Creado</p>
                      <p className="font-medium">
                        {format(new Date(lead.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                    {lead.last_contact_at && (
                      <div>
                        <p className="text-muted-foreground">Último Contacto</p>
                        <p className="font-medium">
                          {format(new Date(lead.last_contact_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                    {lead.next_follow_up_at && (
                      <div>
                        <p className="text-muted-foreground">Próximo Seguimiento</p>
                        <p className="font-medium text-primary">
                          {format(new Date(lead.next_follow_up_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                    {lead.closing_date && (
                      <div>
                        <p className="text-muted-foreground">Fecha Cierre</p>
                        <p className="font-medium text-success">
                          {format(new Date(lead.closing_date), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Import from Listing */}
              {property && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Enriquecer Datos
                  </h3>
                  <ListingDataParser 
                    propertyId={property.id}
                    leadId={lead.id}
                    currentProperty={{
                      bedrooms: property.bedrooms,
                      bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
                      sqft: property.sqft,
                      year_built: property.year_built,
                      lot_size: property.lot_size ? Number(property.lot_size) : null,
                      estimated_monthly_rent: property.estimated_monthly_rent ? Number(property.estimated_monthly_rent) : null,
                      walkability_score: property.walkability_score,
                      school_rating: property.school_rating ? Number(property.school_rating) : null,
                      days_on_market_avg: property.days_on_market_avg,
                      crime_index: property.crime_index ? Number(property.crime_index) : null,
                    }}
                    onDataApplied={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
                    onRecalculatePIW={onRecalculate}
                  />
                </div>
              )}

              {/* Property Comps */}
              {property && (
                <PropertyCompsManager 
                  propertyId={property.id} 
                  propertySqft={property.sqft || null}
                  currentArv={property.arv ? Number(property.arv) : null}
                />
              )}

              {/* Market Data */}
              {property && (
                <MarketDataInput property={property as any} />
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <LeadDocuments leadId={lead.id} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* New Interaction Dialog */}
      <NewInteractionDialog
        leadId={lead.id}
        open={showNewInteraction}
        onOpenChange={setShowNewInteraction}
      />

      {/* Deal Package Generator */}
      <DealPackageGenerator
        leadId={lead.id}
        propertyAddress={`${property?.address || ''}, ${property?.city || ''}`}
        currentAssignmentFee={lead.assignment_fee ? Number(lead.assignment_fee) : undefined}
        open={showDealPackage}
        onOpenChange={setShowDealPackage}
      />
    </>
  );
}
