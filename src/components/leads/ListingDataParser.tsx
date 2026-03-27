import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, AlertCircle, Home, DollarSign, MapPin, GraduationCap, TrendingUp, Brain, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useAddPropertyComp } from '@/hooks/usePropertyComps';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ParsedProperty {
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  listing_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lot_size: number | null;
  year_built: number | null;
  property_type: string | null;
  price_per_sqft: number | null;
}

interface ParsedMarketData {
  estimated_monthly_rent: number | null;
  walkability_score: number | null;
  school_rating: number | null;
  tax_assessed_value: number | null;
  days_on_market: number | null;
  zestimate: number | null;
  crime_index: number | null;
  median_price_sqft: number | null;
}

interface SchoolDetail {
  name: string;
  type: string;
  rating: number;
  distance: string | null;
}

interface OfferAnalysis {
  suggested_offer_min: number | null;
  suggested_offer_max: number | null;
  motivation_level: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface RepairEstimate {
  estimated_repair_cost: number;
  repair_level: 'cosmetic' | 'moderate' | 'heavy' | 'gut_rehab';
  cost_per_sqft: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  breakdown: {
    condition_factor: number;
    age_factor: number;
    keywords_found: string[];
  };
}

interface ParsedComp {
  address: string;
  sale_price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
}

interface ParsedData {
  property: ParsedProperty;
  market_data: ParsedMarketData;
  repair_estimate?: RepairEstimate;
  school_details?: SchoolDetail[];
  price_history: Array<{ date: string | null; event: string; price: number }>;
  comps: ParsedComp[];
  seller_motivation_signals: string[];
  listing_description: string | null;
  offer_analysis?: OfferAnalysis;
}

interface ListingDataParserProps {
  propertyId: string;
  leadId?: string;
  currentProperty?: {
    bedrooms?: number | null;
    bathrooms?: number | null;
    sqft?: number | null;
    year_built?: number | null;
    lot_size?: number | null;
    estimated_monthly_rent?: number | null;
    walkability_score?: number | null;
    school_rating?: number | null;
    days_on_market_avg?: number | null;
    crime_index?: number | null;
    repair_cost?: number | null;
  };
  onDataApplied?: () => void;
  onRecalculatePIW?: () => void;
}

export function ListingDataParser({ 
  propertyId, 
  leadId,
  currentProperty, 
  onDataApplied,
  onRecalculatePIW 
}: ListingDataParserProps) {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedComps, setSelectedComps] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [recalculatePIW, setRecalculatePIW] = useState(true);

