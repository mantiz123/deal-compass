import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUp, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateProperty, type Property } from '@/hooks/useProperties';
import { useAddPropertyComp } from '@/hooks/usePropertyComps';
import { useQueryClient } from '@tanstack/react-query';

interface PropStreamCMAUploaderProps {
  property: Property;
  onComplete?: () => void;
}

type Step = 'idle' | 'extracting' | 'parsing' | 'applying' | 'creating_lead' | 'calculating' | 'done' | 'error';

const stepLabels: Record<Step, string> = {
  idle: 'Listo para subir',
  extracting: 'Extrayendo texto del PDF...',
  parsing: 'Analizando datos con IA...',
  applying: 'Aplicando datos a la propiedad...',
  creating_lead: 'Creando lead...',
  calculating: 'Calculando K-Score...',
  done: '¡Completado!',
  error: 'Error en el proceso',
};

const stepProgress: Record<Step, number> = {
  idle: 0,
  extracting: 15,
  parsing: 35,
  applying: 60,
  creating_lead: 75,
  calculating: 90,
  done: 100,
  error: 0,
};

export function PropStreamCMAUploader({ property, onComplete }: PropStreamCMAUploaderProps) {
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{ fieldsApplied: number; compsAdded: number; leadCreated: boolean; kScore?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const updateProperty = useUpdateProperty();
  const addComp = useAddPropertyComp();
  const queryClient = useQueryClient();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF');
      return;
    }

    setStep('extracting');
    setErrorMsg('');
    setResult(null);

    try {
      // Step 1: Extract text from PDF
      const rawText = await extractTextFromPDF(file);
      
      if (rawText.trim().length < 50) {
        throw new Error('No se pudo extraer suficiente texto del PDF');
      }

      // Step 2: Parse with AI
      setStep('parsing');
      const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-listing-data', {
        body: { rawText },
      });

      if (parseError) throw parseError;
      if (!parseResult?.success || !parseResult?.data) {
        throw new Error(parseResult?.error || 'Error al analizar el CMA');
      }

      const parsed = parseResult.data;

      // Step 3: Apply property data
      setStep('applying');
      const propertyUpdate: Record<string, unknown> = {};
      const prop = parsed.property;
      const ps = parsed.propstream_data;
      const market = parsed.market_data;
      const repair = parsed.repair_estimate;

      // Property basics
      if (prop?.bedrooms) propertyUpdate.bedrooms = Math.round(Number(prop.bedrooms));
      if (prop?.bathrooms) propertyUpdate.bathrooms = Number(prop.bathrooms);
      if (prop?.sqft) propertyUpdate.sqft = Math.round(Number(prop.sqft));
      if (prop?.lot_size) propertyUpdate.lot_size = Number(prop.lot_size);
      if (prop?.year_built) propertyUpdate.year_built = Math.round(Number(prop.year_built));
      if (prop?.property_type) propertyUpdate.property_type = prop.property_type;

      // Market data
      if (market?.estimated_monthly_rent) propertyUpdate.estimated_monthly_rent = Number(market.estimated_monthly_rent);
      if (market?.walkability_score) propertyUpdate.walkability_score = Math.round(Number(market.walkability_score));
      if (market?.school_rating) propertyUpdate.school_rating = Number(market.school_rating);
      if (market?.days_on_market) propertyUpdate.days_on_market = Math.round(Number(market.days_on_market));
      if (market?.crime_index) propertyUpdate.crime_index = Number(market.crime_index);
      if (market?.avg_dom) propertyUpdate.days_on_market_avg = Math.round(Number(market.avg_dom));

      // Repair estimate
      if (repair?.estimated_repair_cost) propertyUpdate.repair_cost = Number(repair.estimated_repair_cost);

      // PropStream-specific data
      if (ps) {
        if (ps.arv) propertyUpdate.arv = Number(ps.arv);
        else if (ps.estimated_value) propertyUpdate.arv = Number(ps.estimated_value);
        if (ps.mortgage_balance != null) propertyUpdate.mortgage_balance = Number(ps.mortgage_balance);
        if (ps.equity_percent != null) propertyUpdate.equity_percent = Number(ps.equity_percent);
        if (ps.monthly_rent) propertyUpdate.estimated_monthly_rent = Number(ps.monthly_rent);
        if (ps.is_foreclosure) propertyUpdate.is_foreclosure = true;
        if (ps.auction_date) propertyUpdate.auction_date = ps.auction_date;
        if (ps.prefc_recording_date) propertyUpdate.prefc_recording_date = ps.prefc_recording_date;
        if (ps.prefc_default_amount) propertyUpdate.prefc_default_amount = Number(ps.prefc_default_amount);
        if (ps.prefc_unpaid_balance) propertyUpdate.prefc_unpaid_balance = Number(ps.prefc_unpaid_balance);
        if (ps.lien_amount != null) propertyUpdate.lien_amount = Number(ps.lien_amount);
        if (ps.lien_type) propertyUpdate.lien_type = ps.lien_type;
        if (ps.lien_date) propertyUpdate.lien_date = ps.lien_date;
        if (ps.active_liens_count != null) propertyUpdate.active_liens_count = Number(ps.active_liens_count);
        if (ps.last_sale_price) propertyUpdate.last_sale_price = Number(ps.last_sale_price);
        if (ps.last_sale_date) propertyUpdate.last_sale_date = ps.last_sale_date;
        if (ps.owner_name) propertyUpdate.owner_name = ps.owner_name;
        if (ps.owner_tenure_years != null) propertyUpdate.owner_tenure_years = Math.round(Number(ps.owner_tenure_years));
        if (ps.days_on_market) propertyUpdate.days_on_market = Math.round(Number(ps.days_on_market));
        if (ps.days_on_market_avg) propertyUpdate.days_on_market_avg = Math.round(Number(ps.days_on_market_avg));
        if (ps.is_vacant != null) propertyUpdate.is_vacant = ps.is_vacant;
        if (ps.is_absentee_owner != null) propertyUpdate.is_absentee_owner = ps.is_absentee_owner;
      }

      propertyUpdate.data_source = 'propstream_cma';
      propertyUpdate.data_fetched_at = new Date().toISOString();

      if (Object.keys(propertyUpdate).length > 0) {
        await updateProperty.mutateAsync({ id: property.id, ...propertyUpdate });
      }

      // Add comps
      let compsAdded = 0;
      if (parsed.comps?.length > 0) {
        for (const comp of parsed.comps) {
          if (comp?.address && comp?.sale_price) {
            try {
              await addComp.mutateAsync({
                property_id: property.id,
                address: comp.address,
                sale_price: comp.sale_price,
                sqft: comp.sqft || undefined,
                bedrooms: comp.bedrooms || undefined,
                bathrooms: comp.bathrooms || undefined,
                distance_miles: comp.distance_miles || undefined,
                sale_date: comp.sale_date || undefined,
                source: 'propstream',
              });
              compsAdded++;
            } catch (e) {
              console.warn('Error adding comp:', e);
            }
          }
        }
      }

      // Step 4: Check if lead exists, create if not
      setStep('creating_lead');
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('property_id', property.id)
        .is('archived_at', null)
        .limit(1);

      let leadId: string;
      let leadCreated = false;

      if (existingLeads && existingLeads.length > 0) {
        leadId = existingLeads[0].id;
        // Update listing price if available
        const listingPrice = prop?.listing_price || ps?.estimated_value;
        if (listingPrice) {
          await supabase
            .from('leads')
            .update({ listing_price: Number(listingPrice), updated_at: new Date().toISOString() })
            .eq('id', leadId);
        }
      } else {
        const listingPrice = prop?.listing_price || ps?.estimated_value;
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            property_id: property.id,
            source: 'propstream',
            status: 'captacion' as const,
            listing_price: listingPrice ? Number(listingPrice) : null,
          })
          .select('id')
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
        leadCreated = true;
      }

      // Step 5: Calculate K-Score
      setStep('calculating');
      try {
        const { data: scoreResult } = await supabase.functions.invoke('calculate-piw-score', {
          body: { leadId },
        });
        
        setResult({
          fieldsApplied: Object.keys(propertyUpdate).length,
          compsAdded,
          leadCreated,
          kScore: scoreResult?.score,
        });
      } catch (e) {
        console.warn('K-Score calculation error:', e);
        setResult({
          fieldsApplied: Object.keys(propertyUpdate).length,
          compsAdded,
          leadCreated,
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', property.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['property-comps', property.id] });

      setStep('done');
      toast.success('✅ CMA procesado exitosamente');
      onComplete?.();
    } catch (error) {
      console.error('CMA upload error:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Error procesando el CMA');
      setStep('error');
      toast.error('Error al procesar el CMA');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = !['idle', 'done', 'error'].includes(step);

  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          PropStream CMA
        </h4>
        {step === 'done' && (
          <Badge variant="success" className="text-xs">Completado</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Sube un PDF de PropStream CMA para extraer automáticamente todos los datos, crear el lead y calcular el K-Score.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isProcessing}
      />

      {step === 'idle' && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="h-4 w-4" />
          Subir CMA PDF
        </Button>
      )}

      {isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{stepLabels[step]}</span>
          </div>
          <Progress value={stepProgress[step]} className="h-2" />
        </div>
      )}

      {step === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => { setStep('idle'); fileInputRef.current?.click(); }}
          >
            <FileUp className="h-4 w-4" />
            Intentar de nuevo
          </Button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>{result.fieldsApplied} campos aplicados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>{result.compsAdded} comps añadidos</span>
            </div>
            {result.leadCreated && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>Lead creado</span>
              </div>
            )}
            {result.kScore && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>K-Score: {result.kScore}</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 mt-2"
            onClick={() => { setStep('idle'); setResult(null); fileInputRef.current?.click(); }}
          >
            <FileUp className="h-4 w-4" />
            Subir otro CMA
          </Button>
        </div>
      )}
    </Card>
  );
}
