import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, AlertCircle, Home, DollarSign, MapPin } from 'lucide-react';
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
  price_history: Array<{ date: string | null; event: string; price: number }>;
  comps: ParsedComp[];
  seller_motivation_signals: string[];
  listing_description: string | null;
}

interface ListingDataParserProps {
  propertyId: string;
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
  };
  onDataApplied?: () => void;
}

export function ListingDataParser({ propertyId, currentProperty, onDataApplied }: ListingDataParserProps) {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedComps, setSelectedComps] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

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
      // Build property update object
      const propertyUpdate: Record<string, unknown> = {};
      
      if (selectedFields.has('property.bedrooms') && parsedData.property.bedrooms) {
        propertyUpdate.bedrooms = parsedData.property.bedrooms;
      }
      if (selectedFields.has('property.bathrooms') && parsedData.property.bathrooms) {
        propertyUpdate.bathrooms = parsedData.property.bathrooms;
      }
      if (selectedFields.has('property.sqft') && parsedData.property.sqft) {
        propertyUpdate.sqft = parsedData.property.sqft;
      }
      if (selectedFields.has('property.lot_size') && parsedData.property.lot_size) {
        propertyUpdate.lot_size = parsedData.property.lot_size;
      }
      if (selectedFields.has('property.year_built') && parsedData.property.year_built) {
        propertyUpdate.year_built = parsedData.property.year_built;
      }
      if (selectedFields.has('market.estimated_monthly_rent') && parsedData.market_data.estimated_monthly_rent) {
        propertyUpdate.estimated_monthly_rent = parsedData.market_data.estimated_monthly_rent;
      }
      if (selectedFields.has('market.walkability_score') && parsedData.market_data.walkability_score) {
        propertyUpdate.walkability_score = parsedData.market_data.walkability_score;
      }
      if (selectedFields.has('market.school_rating') && parsedData.market_data.school_rating) {
        propertyUpdate.school_rating = parsedData.market_data.school_rating;
      }
      if (selectedFields.has('market.days_on_market') && parsedData.market_data.days_on_market) {
        propertyUpdate.days_on_market_avg = parsedData.market_data.days_on_market;
      }

      // Update property if there are fields to update
      if (Object.keys(propertyUpdate).length > 0) {
        await updateProperty.mutateAsync({ id: propertyId, ...propertyUpdate });
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
                        value={`${parsedData.market_data.school_rating}/10`}
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
                  </CardContent>
                </Card>

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