  const updateProperty = useUpdateProperty();
  const addComp = useAddPropertyComp();

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Pega el texto del listing primero');
      return;
    }

    setIsParsing(true);
    setParsedData(null);
    setSelectedFields(new Set());
    setSelectedComps(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('parse-listing-data', {
        body: { rawText },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setParsedData(data.data);
        // Auto-select all fields by default
        const allFields = new Set<string>();
        Object.keys(data.data.property || {}).forEach(k => {
          if (data.data.property[k] !== null) allFields.add(`property.${k}`);
        });
        Object.keys(data.data.market_data || {}).forEach(k => {
          if (data.data.market_data[k] !== null) allFields.add(`market.${k}`);
        });
        // Auto-select repair estimate if present
        if (data.data.repair_estimate?.estimated_repair_cost) {
          allFields.add('repair.estimated_repair_cost');
        }
        setSelectedFields(allFields);
        // Auto-select all comps
        setSelectedComps(new Set(data.data.comps?.map((_: ParsedComp, i: number) => i) || []));
        toast.success('Datos extraídos exitosamente');
      } else {
        toast.error(data.error || 'Error al parsear');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Error al procesar el listing');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const toggleComp = (index: number) => {
    const newSelected = new Set(selectedComps);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedComps(newSelected);
  };

  const handleApply = async () => {
    if (!parsedData) return;

    setIsApplying(true);

    try {
      // Build property update object with proper type coercion
      const propertyUpdate: Record<string, unknown> = {};
      
      // Integer fields need Math.round()
      if (selectedFields.has('property.bedrooms') && parsedData.property.bedrooms) {
        propertyUpdate.bedrooms = Math.round(Number(parsedData.property.bedrooms));
      }
      if (selectedFields.has('property.bathrooms') && parsedData.property.bathrooms) {
        propertyUpdate.bathrooms = Number(parsedData.property.bathrooms);
      }
      if (selectedFields.has('property.sqft') && parsedData.property.sqft) {
        propertyUpdate.sqft = Math.round(Number(parsedData.property.sqft));
      }
      if (selectedFields.has('property.lot_size') && parsedData.property.lot_size) {
        propertyUpdate.lot_size = Number(parsedData.property.lot_size);
      }
      if (selectedFields.has('property.year_built') && parsedData.property.year_built) {
        propertyUpdate.year_built = Math.round(Number(parsedData.property.year_built));
      }
      if (selectedFields.has('market.estimated_monthly_rent') && parsedData.market_data.estimated_monthly_rent) {
        propertyUpdate.estimated_monthly_rent = Number(parsedData.market_data.estimated_monthly_rent);
      }
      if (selectedFields.has('market.walkability_score') && parsedData.market_data.walkability_score) {
        propertyUpdate.walkability_score = Math.round(Number(parsedData.market_data.walkability_score));
      }
      if (selectedFields.has('market.school_rating') && parsedData.market_data.school_rating) {
        propertyUpdate.school_rating = Number(parsedData.market_data.school_rating);
      }
      if (selectedFields.has('market.days_on_market') && parsedData.market_data.days_on_market) {
        propertyUpdate.days_on_market = Math.round(Number(parsedData.market_data.days_on_market));
      }
      if (selectedFields.has('market.crime_index') && parsedData.market_data.crime_index) {
        propertyUpdate.crime_index = Number(parsedData.market_data.crime_index);
      }
      if (selectedFields.has('repair.estimated_repair_cost') && parsedData.repair_estimate?.estimated_repair_cost !== undefined) {
        propertyUpdate.repair_cost = Number(parsedData.repair_estimate.estimated_repair_cost);
      }

      // Update property if there are fields to update
      if (Object.keys(propertyUpdate).length > 0) {
        await updateProperty.mutateAsync({ id: propertyId, ...propertyUpdate });
      }

      // Update lead's listing_price if selected and leadId is provided
      if (selectedFields.has('property.listing_price') && parsedData.property.listing_price && leadId) {
        const { error: leadError } = await supabase
          .from('leads')
          .update({ listing_price: parsedData.property.listing_price, updated_at: new Date().toISOString() })
          .eq('id', leadId);
        
        if (leadError) {
          console.error('Error updating lead listing_price:', leadError);
          toast.error('Error al actualizar listing price');
        }
      }

      // Add selected comps
      for (const index of selectedComps) {
        const comp = parsedData.comps[index];
        if (comp) {
          await addComp.mutateAsync({
            property_id: propertyId,
            address: comp.address,
            sale_price: comp.sale_price,
            sqft: comp.sqft || undefined,
            bedrooms: comp.bedrooms || undefined,
            bathrooms: comp.bathrooms || undefined,
            source: 'zillow',
          });
        }
      }

      toast.success('Datos aplicados correctamente');
      
      // Trigger PIW recalculation if enabled and callback provided
      if (recalculatePIW && onRecalculatePIW) {
        toast.info('Recalculando K-Score...');
        onRecalculatePIW();
      }

      setOpen(false);
      setRawText('');
      setParsedData(null);
      onDataApplied?.();
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Error al aplicar datos');
    } finally {
      setIsApplying(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const motivationColors = {
    high: 'text-red-500 bg-red-500/10',
    medium: 'text-amber-500 bg-amber-500/10',
    low: 'text-green-500 bg-green-500/10',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Importar de Zillow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Datos de Listing
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <Label>Pega el texto del listing (Zillow, Realtor, Redfin...)</Label>
              <Textarea
                placeholder="Copia y pega toda la información del listing aquí..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="h-[300px] mt-2 font-mono text-xs"
              />
            </div>
            <Button 
              onClick={handleParse} 
              disabled={isParsing || !rawText.trim()}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extraer Datos
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          <ScrollArea className="h-[400px] pr-4">
            {parsedData ? (
              <div className="space-y-4">
                {/* Offer Analysis - Most Important! */}
                {parsedData.offer_analysis && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Análisis de Oferta (IA)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Motivación:</span>
                        <Badge className={motivationColors[parsedData.offer_analysis.motivation_level]}>
                          {parsedData.offer_analysis.motivation_level === 'high' ? '🔥 ALTA' : 
                           parsedData.offer_analysis.motivation_level === 'medium' ? '⚡ MEDIA' : '❄️ BAJA'}
                        </Badge>
                      </div>
                      {(parsedData.offer_analysis.suggested_offer_min || parsedData.offer_analysis.suggested_offer_max) && (
                        <div className="p-3 bg-success/10 rounded-lg border border-success/30">
                          <p className="text-xs text-muted-foreground mb-1">Rango de Oferta Sugerido</p>
                          <p className="text-lg font-bold text-success">
                            {formatCurrency(parsedData.offer_analysis.suggested_offer_min)} - {formatCurrency(parsedData.offer_analysis.suggested_offer_max)}
                          </p>
                        </div>
                      )}
                      {parsedData.offer_analysis.reasoning && (
                        <p className="text-xs text-muted-foreground">
                          {parsedData.offer_analysis.reasoning}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Repair Cost Estimate - Critical for MAO calculation */}
                {parsedData.repair_estimate && (
                  <Card className="border-amber-500/50 bg-amber-500/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-500" />
                        Estimación de Reparaciones (IA)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="repair-cost"
                            checked={selectedFields.has('repair.estimated_repair_cost')}
                            onCheckedChange={() => toggleField('repair.estimated_repair_cost')}
                          />
                          <Label htmlFor="repair-cost" className="text-sm cursor-pointer">
                            Aplicar costo estimado
                          </Label>
                        </div>
                        <Badge variant="outline" className={
                          parsedData.repair_estimate.confidence === 'high' ? 'border-green-500 text-green-500' :
                          parsedData.repair_estimate.confidence === 'medium' ? 'border-amber-500 text-amber-500' :
                          'border-red-500 text-red-500'
                        }>
                          Confianza: {parsedData.repair_estimate.confidence === 'high' ? 'Alta' : 
                                      parsedData.repair_estimate.confidence === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                      </div>
                      
                      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <p className="text-xs text-muted-foreground mb-1">Costo de Reparación Estimado</p>
                        <p className="text-xl font-bold text-amber-500">
                          {formatCurrency(parsedData.repair_estimate.estimated_repair_cost)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${parsedData.repair_estimate.cost_per_sqft}/sqft × {parsedData.property.sqft?.toLocaleString() || '?'} sqft
                        </p>
                        {currentProperty?.repair_cost && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Valor actual: {formatCurrency(currentProperty.repair_cost)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Nivel:</span>
                          <Badge variant="outline" className={
                            parsedData.repair_estimate.repair_level === 'gut_rehab' ? 'bg-red-500/10 text-red-500' :
                            parsedData.repair_estimate.repair_level === 'heavy' ? 'bg-orange-500/10 text-orange-500' :
                            parsedData.repair_estimate.repair_level === 'moderate' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-green-500/10 text-green-500'
                          }>
                            {parsedData.repair_estimate.repair_level === 'gut_rehab' ? '🔨 GUT REHAB' :
                             parsedData.repair_estimate.repair_level === 'heavy' ? '🛠️ HEAVY' :
                             parsedData.repair_estimate.repair_level === 'moderate' ? '🔧 MODERADO' :
                             '✨ COSMÉTICO'}
                          </Badge>
                        </div>
                      </div>

                      {parsedData.repair_estimate.breakdown?.keywords_found?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {parsedData.repair_estimate.breakdown.keywords_found.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {parsedData.repair_estimate.factors?.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {parsedData.repair_estimate.factors.slice(0, 3).map((f, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-amber-500">•</span> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Property Data */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Datos de Propiedad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {parsedData.property.bedrooms !== null && (
                      <FieldRow
                        label="Habitaciones"
                        value={parsedData.property.bedrooms}
                        current={currentProperty?.bedrooms}
                        field="property.bedrooms"
                        selected={selectedFields.has('property.bedrooms')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.property.bathrooms !== null && (
                      <FieldRow
                        label="Baños"
                        value={parsedData.property.bathrooms}
                        current={currentProperty?.bathrooms}
                        field="property.bathrooms"
                        selected={selectedFields.has('property.bathrooms')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.property.sqft !== null && (
                      <FieldRow
                        label="Pies²"
                        value={parsedData.property.sqft?.toLocaleString()}
                        current={currentProperty?.sqft}
                        field="property.sqft"
                        selected={selectedFields.has('property.sqft')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.property.year_built !== null && (
                      <FieldRow
                        label="Año Construcción"
                        value={parsedData.property.year_built}
                        current={currentProperty?.year_built}
                        field="property.year_built"
                        selected={selectedFields.has('property.year_built')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.property.lot_size !== null && (
                      <FieldRow
                        label="Tamaño Lote"
                        value={`${parsedData.property.lot_size?.toLocaleString()} sqft`}
                        current={currentProperty?.lot_size}
                        field="property.lot_size"
                        selected={selectedFields.has('property.lot_size')}
                        onToggle={toggleField}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Market Data */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Datos de Mercado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {parsedData.market_data.estimated_monthly_rent !== null && (
                      <FieldRow
                        label="Renta Estimada"
                        value={formatCurrency(parsedData.market_data.estimated_monthly_rent) + '/mes'}
                        current={currentProperty?.estimated_monthly_rent}
                        field="market.estimated_monthly_rent"
                        selected={selectedFields.has('market.estimated_monthly_rent')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.market_data.walkability_score !== null && (
                      <FieldRow
                        label="Walk Score"
                        value={parsedData.market_data.walkability_score}
                        current={currentProperty?.walkability_score}
                        field="market.walkability_score"
                        selected={selectedFields.has('market.walkability_score')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.market_data.school_rating !== null && (
                      <FieldRow
                        label="Rating Escuelas"
                        value={`${parsedData.market_data.school_rating.toFixed(1)}/10`}
                        current={currentProperty?.school_rating}
                        field="market.school_rating"
                        selected={selectedFields.has('market.school_rating')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.market_data.days_on_market !== null && (
                      <FieldRow
                        label="Días en Mercado"
                        value={parsedData.market_data.days_on_market}
                        current={currentProperty?.days_on_market_avg}
                        field="market.days_on_market"
                        selected={selectedFields.has('market.days_on_market')}
                        onToggle={toggleField}
                      />
                    )}
                    {parsedData.market_data.crime_index !== null && (
                      <FieldRow
                        label="Índice Crimen"
                        value={parsedData.market_data.crime_index}
                        current={currentProperty?.crime_index}
                        field="market.crime_index"
                        selected={selectedFields.has('market.crime_index')}
                        onToggle={toggleField}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* School Details */}
                {parsedData.school_details && parsedData.school_details.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Escuelas Cercanas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {parsedData.school_details.map((school, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                          <div>
                            <p className="font-medium">{school.name}</p>
                            <p className="text-muted-foreground capitalize">{school.type} {school.distance && `• ${school.distance}`}</p>
                          </div>
                          <Badge variant={school.rating >= 7 ? 'default' : school.rating >= 4 ? 'secondary' : 'outline'}>
                            {school.rating}/10
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Motivation Signals */}
                {parsedData.seller_motivation_signals?.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Señales de Motivación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.seller_motivation_signals.map((signal, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comps */}
                {parsedData.comps?.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Comparables ({parsedData.comps.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Propiedades cercanas para agregar como comps
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {parsedData.comps.map((comp, i) => (
                        <div 
                          key={i} 
                          className="flex items-start gap-2 p-2 rounded border bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedComps.has(i)}
                            onCheckedChange={() => toggleComp(i)}
                          />
                          <div className="flex-1 text-xs">
                            <p className="font-medium">{comp.address}</p>
                            <p className="text-muted-foreground">
                              {formatCurrency(comp.sale_price)}
                              {comp.bedrooms && ` • ${comp.bedrooms}bd`}
                              {comp.bathrooms && ` ${comp.bathrooms}ba`}
                              {comp.sqft && ` • ${comp.sqft.toLocaleString()} sqft`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* PIW Recalculation Option */}
                {onRecalculatePIW && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <Checkbox
                      checked={recalculatePIW}
                      onCheckedChange={(checked) => setRecalculatePIW(checked === true)}
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <Brain className="h-4 w-4 text-primary" />
                      <span>Recalcular K-Score después de aplicar</span>
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <Button
                  onClick={handleApply}
                  disabled={isApplying || (selectedFields.size === 0 && selectedComps.size === 0)}
                  className="w-full"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Aplicar Datos Seleccionados
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Pega el texto del listing y haz clic en "Extraer Datos"
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FieldRowProps {
  label: string;
  value: string | number | null;
  current?: number | null;
  field: string;
  selected: boolean;
  onToggle: (field: string) => void;
}

function FieldRow({ label, value, current, field, selected, onToggle }: FieldRowProps) {
  const hasCurrentValue = current !== null && current !== undefined;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(field)}
      />
      <span className="text-muted-foreground w-32">{label}:</span>
      <span className="font-medium">{value}</span>
      {hasCurrentValue && (
        <span className="text-xs text-muted-foreground">(actual: {current})</span>
      )}
    </div>
  );
}
