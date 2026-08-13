import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import { useCreateDeal, useAddDealComps } from '@/hooks/useDeals';
import { toast } from 'sonner';
import { FileUp, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = 'idle' | 'reading' | 'extracting' | 'uploading' | 'review' | 'saving';

interface ExtractedComp {
  address: string;
  price: number | null;
  status: string;
  closed_date: string | null;
  distance_miles: number | null;
  similarity_score: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lot_size_acres: number | null;
  year_built: number | null;
  days_on_market: number | null;
  notes: string | null;
}

interface Extraction {
  subject: Record<string, unknown>;
  comps: ExtractedComp[];
  publicVsListing: { field: string; publicValue: string; listingValue: string }[];
  rehabSignals: string[];
}

const NUMERIC_FIELDS = [
  'bedrooms',
  'bathrooms',
  'sqft',
  'lot_size_acres',
  'year_built',
  'list_price',
  'cma_recommended_offer',
  'rvm_value',
  'rvm_range_low',
  'rvm_range_high',
  'assessed_value',
  'annual_taxes',
];

const FIELD_LABELS: Record<string, string> = {
  address: 'Dirección',
  city: 'Ciudad',
  state: 'Estado',
  zip_code: 'ZIP',
  county: 'Condado',
  mls_id: 'MLS ID',
  apn: 'APN',
  property_type: 'Tipo',
  bedrooms: 'Habitaciones',
  bathrooms: 'Baños',
  sqft: 'Sqft',
  lot_size_acres: 'Lote (ac)',
  year_built: 'Año',
  list_price: 'List Price',
  cma_recommended_offer: 'CMA Offer',
  rvm_value: 'RVM',
  rvm_range_low: 'RVM bajo',
  rvm_range_high: 'RVM alto',
  assessed_value: 'Assessed Value',
  annual_taxes: 'Impuestos anuales',
  zoning: 'Zoning',
  heating: 'Heating',
  cooling: 'Cooling',
  foundation: 'Foundation',
  roof: 'Roof',
  basement: 'Basement',
};

const EDITABLE_FIELDS = Object.keys(FIELD_LABELS);

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + '\n\n';
  }
  return text;
}

