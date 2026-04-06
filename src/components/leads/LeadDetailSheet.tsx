import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { KScoreGauge } from '@/components/dashboard/KScoreGauge';
import { LeadTimeline } from './LeadTimeline';
import { LeadDocuments } from './LeadDocuments';
import { NewInteractionDialog } from './NewInteractionDialog';
import { AIPropertyInsights } from './AIPropertyInsights';
import { PropertyCompsManager } from './PropertyCompsManager';
import { MarketDataInput } from './MarketDataInput';
import { DealPackageGenerator } from './DealPackageGenerator';
import { ListingDataParser } from './ListingDataParser';
import { LogConversationDialog } from './LogConversationDialog';
import { ConversationHistory } from './ConversationHistory';
import { useInteractions } from '@/hooks/useInteractions';
import { usePermanentlyDeleteLead } from '@/hooks/useArchiveLead';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useLatestConversation } from '@/hooks/useSellerConversations';
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
  MessageSquare,
  Gavel,
  Trash2,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
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
  const navigate = useNavigate();
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [showDealPackage, setShowDealPackage] = useState(false);
  const [showLogConversation, setShowLogConversation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteLead = usePermanentlyDeleteLead();
  const { data: interactions, isLoading: loadingInteractions } = useInteractions(lead?.id || '');
  const { data: latestConversation } = useLatestConversation(lead?.id);
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
              <div className="flex items-center gap-2">
                <Badge variant={statusConfig[lead.status]?.variant || 'secondary'}>
                  {statusConfig[lead.status]?.label || lead.status}
                </Badge>
                {lead.archived_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* K-Score Header */}
          <Card variant="glass" className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <KScoreGauge score={lead.piw_score || 0} size="md" />
                <div>
                  <p className="text-sm text-muted-foreground">K-Score</p>
                  <p className="text-2xl font-bold">{lead.piw_score || 0}%</p>
                  <Badge 
                    variant={priority === 'hot' ? 'accent' : priority === 'warm' ? 'warning' : 'secondary'}
                    className="mt-1"
                  >
                    {priority === 'hot' ? '🔥 HOT' : priority === 'warm' ? '⚡ WARM' : '❄️ COLD'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLogConversation(true)}
                  size="sm"
                  className="bg-primary/10 border-primary/30 hover:bg-primary/20"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Log Llamada
                </Button>
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
                <Button 
                  variant="outline"
                  onClick={() => { onOpenChange(false); navigate(`/contracts/new?lead_id=${lead.id}`); }}
                  size="sm"
                  className="bg-primary/10 border-primary/30 hover:bg-primary/20"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  📄 Contrato
                </Button>
              </div>
            </div>

            {/* Latest Conversation Indicator */}
            {latestConversation && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Última conversación:</span>
                  <span className="font-medium">
                    {format(new Date(latestConversation.conversation_date), "d MMM", { locale: es })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    (latestConversation.ai_adjusted_score ?? 0) >= 80 ? 'bg-green-500/10 text-green-500' :
                    (latestConversation.ai_adjusted_score ?? 0) >= 50 ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    Score ajustado: {latestConversation.ai_adjusted_score}
                  </span>
                </div>
              </div>
            )}

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
          <Tabs defaultValue="conversations" className="w-full">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="conversations" className="gap-1 text-xs sm:text-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Seller</span>
              </TabsTrigger>
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

            {/* Conversations Tab - Seller Intelligence */}
            <TabsContent value="conversations" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Seller Conversation Intelligence
                </h3>
                <Button size="sm" onClick={() => setShowLogConversation(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar Llamada
                </Button>
              </div>
              <ConversationHistory leadId={lead.id} />
            </TabsContent>

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
                      <p className="text-muted-foreground">MAO <span className="text-[10px]">(ARV×70% - Repairs)</span></p>
                      <p className="font-medium text-lg text-success">
                        {calculatedMao > 0 ? `$${calculatedMao.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hipoteca Pendiente</p>
                      <p className="font-medium">
                        {property?.mortgage_balance ? `$${Number(property.mortgage_balance).toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Equity $</p>
                      {(() => {
                        const mortBal = property?.mortgage_balance ? Number(property.mortgage_balance) : 0;
                        const netEq = calculatedArv > 0 && mortBal > 0 ? calculatedArv - mortBal : 0;
                        const color = netEq > 100000 ? 'text-success' : netEq > 50000 ? 'text-accent' : 'text-foreground';
                        return netEq > 0 ? (
                          <p className={`font-medium text-lg ${color}`}>${netEq.toLocaleString()}</p>
                        ) : (
                          <p className="font-medium">N/A</p>
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Equity %</p>
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
                    {lead.listing_price && (
                      <div>
                        <p className="text-muted-foreground">Listing Price</p>
                        <p className="font-medium">${Number(lead.listing_price).toLocaleString()}</p>
                      </div>
                    )}
                    {lead.assignment_fee && (
                      <div>
                        <p className="text-muted-foreground">Fee Cesión</p>
                        <p className="font-medium text-success">${Number(lead.assignment_fee).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Spread & Fee Rango Summary */}
                  {(() => {
                    const mao = calculatedMao;
                    const acqCost = Number(lead.offer_amount) || Number(lead.listing_price) || Number(property?.last_sale_price) || 0;
                    const spread = mao > 0 && acqCost > 0 ? mao - acqCost : 0;
                    if (spread <= 0) return null;
                    const feeMin = Math.max(5000, Math.round(spread * 0.3));
                    const feeMax = Math.round(spread * 0.6);
                    return (
                      <Card className="p-3 bg-primary/5 border-primary/20">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Spread</p>
                            <p className="font-bold text-success text-lg">+${spread.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Fee Rango Recomendado</p>
                            <p className="font-bold text-primary text-lg">
                              ${(feeMin/1000).toFixed(0)}K – ${(feeMax/1000).toFixed(0)}K
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })()}

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

              {/* Owner Info & Contact */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contacto del Propietario
                </h3>
                <Card variant="glass" className="p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{property?.owner_name || 'Desconocido'}</span>
                      {property?.owner_type && (
                        <Badge variant="secondary" className="text-[10px]">{property.owner_type}</Badge>
                      )}
                    </div>
                    
                    {/* All Phones */}
                    {(() => {
                      const phones = [
                        { num: property?.owner_phone, type: (property as any)?.phone_1_type, dnc: (property as any)?.phone_1_dnc, label: 'Tel 1' },
                        { num: (property as any)?.phone_2, type: (property as any)?.phone_2_type, dnc: (property as any)?.phone_2_dnc, label: 'Tel 2' },
                        { num: (property as any)?.phone_3, type: (property as any)?.phone_3_type, dnc: (property as any)?.phone_3_dnc, label: 'Tel 3' },
                        { num: (property as any)?.phone_4, type: (property as any)?.phone_4_type, dnc: (property as any)?.phone_4_dnc, label: 'Tel 4' },
                        { num: (property as any)?.phone_5, type: (property as any)?.phone_5_type, dnc: (property as any)?.phone_5_dnc, label: 'Tel 5' },
                      ].filter(p => p.num);
                      
                      if (phones.length === 0) {
                        return (
                          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                            <Phone className="h-4 w-4 text-destructive" />
                            <span className="text-destructive text-xs font-medium">Sin teléfono — Requiere skip-tracing</span>
                          </div>
                        );
                      }
                      
                      return phones.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${p.num}`} className="hover:text-primary font-mono text-xs">{p.num}</a>
                          {p.type && <Badge variant="secondary" className="text-[9px] px-1">{p.type}</Badge>}
                          {p.dnc && <Badge variant="destructive" className="text-[9px] px-1">DNC</Badge>}
                        </div>
                      ));
                    })()}

                    {/* Emails */}
                    {(() => {
                      const emails = [
                        property?.owner_email,
                        (property as any)?.owner_email_2,
                        (property as any)?.owner_email_3,
                      ].filter(Boolean);
                      return emails.length > 0 ? emails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${email}`} className="hover:text-primary text-xs">{email}</a>
                        </div>
                      )) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="text-xs">Sin email</span>
                        </div>
                      );
                    })()}

                    <Separator />
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Tenencia: {property?.owner_tenure_years ? `${property.owner_tenure_years} años` : 'N/A'}</span>
                    </div>
                    {(property as any)?.is_litigator && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">⚠️ LITIGATOR — Precaución al contactar</span>
                      </div>
                    )}
                    {(property as any)?.do_not_mail && (
                      <div className="flex items-center gap-2 text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">🚫 DO NOT MAIL</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Distress Signals Detail */}
              {(() => {
                const bkDate = (property as any)?.bk_date;
                const divorceDate = (property as any)?.divorce_date;
                const prefcDate = (property as any)?.prefc_recording_date;
                const prefcBalance = (property as any)?.prefc_unpaid_balance;
                const prefcDefault = (property as any)?.prefc_default_amount;
                const prefcBid = (property as any)?.prefc_opening_bid;
                const lienType = (property as any)?.lien_type;
                const lienAmount = (property as any)?.lien_amount;
                const mlsAgent = (property as any)?.mls_agent_name;
                const mlsAgentPhone = (property as any)?.mls_agent_phone;
                const mlsAgentEmail = (property as any)?.mls_agent_email;
                const hasDistress = bkDate || divorceDate || prefcDate || lienType || mlsAgent;
                
                if (!hasDistress) return null;
                
                return (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Señales de Distress
                    </h3>
                    <Card variant="glass" className="p-4 space-y-3 text-sm">
                      {prefcDate && (
                        <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive">🔨 Pre-Foreclosure</p>
                          <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                            <div><span className="text-muted-foreground">Recording:</span> {format(new Date(prefcDate), "d MMM yyyy", { locale: es })}</div>
                            {prefcBalance && <div><span className="text-muted-foreground">Balance:</span> ${Number(prefcBalance).toLocaleString()}</div>}
                            {prefcDefault && <div><span className="text-muted-foreground">Default:</span> ${Number(prefcDefault).toLocaleString()}</div>}
                            {prefcBid && <div><span className="text-muted-foreground">Opening Bid:</span> ${Number(prefcBid).toLocaleString()}</div>}
                          </div>
                        </div>
                      )}
                      {bkDate && (
                        <div className="p-2 rounded bg-warning/10 border border-warning/20">
                          <p className="text-xs font-semibold text-warning">⚖️ Bankruptcy</p>
                          <p className="text-xs mt-1">Fecha: {format(new Date(bkDate), "d MMM yyyy", { locale: es })}</p>
                        </div>
                      )}
                      {divorceDate && (
                        <div className="p-2 rounded bg-accent/10 border border-accent/20">
                          <p className="text-xs font-semibold text-accent">💔 Divorcio</p>
                          <p className="text-xs mt-1">Fecha: {format(new Date(divorceDate), "d MMM yyyy", { locale: es })}</p>
                        </div>
                      )}
                      {lienType && (
                        <div className="p-2 rounded bg-warning/10 border border-warning/20">
                          <p className="text-xs font-semibold text-warning">🔗 Lien: {lienType}</p>
                          {lienAmount && <p className="text-xs mt-1">Monto: ${Number(lienAmount).toLocaleString()}</p>}
                        </div>
                      )}
                      {mlsAgent && (
                        <div className="p-2 rounded bg-primary/10 border border-primary/20">
                          <p className="text-xs font-semibold text-primary">🏠 Agente MLS</p>
                          <div className="text-xs mt-1 space-y-0.5">
                            <p>{mlsAgent}</p>
                            {mlsAgentPhone && <p><a href={`tel:${mlsAgentPhone}`} className="hover:text-primary">{mlsAgentPhone}</a></p>}
                            {mlsAgentEmail && <p><a href={`mailto:${mlsAgentEmail}`} className="hover:text-primary">{mlsAgentEmail}</a></p>}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })()}

              {/* Auction Date Countdown */}
              {property?.is_foreclosure && (
                <AuctionDateAlert auctionDate={property?.auction_date} />
              )}

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

      {/* Log Conversation Dialog */}
      <LogConversationDialog
        open={showLogConversation}
        onOpenChange={setShowLogConversation}
        leadId={lead.id}
        currentPiwScore={lead.piw_score || 0}
        propertyAddress={`${property?.address || ''}, ${property?.city || ''}`}
      />

      {/* Permanent delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Lead Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar permanentemente <strong>{property?.address}</strong>. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteLead.mutate({ leadId: lead.id, address: lead.property?.address, city: lead.property?.city }, {
                  onSuccess: () => onOpenChange(false),
                });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AuctionDateAlert({ auctionDate }: { auctionDate: string | null | undefined }) {
  if (!auctionDate) {
    return (
      <Card className="p-3 border-warning/30 bg-warning/5">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Pre-Foreclosure</span>
          <span className="text-xs text-muted-foreground ml-auto">Sin fecha de subasta registrada</span>
        </div>
      </Card>
    );
  }

  const auction = new Date(auctionDate);
  const daysUntil = differenceInDays(auction, new Date());
  const expired = isPast(auction);

  const urgencyColor = expired
    ? 'border-destructive/50 bg-destructive/10'
    : daysUntil <= 7
    ? 'border-destructive/40 bg-destructive/5'
    : daysUntil <= 30
    ? 'border-warning/40 bg-warning/5'
    : 'border-accent/30 bg-accent/5';

  const textColor = expired || daysUntil <= 7 ? 'text-destructive' : daysUntil <= 30 ? 'text-warning' : 'text-accent';

  return (
    <Card className={`p-4 ${urgencyColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className={`h-5 w-5 ${textColor}`} />
          <div>
            <p className={`text-sm font-bold ${textColor}`}>
              {expired ? '⚠️ SUBASTA VENCIDA' : '🔨 Fecha de Subasta'}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(auction, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="text-right">
          {expired ? (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30">
              EXPIRADO
            </Badge>
          ) : (
            <div>
              <p className={`text-2xl font-bold ${textColor}`}>{daysUntil}</p>
              <p className="text-[10px] text-muted-foreground">días restantes</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
