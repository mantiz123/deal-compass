import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Target,
  Banknote,
  Repeat,
  HandCoins,
  Shuffle,
  FileSignature,
  XCircle,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calculator,
  Quote,
} from 'lucide-react';
import { useState } from 'react';
import {
  computeStrategyEconomics,
  type EconomicsInputs,
  type StrategyEconomics,
} from '@/lib/strategyEconomics';

type StrategyCode =
  | 'cash'
  | 'sub_to'
  | 'wrap'
  | 'seller_finance'
  | 'hybrid'
  | 'novation'
  | 'pass';

interface StrategyResult {
  code: StrategyCode;
  label: string;
  confidence: number;
  mao: number | null;
  reasons: string[];
  disqualifiers?: string[];
}

interface StrategyBattleCardProps {
  recommended?: StrategyCode | null;
  confidence?: number | null;
  mao?: number | null;
  reasons?: string[] | null;
  disqualifiers?: string[] | null;
  alternatives?: StrategyResult[] | null;
  calculatedAt?: string | null;
  /** Datos crudos para calcular el desglose económico en cliente */
  inputs?: EconomicsInputs | null;
}

const STRATEGY_META: Record<
  StrategyCode,
  { label: string; icon: typeof Target; color: string; pitch: string }
> = {
  cash: {
    label: 'Cash Offer (Wholesale)',
    icon: Banknote,
    color: 'text-emerald-500',
    pitch: 'Cierre rápido en efectivo, sin contingencias.',
  },
  sub_to: {
    label: 'Subject-To',
    icon: Repeat,
    color: 'text-blue-500',
    pitch: 'Tomamos los pagos de la hipoteca existente y salvamos su crédito.',
  },
  wrap: {
    label: 'Wrap-Around Mortgage',
    icon: Shuffle,
    color: 'text-purple-500',
    pitch: 'Hipoteca envolvente sobre la existente con un margen para usted.',
  },
  seller_finance: {
    label: 'Seller Financing',
    icon: HandCoins,
    color: 'text-amber-500',
    pitch: 'Usted financia la venta y recibe ingresos pasivos mensuales.',
  },
  hybrid: {
    label: 'Hybrid (Sub-To + Seller Finance)',
    icon: Target,
    color: 'text-pink-500',
    pitch: 'Asumimos la hipoteca y le pagamos su equity en cuotas.',
  },
  novation: {
    label: 'Novation Agreement',
    icon: FileSignature,
    color: 'text-cyan-500',
    pitch: 'Listamos su propiedad mejorada y compartimos la utilidad final.',
  },
  pass: {
    label: 'Pass / No Deal',
    icon: XCircle,
    color: 'text-muted-foreground',
    pitch: 'Este lead no califica para ninguna estrategia rentable.',
  },
};

function formatUsd(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceTone(c: number) {
  if (c >= 75) return { label: 'Alta', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
  if (c >= 50) return { label: 'Media', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' };
  return { label: 'Baja', cls: 'bg-red-500/10 text-red-500 border-red-500/30' };
}

export function StrategyBattleCard({
  recommended,
  confidence,
  mao,
  reasons,
  disqualifiers,
  alternatives,
  calculatedAt,
}: StrategyBattleCardProps) {
  const [showAlts, setShowAlts] = useState(false);

  if (!recommended) {
    return (
      <Card variant="glass" className="p-4 mb-6 border-dashed">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Target className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">Strategy Engine</p>
            <p className="text-xs">
              Aún no se ha calculado una estrategia. Recalcula el K-Score para generarla.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const meta = STRATEGY_META[recommended];
  const Icon = meta.icon;
  const conf = confidence ?? 0;
  const tone = confidenceTone(conf);

  return (
    <Card variant="glass" className="p-5 mb-6 border-primary/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-xl bg-card flex items-center justify-center border border-border ${meta.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Estrategia recomendada
            </p>
            <h3 className="text-lg font-bold">{meta.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.pitch}</p>
          </div>
        </div>
        <Badge variant="outline" className={tone.cls}>
          Confianza {tone.label}
        </Badge>
      </div>

      {/* MAO + Confidence row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            MAO sugerido
          </div>
          <p className="text-2xl font-bold">{formatUsd(mao)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Confianza del motor</span>
            <span className="font-semibold text-foreground">{conf}%</span>
          </div>
          <Progress value={conf} className="h-2 mt-3" />
        </div>
      </div>

      {/* Reasons */}
      {reasons && reasons.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Por qué esta estrategia
          </p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disqualifiers (caveats) */}
      {disqualifiers && disqualifiers.length > 0 && (
        <div className="mb-3 rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cuidado con
          </p>
          <ul className="space-y-1">
            {disqualifiers.map((d, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                • {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {alternatives && alternatives.length > 0 && (
        <Collapsible open={showAlts} onOpenChange={setShowAlts}>
          <CollapsibleTrigger className="flex items-center justify-between w-full pt-3 border-t border-border text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <span>Ver {alternatives.length} estrategia(s) alternativa(s)</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAlts ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {alternatives.map((alt) => {
              const altMeta = STRATEGY_META[alt.code];
              const AltIcon = altMeta.icon;
              const altTone = confidenceTone(alt.confidence);
              return (
                <div
                  key={alt.code}
                  className="rounded-lg border border-border bg-card/40 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AltIcon className={`h-4 w-4 ${altMeta.color}`} />
                      <span className="font-semibold text-sm">{altMeta.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        MAO {formatUsd(alt.mao)}
                      </span>
                      <Badge variant="outline" className={`${altTone.cls} text-xs`}>
                        {alt.confidence}%
                      </Badge>
                    </div>
                  </div>
                  {alt.reasons?.length > 0 && (
                    <ul className="space-y-0.5 ml-6">
                      {alt.reasons.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {calculatedAt && (
        <p className="text-[10px] text-muted-foreground mt-3 text-right">
          Calculado: {new Date(calculatedAt).toLocaleString('es')}
        </p>
      )}
    </Card>
  );
}
