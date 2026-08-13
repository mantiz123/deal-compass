import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDeal,
  useDealComps,
  useUpdateDeal,
  useUpdateDealComp,
  useDealChecklist,
  useSeedChecklist,
  useToggleChecklistItem,
  useSaveScenario,
  DEAL_STAGES,
  STAGE_LABELS,
  type DealStage,
} from '@/hooks/useDeals';
import {
  defaultConfig,
  runUnderwriting,
  type UnderwritingConfig,
  type ArvMode,
  type RehabLevel,
} from '@/lib/underwriting';
import { dealToSubject, rowToComp, publicVsListingFromDeal } from '@/lib/underwriting/fromDeal';
import { REHAB_DISCLAIMER } from '@/lib/underwriting/rehab';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const money = (n?: number | null) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `$${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 text-lg font-bold tabular-nums',
            tone === 'good' && 'text-emerald-500',
            tone === 'bad' && 'text-destructive'
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {suffix && <span className="text-muted-foreground">({suffix})</span>}
      </Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading } = useDeal(id);
  const { data: compRows } = useDealComps(id);
  const { data: checklist } = useDealChecklist(id);
  const updateDeal = useUpdateDeal();
  const updateComp = useUpdateDealComp(id);
  const seedChecklist = useSeedChecklist(id);
  const toggleItem = useToggleChecklistItem(id);
  const saveScenario = useSaveScenario(id);

  const subject = useMemo(() => (deal ? dealToSubject(deal) : null), [deal]);
  const comps = useMemo(() => (compRows ?? []).map(rowToComp), [compRows]);

  const [config, setConfig] = useState<UnderwritingConfig | null>(null);

  useEffect(() => {
    if (subject && !config) {
      setConfig({
        ...defaultConfig(subject),
        publicVsListing: deal ? publicVsListingFromDeal(deal) : [],
      });
    }
  }, [subject, deal, config]);

  const out = useMemo(
    () => (subject && config ? runUnderwriting(subject, comps, config) : null),
    [subject, comps, config]
  );

  useEffect(() => {
    if (checklist && checklist.length === 0 && id) seedChecklist.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist?.length, id]);

  if (isLoading || !deal || !config || !out || !subject) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  const set = (patch: Partial<UnderwritingConfig>) => setConfig((c) => (c ? { ...c, ...patch } : c));

  const decision = out.score.decision;
  const verdictTone =
    decision === 'buy'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
      : decision === 'negotiate'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
        : 'border-destructive/40 bg-destructive/10 text-destructive';

  const handlePersist = async () => {
    await updateDeal.mutateAsync({
      id: deal.id,
      investment_score: out.score.total,
      decision: decision as never,
    });
    await saveScenario.mutateAsync({
      name: `Escenario ${new Date().toLocaleString()}`,
      inputs: config,
      results: {
        arv: out.arvUsed,
        rehab: out.rehabUsed,
        profit: out.deal.grossProfit,
        roi: out.deal.roi,
        cashRequired: out.deal.cashRequired,
        mao: out.mao.maxPurchasePrice,
        score: out.score.total,
      },
      isPrimary: true,
    });
    toast.success('Escenario guardado y score actualizado');
  };

  const costRows = [
    { label: 'Compra', value: out.deal.purchasePrice },
    { label: 'Closing (compra)', value: out.deal.closingCosts },
    { label: 'Rehab', value: out.deal.rehab },
    { label: 'Financiación', value: out.deal.financingCost },
    { label: 'Holding', value: out.deal.holdingCost },
    { label: 'Venta', value: out.deal.sellingCost },
  ];
  const maxCost = Math.max(...costRows.map((r) => r.value), 1);

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/deals">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">{deal.address}</h1>
              <p className="text-sm text-muted-foreground">
                {[deal.city, deal.state, deal.zip_code].filter(Boolean).join(', ')} ·{' '}
                {deal.bedrooms ?? '—'} hab · {deal.bathrooms ?? '—'} baños ·{' '}
                {deal.sqft ? `${deal.sqft.toLocaleString()} sqft` : 'sqft N/A'} ·{' '}
                {deal.year_built ?? 'año N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={deal.stage}
              onValueChange={(v) => updateDeal.mutate({ id: deal.id, stage: v as never })}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s as DealStage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handlePersist} disabled={updateDeal.isPending || saveScenario.isPending}>
              {(updateDeal.isPending || saveScenario.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar escenario
            </Button>
          </div>
        </div>

        {/* Verdict */}
        <Card className={cn('border-2', verdictTone)}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-black tracking-tight">
                {decision.toUpperCase()} — {out.score.decisionLabel}
              </p>
              <p className="text-sm opacity-90">
                Profit {money(out.deal.grossProfit)} · ROI {pct(out.deal.roi)} · Cash requerido{' '}
                {money(out.deal.cashRequired)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black tabular-nums">{out.score.total}</p>
              <p className="text-xs uppercase tracking-wide">Investment Score</p>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi label="Compra" value={money(config.purchasePrice)} />
          <Kpi label="ARV" value={money(out.arvUsed)} />
          <Kpi label="Rehab" value={money(out.rehabUsed)} />
          <Kpi label="Costo total" value={money(out.deal.totalProjectCost)} />
          <Kpi label="Cash requerido" value={money(out.deal.cashRequired)} />
          <Kpi
            label="Profit"
            value={money(out.deal.grossProfit)}
            tone={out.deal.grossProfit >= 0 ? 'good' : 'bad'}
          />
          <Kpi label="ROI" value={pct(out.deal.roi)} tone={out.deal.roi >= 0.2 ? 'good' : 'bad'} />
          <Kpi label="Max Offer" value={money(out.mao.maxPurchasePrice)} />
        </div>

        {/* Capital */}
        <Card className={cn('border', out.capital.fits ? 'border-emerald-500/40' : 'border-destructive/40')}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <Wallet className={cn('h-5 w-5', out.capital.fits ? 'text-emerald-500' : 'text-destructive')} />
              <div>
                <p className="text-sm font-semibold">{out.capital.label}</p>
                <p className="text-xs text-muted-foreground">
                  Requerido {money(out.capital.cashRequired)} · Disponible {money(out.capital.cashAvailable)}
                </p>
              </div>
            </div>
            <div className="w-48">
              <Label className="text-xs">Capital disponible</Label>
              <Input
                type="number"
                value={config.cashAvailable}
                onChange={(e) => set({ cashAvailable: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="numbers">
          <TabsList className="flex-wrap">
            <TabsTrigger value="numbers">Números</TabsTrigger>
            <TabsTrigger value="comps">Comps &amp; ARV</TabsTrigger>
            <TabsTrigger value="rehab">Rehab</TabsTrigger>
            <TabsTrigger value="financing">Financiación</TabsTrigger>
            <TabsTrigger value="structures">Estructuras</TabsTrigger>
            <TabsTrigger value="risk">Riesgo &amp; Score</TabsTrigger>
            <TabsTrigger value="dd">Due Diligence</TabsTrigger>
          </TabsList>

          {/* NUMBERS */}
          <TabsContent value="numbers" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inputs principales</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <NumField
                    label="Precio de compra"
                    value={config.purchasePrice}
                    onChange={(n) => set({ purchasePrice: n })}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">ARV</Label>
                    <Select value={config.arvMode} onValueChange={(v) => set({ arvMode: v as ArvMode })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">
                          Conservador ({money(out.arv.conservative)})
                        </SelectItem>
                        <SelectItem value="base">Base ({money(out.arv.base)})</SelectItem>
                        <SelectItem value="optimistic">
                          Optimista ({money(out.arv.optimistic)})
                        </SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.arvMode === 'manual' && (
                    <NumField
                      label="ARV manual"
                      value={config.manualArv}
                      onChange={(n) => set({ manualArv: n })}
                    />
                  )}
                  <NumField
                    label="Profit deseado"
                    value={config.desiredProfit}
                    onChange={(n) => set({ desiredProfit: n })}
                  />
                  <NumField
                    label="Risk buffer"
                    suffix="% ARV"
                    value={config.riskBufferPct}
                    onChange={(n) => set({ riskBufferPct: n })}
                  />
                  <NumField
                    label="Closing comprador"
                    suffix="%"
                    value={config.buyerClosingPct}
                    onChange={(n) => set({ buyerClosingPct: n })}
                  />
                  <NumField
                    label="Closing fijo"
                    value={config.buyerClosingFlat}
                    onChange={(n) => set({ buyerClosingFlat: n })}
                  />
                  <NumField
                    label="Reserva de caja"
                    value={config.cashReserve}
                    onChange={(n) => set({ cashReserve: n })}
                  />
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Meses de holding: {config.holding.months}</Label>
                    <Slider
                      min={1}
                      max={18}
                      step={1}
                      value={[config.holding.months]}
                      onValueChange={([v]) =>
                        set({
                          holding: { ...config.holding, months: v },
                          financing: { ...config.financing, termMonths: Math.max(v, 3) },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Desglose del proyecto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {costRows.map((r) => (
                    <div key={r.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="font-medium tabular-nums">{money(r.value)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${(r.value / maxCost) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Costo total del proyecto</span>
                    <span className="tabular-nums">{money(out.deal.totalProjectCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>ARV de venta</span>
                    <span className="tabular-nums">{money(out.deal.arv)}</span>
                  </div>
                  <div
                    className={cn(
                      'flex justify-between text-base font-bold',
                      out.deal.grossProfit >= 0 ? 'text-emerald-500' : 'text-destructive'
                    )}
                  >
                    <span>Ganancia bruta</span>
                    <span className="tabular-nums">{money(out.deal.grossProfit)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Margen {pct(out.deal.profitMarginPct)} · ROI anualizado{' '}
                    {pct(out.deal.annualizedRoi)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estrategia de oferta</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Oferta inicial (Low)</p>
                  <p className="text-xl font-bold tabular-nums">{money(out.mao.lowOffer)}</p>
                </div>
                <div className="rounded-lg border border-primary/40 p-3">
                  <p className="text-xs text-muted-foreground">Objetivo (Target)</p>
                  <p className="text-xl font-bold tabular-nums">{money(out.mao.targetOffer)}</p>
                </div>
                <div className="rounded-lg border border-destructive/40 p-3">
                  <p className="text-xs text-muted-foreground">No exceder (MAO)</p>
                  <p className="text-xl font-bold tabular-nums">{money(out.mao.doNotExceed)}</p>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-3">{out.mao.explanation}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPS */}
          <TabsContent value="comps" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Kpi label="ARV conservador" value={money(out.arv.conservative)} />
              <Kpi label="ARV base" value={money(out.arv.base)} />
              <Kpi label="ARV optimista" value={money(out.arv.optimistic)} />
              <Kpi
                label="Confianza"
                value={out.arv.confidence.toUpperCase()}
                tone={out.arv.confidence === 'high' ? 'good' : out.arv.confidence === 'low' ? 'bad' : undefined}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparables</CardTitle>
                <p className="text-xs text-muted-foreground">{out.arv.method}</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Usar</th>
                      <th className="p-2 text-left">Dirección</th>
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-right">Sqft</th>
                      <th className="p-2 text-right">$/sqft</th>
                      <th className="p-2 text-right">Cierre</th>
                      <th className="p-2 text-right">Sim.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compRows ?? []).map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="p-2">
                          <Checkbox
                            checked={c.included}
                            onCheckedChange={(v) =>
                              updateComp.mutate({ id: c.id, included: Boolean(v) })
                            }
                          />
                        </td>
                        <td className="p-2">{c.address}</td>
                        <td className="p-2 text-right tabular-nums">{money(c.price)}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">
                            {c.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-right tabular-nums">{c.sqft ?? '—'}</td>
                        <td className="p-2 text-right tabular-nums">
                          {c.price && c.sqft ? `$${Math.round(c.price / c.sqft)}` : '—'}
                        </td>
                        <td className="p-2 text-right tabular-nums">{c.closed_date ?? '—'}</td>
                        <td className="p-2 text-right tabular-nums">{c.similarity_score ?? '—'}</td>
                      </tr>
                    ))}
                    {!(compRows ?? []).length && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-muted-foreground">
                          Sin comparables cargados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {!!out.arv.discarded.length && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comparables descartados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {out.arv.discarded.map((d, i) => (
                    <p key={i} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{d.comp.address}</span> — {d.reason}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* REHAB */}
          <TabsContent value="rehab" className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Estimación de remodelación</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={config.rehabLevel}
                    onValueChange={(v) => set({ rehabLevel: v as RehabLevel })}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={config.rehabMode}
                    onValueChange={(v) => set({ rehabMode: v as 'low' | 'base' | 'high' })}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Kpi label="Low" value={money(out.rehab.low)} />
                  <Kpi label="Base" value={money(out.rehab.base)} />
                  <Kpi label="High" value={money(out.rehab.high)} />
                </div>
                <NumField
                  label="Contingencia"
                  suffix="%"
                  value={config.rehabContingencyPct}
                  onChange={(n) => set({ rehabContingencyPct: n })}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Incluir</th>
                        <th className="p-2 text-left">Partida</th>
                        <th className="p-2 text-right">Low</th>
                        <th className="p-2 text-right">Base</th>
                        <th className="p-2 text-right">High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {out.rehab.items.map((item) => (
                        <tr key={item.key} className="border-b last:border-0">
                          <td className="p-2">
                            <Checkbox
                              checked={item.included}
                              onCheckedChange={(v) =>
                                set({
                                  rehabOverrides: {
                                    ...config.rehabOverrides,
                                    [item.key]: {
                                      ...config.rehabOverrides[item.key],
                                      included: Boolean(v),
                                    },
                                  },
                                })
                              }
                            />
                          </td>
                          <td className="p-2">{item.label}</td>
                          {(['low', 'base', 'high'] as const).map((k) => (
                            <td key={k} className="p-2 text-right">
                              <Input
                                type="number"
                                className="h-8 w-28 text-right tabular-nums"
                                value={item[k]}
                                onChange={(e) =>
                                  set({
                                    rehabOverrides: {
                                      ...config.rehabOverrides,
                                      [item.key]: {
                                        ...config.rehabOverrides[item.key],
                                        [k]: Number(e.target.value),
                                      },
                                    },
                                  })
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">{REHAB_DISCLAIMER}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCING */}
          <TabsContent value="financing" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hard money</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <NumField
                    label="LTV compra"
                    suffix="%"
                    value={config.financing.ltvPurchasePct}
                    onChange={(n) => set({ financing: { ...config.financing, ltvPurchasePct: n } })}
                  />
                  <NumField
                    label="LTC"
                    suffix="%"
                    value={config.financing.ltcPct}
                    onChange={(n) => set({ financing: { ...config.financing, ltcPct: n } })}
                  />
                  <NumField
                    label="ARV LTV"
                    suffix="%"
                    value={config.financing.arvLtvPct}
                    onChange={(n) => set({ financing: { ...config.financing, arvLtvPct: n } })}
                  />
                  <NumField
                    label="Rehab financiado"
                    suffix="%"
                    value={config.financing.rehabFinancedPct}
                    onChange={(n) => set({ financing: { ...config.financing, rehabFinancedPct: n } })}
                  />
                  <NumField
                    label="Tasa"
                    suffix="% anual"
                    value={config.financing.interestRatePct}
                    onChange={(n) => set({ financing: { ...config.financing, interestRatePct: n } })}
                  />
                  <NumField
                    label="Puntos"
                    suffix="%"
                    value={config.financing.points}
                    onChange={(n) => set({ financing: { ...config.financing, points: n } })}
                  />
                  <NumField
                    label="Origination"
                    suffix="%"
                    value={config.financing.originationPct}
                    onChange={(n) => set({ financing: { ...config.financing, originationPct: n } })}
                  />
                  <NumField
                    label="Fees fijos"
                    value={config.financing.lenderFlatFees}
                    onChange={(n) => set({ financing: { ...config.financing, lenderFlatFees: n } })}
                  />
                  <NumField
                    label="Private money"
                    value={config.financing.privateMoneyAmount}
                    onChange={(n) => set({ financing: { ...config.financing, privateMoneyAmount: n } })}
                  />
                  <NumField
                    label="Tasa private"
                    suffix="%"
                    value={config.financing.privateMoneyRatePct}
                    onChange={(n) =>
                      set({ financing: { ...config.financing, privateMoneyRatePct: n } })
                    }
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resultado del préstamo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto del préstamo</span>
                      <span className="font-medium tabular-nums">{money(out.financing.loanAmount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{out.financing.loanCapReason}</p>
                    <Separator />
                    {[
                      ['Down payment', out.financing.downPayment],
                      ['Rehab no financiado', out.financing.unfinancedRehab],
                      ['Puntos', out.financing.pointsCost],
                      ['Origination', out.financing.originationCost],
                      ['Fees del lender', out.financing.lenderFlatFees],
                      ['Interés total', out.financing.totalInterest],
                      ['Interés private money', out.financing.privateMoneyInterest],
                      ['Balloon al vender', out.financing.balloonAtSale],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="tabular-nums">{money(value as number)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Costo total de financiación</span>
                      <span className="tabular-nums">{money(out.financing.totalFinancingCost)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Holding ({out.holding.months} meses · {money(out.holding.monthlyTotal)}/mes)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {out.holding.breakdown.map((b) => (
                      <div key={b.label} className="flex justify-between">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="tabular-nums">{money(b.total)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total holding</span>
                      <span className="tabular-nums">{money(out.holding.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Costos de venta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {out.selling.breakdown.map((b) => (
                      <div key={b.label} className="flex justify-between">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="tabular-nums">{money(b.amount)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total venta</span>
                      <span className="tabular-nums">{money(out.selling.total)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <NumField
                        label="Comisión agente"
                        suffix="%"
                        value={config.selling.agentCommissionPct}
                        onChange={(n) => set({ selling: { ...config.selling, agentCommissionPct: n } })}
                      />
                      <NumField
                        label="Closing vendedor"
                        suffix="%"
                        value={config.selling.sellerClosingPct}
                        onChange={(n) => set({ selling: { ...config.selling, sellerClosingPct: n } })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* STRUCTURES */}
          <TabsContent value="structures">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {out.structures.map((s) => (
                <Card
                  key={s.key}
                  className={cn(s.recommended && 'border-2 border-emerald-500/50')}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                      {s.recommended && (
                        <Badge className="bg-emerald-500/15 text-emerald-500">Recomendada</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash requerido</span>
                      <span
                        className={cn(
                          'font-medium tabular-nums',
                          s.fitsCapital ? 'text-emerald-500' : 'text-destructive'
                        )}
                      >
                        {money(s.cashRequired)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Préstamo</span>
                      <span className="tabular-nums">{money(s.loanAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Costo financiación</span>
                      <span className="tabular-nums">{money(s.financingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit</span>
                      <span className="tabular-nums">{money(s.profit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ROI</span>
                      <span className="tabular-nums">{pct(s.roi)}</span>
                    </div>
                    {s.caveat && <p className="pt-1 text-xs text-amber-500">{s.caveat}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* RISK */}
          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Red flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {out.redFlags.length === 0 && (
                  <p className="flex items-center gap-2 text-sm text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" /> Sin banderas rojas detectadas.
                  </p>
                )}
                {out.redFlags.map((f) => (
                  <div
                    key={f.key}
                    className={cn(
                      'rounded-md border p-3',
                      f.severity === 'critical'
                        ? 'border-destructive/50 bg-destructive/10'
                        : f.severity === 'high'
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-border'
                    )}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="h-4 w-4" /> {f.title}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {f.severity}
                      </Badge>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Investment Score — {out.score.total}/100</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {out.score.subScores.map((s) => (
                    <div key={s.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {s.label}{' '}
                          <span className="text-xs text-muted-foreground">
                            (peso {Math.round(s.weight * 100)}%)
                          </span>
                        </span>
                        <span className="font-medium tabular-nums">{s.score}</span>
                      </div>
                      <Progress value={s.score} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Liquidez de reventa — {out.liquidity.score}/100 ({out.liquidity.label})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {out.liquidity.factors.map((f) => (
                    <div key={f.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{f.label}</span>
                        <span className="tabular-nums">
                          {Math.round(f.points)}/{f.max}
                        </span>
                      </div>
                      <Progress value={(f.points / f.max) * 100} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">{f.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DUE DILIGENCE */}
          <TabsContent value="dd">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Due diligence ({(checklist ?? []).filter((c) => c.is_done).length}/
                  {(checklist ?? []).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {(checklist ?? []).map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      checked={item.is_done}
                      onCheckedChange={(v) =>
                        toggleItem.mutate({ id: item.id, is_done: Boolean(v) })
                      }
                    />
                    <span className={cn(item.is_done && 'text-muted-foreground line-through')}>
                      {item.label}
                    </span>
                  </label>
                ))}
                {!(checklist ?? []).length && (
                  <p className="text-sm text-muted-foreground">Generando checklist...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