export default function DealNew() {
  const navigate = useNavigate();
  const orgId = useCurrentOrgIdSafe();
  const createDeal = useCreateDeal();
  const addComps = useAddDealComps();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [subject, setSubject] = useState<Record<string, string>>({});
  const [comps, setComps] = useState<ExtractedComp[]>([]);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  const progress = { idle: 0, reading: 20, extracting: 55, uploading: 80, review: 100, saving: 100 }[step];

  const handleFile = async (file: File) => {
    setError('');
    if (file.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF');
      return;
    }
    try {
      setStep('reading');
      const rawText = await extractPdfText(file);
      if (rawText.trim().length < 200) throw new Error('El PDF no contiene texto legible (¿es escaneado?)');

      setStep('extracting');
      const { data, error: fnError } = await supabase.functions.invoke('extract-property-pdf', {
        body: { rawText },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.subject) throw new Error('La extracción no devolvió datos de la propiedad');

      setStep('uploading');
      const path = `${orgId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('deal-documents').upload(path, file, {
        contentType: 'application/pdf',
      });
      if (upErr) console.error('Upload failed:', upErr.message);
      else {
        setPdfPath(path);
        setPdfName(file.name);
      }

      const ex: Extraction = {
        subject: data.subject ?? {},
        comps: Array.isArray(data.comps) ? data.comps : [],
        publicVsListing: Array.isArray(data.publicVsListing) ? data.publicVsListing : [],
        rehabSignals: Array.isArray(data.rehabSignals) ? data.rehabSignals : [],
      };
      setExtraction(ex);
      const form: Record<string, string> = {};
      EDITABLE_FIELDS.forEach((k) => {
        const v = ex.subject[k];
        form[k] = v === null || v === undefined ? '' : String(v);
      });
      form.listing_description = String(ex.subject.listing_description ?? '');
      setSubject(form);
      setComps(ex.comps);
      setStep('review');
      toast.success(`Extracción lista — ${ex.comps.length} comparables detectados`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setStep('idle');
    }
  };

  const parseNum = (k: string) => {
    if (!NUMERIC_FIELDS.includes(k)) return undefined;
    const raw = subject[k];
    if (!raw) return null;
    const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const handleSave = async () => {
    if (!subject.address?.trim()) {
      toast.error('La dirección es obligatoria');
      return;
    }
    setStep('saving');
    try {
      const deal = await createDeal.mutateAsync({
        address: subject.address.trim(),
        city: subject.city || null,
        state: subject.state || 'AL',
        zip_code: subject.zip_code || null,
        county: subject.county || null,
        mls_id: subject.mls_id || null,
        apn: subject.apn || null,
        property_type: subject.property_type || null,
        bedrooms: parseNum('bedrooms'),
        bathrooms: parseNum('bathrooms'),
        sqft: parseNum('sqft'),
        lot_size_acres: parseNum('lot_size_acres'),
        year_built: parseNum('year_built'),
        list_price: parseNum('list_price'),
        cma_recommended_offer: parseNum('cma_recommended_offer'),
        rvm_value: parseNum('rvm_value'),
        rvm_range_low: parseNum('rvm_range_low'),
        rvm_range_high: parseNum('rvm_range_high'),
        assessed_value: parseNum('assessed_value'),
        annual_taxes: parseNum('annual_taxes'),
        zoning: subject.zoning || null,
        listing_description: subject.listing_description || null,
        pdf_path: pdfPath,
        pdf_filename: pdfName,
        extracted_data: {
          heating: subject.heating || null,
          cooling: subject.cooling || null,
          foundation: subject.foundation || null,
          roof: subject.roof || null,
          basement: subject.basement || null,
          publicVsListing: extraction?.publicVsListing ?? [],
          rehabSignals: extraction?.rehabSignals ?? [],
        } as never,
      });

      if (comps.length) {
        await addComps.mutateAsync({
          dealId: deal.id,
          comps: comps.map((c) => ({
            address: c.address,
            price: c.price,
            status: (['closed', 'pending', 'active'].includes(c.status) ? c.status : 'unknown') as never,
            closed_date: c.closed_date,
            distance_miles: c.distance_miles,
            similarity_score: c.similarity_score,
            bedrooms: c.bedrooms,
            bathrooms: c.bathrooms,
            sqft: c.sqft,
            lot_size_acres: c.lot_size_acres,
            year_built: c.year_built,
            days_on_market: c.days_on_market,
            notes: c.notes,
            included: true,
          })),
        });
      }

      toast.success('Deal creado');
      navigate(`/deals/${deal.id}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el deal');
      setStep('review');
    }
  };

  const busy = step === 'reading' || step === 'extracting' || step === 'uploading' || step === 'saving';

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/deals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nuevo análisis</h1>
            <p className="text-sm text-muted-foreground">
              Sube el PDF de RPR / MLS y revisa los datos extraídos antes de guardar.
            </p>
          </div>
        </div>

        {step !== 'review' && (
          <Card>
            <CardContent className="p-6">
              <div
                onClick={() => !busy && inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && !busy) handleFile(f);
                }}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors hover:border-primary/60"
              >
                {busy ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <FileUp className="h-8 w-8 text-muted-foreground" />
                )}
                <p className="font-medium">
                  {step === 'reading'
                    ? 'Leyendo el PDF...'
                    : step === 'extracting'
                      ? 'Extrayendo datos con IA...'
                      : step === 'uploading'
                        ? 'Guardando el documento...'
                        : 'Arrastra el PDF aquí o haz clic para seleccionarlo'}
                </p>
                <p className="text-xs text-muted-foreground">RPR, MLS o reporte de Realtor (PDF con texto)</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
              {busy && <Progress value={progress} className="mt-4" />}
              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        )}

        {step === 'review' || step === 'saving' ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Datos de la propiedad</CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> Extraído del PDF — editable
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {EDITABLE_FIELDS.map((k) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">
                      {FIELD_LABELS[k]}
                      {!subject[k] && (
                        <span className="ml-2 text-[10px] text-muted-foreground">Not Available</span>
                      )}
                    </Label>
                    <Input
                      value={subject[k] ?? ''}
                      onChange={(e) => setSubject((s) => ({ ...s, [k]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs">Descripción del listado</Label>
                  <Textarea
                    rows={4}
                    value={subject.listing_description ?? ''}
                    onChange={(e) =>
                      setSubject((s) => ({ ...s, listing_description: e.target.value }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {!!extraction?.publicVsListing.length && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Discrepancias public records vs listing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {extraction.publicVsListing.map((d, i) => (
                    <div key={i} className="rounded-md border p-2 text-sm">
                      <span className="font-medium">{d.field}: </span>
                      <span className="text-muted-foreground">
                        público “{d.publicValue}” vs listing “{d.listingValue}”
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparables detectados ({comps.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Dirección</th>
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-right">Sqft</th>
                      <th className="p-2 text-right">Año</th>
                      <th className="p-2 text-right">Sim.</th>
                      <th className="p-2 text-right">Millas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((c, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{c.address}</td>
                        <td className="p-2 text-right tabular-nums">
                          {c.price ? `$${c.price.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-2">{c.status}</td>
                        <td className="p-2 text-right tabular-nums">{c.sqft ?? '—'}</td>
                        <td className="p-2 text-right tabular-nums">{c.year_built ?? '—'}</td>
                        <td className="p-2 text-right tabular-nums">{c.similarity_score ?? '—'}</td>
                        <td className="p-2 text-right tabular-nums">{c.distance_miles ?? '—'}</td>
                      </tr>
                    ))}
                    {!comps.length && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                          No se detectaron comparables — podrás agregarlos manualmente después.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('idle')} disabled={step === 'saving'}>
                Subir otro PDF
              </Button>
              <Button onClick={handleSave} disabled={step === 'saving'}>
                {step === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar y analizar
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
