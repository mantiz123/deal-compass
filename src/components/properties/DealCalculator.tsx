import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, TrendingUp, Calculator } from 'lucide-react';

const ASSIGNMENT_FEE_DEFAULT = 10_000;
const OFFER_BUFFER = 2_000;
const ALABAMA_MULTIPLIER = 0.65;

interface Comp {
  address: string;
  sale_price: string;
  sqft: string;
}

interface DealCalculatorProps {
  arv?: number | null;
  repairCost?: number | null;
  sqft?: number | null;
  address?: string;
  city?: string;
  state?: string;
}

export function DealCalculator({ arv: initialArv, repairCost, sqft, address, city, state }: DealCalculatorProps) {
  const [assignmentFee, setAssignmentFee] = useState(ASSIGNMENT_FEE_DEFAULT);
  const [comps, setComps] = useState<Comp[]>([
    { address: '', sale_price: '', sqft: '' },
    { address: '', sale_price: '', sqft: '' },
    { address: '', sale_price: '', sqft: '' },
  ]);
  const [useCompsArv, setUseCompsArv] = useState(false);

  // Comps math
  const validComps = comps.filter(
    c => c.sale_price && c.sqft && parseFloat(c.sale_price) > 0 && parseFloat(c.sqft) > 0,
  );
  const avgPricePerSqft =
    validComps.length > 0
      ? validComps.reduce((sum, c) => sum + parseFloat(c.sale_price) / parseFloat(c.sqft), 0) /
        validComps.length
      : null;
  const compsArv = avgPricePerSqft && sqft ? Math.round(avgPricePerSqft * sqft) : null;
  const compsValidated = validComps.length >= 2;

  const arv = useCompsArv && compsArv ? compsArv : (initialArv || 0);
  const repairs = repairCost || 0;

  const arvTimes65 = Math.round(arv * ALABAMA_MULTIPLIER);
  const mao = arvTimes65 - repairs - assignmentFee;
  const suggestedOffer = mao - OFFER_BUFFER;

  // Semáforo: based on MAO (= max we can offer seller after our fee)
  type SemaforoState = 'green' | 'yellow' | 'yellow-unvalidated' | 'red-no-arv' | 'red';
  const semaforo: SemaforoState = !arv
    ? 'red-no-arv'
    : !compsValidated
    ? 'yellow-unvalidated'
    : mao >= 10_000
    ? 'green'
    : mao >= 5_000
    ? 'yellow'
    : 'red';

  const semaforoColor = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    'yellow-unvalidated': 'bg-yellow-500',
    'red-no-arv': 'bg-red-500',
    red: 'bg-red-500',
  }[semaforo];

  const semaforoLabel = {
    green: `Deal viable — fee potencial ≥$${assignmentFee.toLocaleString()}`,
    yellow: 'Deal ajustado ($5K–$10K)',
    'yellow-unvalidated': 'ARV no validado con comps',
    'red-no-arv': 'Sin ARV definido',
    red: 'Deal no viable (MAO < $5K)',
  }[semaforo];

  const updateComp = (i: number, field: keyof Comp, value: string) =>
    setComps(prev => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const fullAddress = [address, city, state].filter(Boolean).join(', ');
  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(fullAddress)}_rb/`;
  const redfinUrl = `https://www.redfin.com/search#location=${encodeURIComponent(fullAddress)}`;

  return (
    <div className="space-y-4">
      {/* ── MAO Breakdown ── */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora de Deal
          </h4>
          <div className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${semaforoColor}`} />
            <span className="text-xs text-muted-foreground">{semaforoLabel}</span>
          </div>
        </div>

        {arv > 0 ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                ARV estimado{useCompsArv && compsArv ? ' (comps)' : ''}
              </span>
              <span className="font-semibold tabular-nums">${arv.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>× 65% Alabama</span>
              <span className="tabular-nums">${arvTimes65.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>− Reparaciones</span>
              <span className="text-destructive tabular-nums">−${repairs.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>− Assignment fee (Klose)</span>
              <span className="text-destructive tabular-nums">−${assignmentFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-1.5 mt-1">
              <div className="flex justify-between font-semibold text-base">
                <span>MAO (máximo al seller)</span>
                <span className={`tabular-nums ${mao > 0 ? 'text-success' : 'text-destructive'}`}>
                  ${mao.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>Oferta sugerida (−$2K buffer)</span>
                <span className={`tabular-nums ${suggestedOffer > 0 ? 'text-success' : 'text-destructive'}`}>
                  ${suggestedOffer.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ingresa el ARV en los datos de la propiedad para ver el cálculo.
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Assignment fee:</Label>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <Input
              type="number"
              value={assignmentFee}
              onChange={e => setAssignmentFee(Math.max(0, Number(e.target.value)))}
              className="pl-5 h-7 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">(configurable)</span>
        </div>
      </Card>

      {/* ── ARV Validator ── */}
      <Card variant="glass" className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Validar ARV
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(zillowUrl, '_blank', 'noopener,noreferrer')}
            disabled={!address}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Zillow
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(redfinUrl, '_blank', 'noopener,noreferrer')}
            disabled={!address}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Redfin
          </Button>
        </div>
        {arv > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            ARV actual en sistema: <span className="font-semibold">${arv.toLocaleString()}</span>
            {' '}— compara con el Zestimate de Zillow.
          </p>
        )}
      </Card>

      {/* ── Comps Comparator ── */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ventas comparables (comps)
          </h4>
          {compsArv && (
            <Badge
              variant={useCompsArv ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setUseCompsArv(v => !v)}
            >
              ${compsArv.toLocaleString()} {useCompsArv ? '✓ activo' : '← usar'}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {comps.map((comp, i) => {
            const ppsqft =
              comp.sale_price && comp.sqft && parseFloat(comp.sqft) > 0
                ? parseFloat(comp.sale_price) / parseFloat(comp.sqft)
                : null;
            return (
              <div key={i}>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Comp {i + 1}</p>
                <div className="space-y-1.5">
                  <Input
                    placeholder="Dirección del comparable"
                    value={comp.address}
                    onChange={e => updateComp(i, 'address', e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                      <Input
                        placeholder="Precio de venta"
                        type="number"
                        value={comp.sale_price}
                        onChange={e => updateComp(i, 'sale_price', e.target.value)}
                        className="pl-5 h-8 text-xs"
                      />
                    </div>
                    <Input
                      placeholder="Sqft"
                      type="number"
                      value={comp.sqft}
                      onChange={e => updateComp(i, 'sqft', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  {ppsqft && (
                    <p className="text-xs text-muted-foreground text-right">
                      ${ppsqft.toFixed(0)}/sqft
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {avgPricePerSqft ? (
          <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>$/sqft promedio ({validComps.length} comp{validComps.length !== 1 ? 's' : ''})</span>
              <span className="tabular-nums">${avgPricePerSqft.toFixed(0)}/sqft</span>
            </div>
            {sqft ? (
              <div className="flex justify-between font-semibold">
                <span className="text-xs">ARV calculado ({sqft.toLocaleString()} sqft)</span>
                <span className="text-primary tabular-nums">${compsArv?.toLocaleString()}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Agrega sqft a la propiedad para calcular el ARV con comps.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            Ingresa al menos 2 ventas comparables (precio + sqft) para calcular el ARV automáticamente.
          </p>
        )}
      </Card>
    </div>
  );
}
