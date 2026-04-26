import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Home,
  Wrench,
  RotateCcw,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalculatorInputs {
  arv: number;
  repairCost: number;
  mortgageBalance: number;
  monthlyPI: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  estimatedRent: number;
  arrears: number;
  cashToSeller: number;
}

const DEFAULT_INPUTS: CalculatorInputs = {
  arv: 200000,
  repairCost: 15000,
  mortgageBalance: 130000,
  monthlyPI: 950,
  monthlyTaxes: 180,
  monthlyInsurance: 95,
  estimatedRent: 1650,
  arrears: 0,
  cashToSeller: 5000,
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

interface FieldProps {
  id: keyof CalculatorInputs;
  label: string;
  hint?: string;
  value: number;
  onChange: (id: keyof CalculatorInputs, val: number) => void;
  prefix?: string;
}

function NumberField({ id, label, hint, value, onChange, prefix = '$' }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        {hint && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {prefix}
        </span>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(id, Number(e.target.value) || 0)}
          className="pl-7 h-9 text-sm"
          min={0}
        />
      </div>
    </div>
  );
}

interface SubToCalculatorProps {
  /** Compact mode for embedding inside lessons */
  compact?: boolean;
}

export function SubToCalculator({ compact = false }: SubToCalculatorProps) {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);

  const update = (id: keyof CalculatorInputs, val: number) => {
    setInputs((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const reset = () => setInputs(DEFAULT_INPUTS);

  // ============ CÁLCULOS ============
  const calc = useMemo(() => {
    const {
      arv,
      repairCost,
      mortgageBalance,
      monthlyPI,
      monthlyTaxes,
      monthlyInsurance,
      estimatedRent,
      arrears,
      cashToSeller,
    } = inputs;

    // Equity capturada = ARV - Mortgage Balance - Repairs - Cash al seller - Arrears
    const totalAcquisitionCost = mortgageBalance + repairCost + cashToSeller + arrears;
    const equityCaptured = arv - totalAcquisitionCost;
    const equityPercent = arv > 0 ? (equityCaptured / arv) * 100 : 0;

    // MAO (Maximum Allowable Offer) — para comparación con cash deal
    // Fórmula estándar: MAO = (ARV * 0.70) - Repairs
    const mao70 = arv * 0.7 - repairCost;
    // En Sub-To podemos pagar más porque no necesitamos descuento de cash
    // MAO Sub-To = ARV * 0.85 - Repairs (margen más estrecho aceptable)
    const maoSubTo = arv * 0.85 - repairCost;

    // PITI completo
    const piti = monthlyPI + monthlyTaxes + monthlyInsurance;

    // Cashflow mensual (rental)
    const monthlyCashflow = estimatedRent - piti;
    const annualCashflow = monthlyCashflow * 12;

    // DSCR (Debt Service Coverage Ratio)
    // Lenders quieren >= 1.20 para refi conventional
    const dscr = piti > 0 ? estimatedRent / piti : 0;

    // Cash-on-cash return (si refinanciamos vs cash invertido)
    const cashInvested = cashToSeller + arrears + repairCost;
    const cocReturn = cashInvested > 0 ? (annualCashflow / cashInvested) * 100 : 0;

    // Verdict
    let verdict: 'excellent' | 'good' | 'marginal' | 'pass' = 'pass';
    let verdictMsg = '';
    if (equityPercent >= 25 && dscr >= 1.25 && monthlyCashflow >= 200) {
      verdict = 'excellent';
      verdictMsg = '🔥 Deal excelente. Equity sólida + cashflow positivo + DSCR refinanciable.';
    } else if (equityPercent >= 15 && dscr >= 1.1 && monthlyCashflow >= 100) {
      verdict = 'good';
      verdictMsg = '✅ Deal sólido. Buen equity y cashflow. Negocia más cash credits si puedes.';
    } else if (equityPercent >= 8 && monthlyCashflow >= 0) {
      verdict = 'marginal';
      verdictMsg = '⚠️ Marginal. Funciona pero sin colchón. Solo si exit es claro (wholesale Sub-To).';
    } else {
      verdict = 'pass';
      verdictMsg = '🚫 Pass. Equity insuficiente o cashflow negativo. Re-negocia o descarta.';
    }

    return {
      equityCaptured,
      equityPercent,
      mao70,
      maoSubTo,
      piti,
      monthlyCashflow,
      annualCashflow,
      dscr,
      cocReturn,
      cashInvested,
      totalAcquisitionCost,
      verdict,
      verdictMsg,
    };
  }, [inputs]);

  const verdictColors = {
    excellent: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    good: 'bg-primary/10 text-primary border-primary/30',
    marginal: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    pass: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <Card className={compact ? 'border-primary/20' : ''}>
      <CardHeader className={compact ? 'pb-3' : ''}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora Sub-To
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={reset} className="h-8 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Estima equity capturada, MAO, cashflow y DSCR para una operación Subject-To.
            Ajusta los inputs y mira los outputs en tiempo real.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ============ INPUTS ============ */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                Propiedad
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="arv"
                  label="ARV"
                  hint="After Repair Value — valor después de reparaciones (comparables vendidos en últimos 90 días, mismo zip)."
                  value={inputs.arv}
                  onChange={update}
                />
                <NumberField
                  id="repairCost"
                  label="Repairs"
                  hint="Costo estimado de rehab. Para Alabama promedio: $15-25/sqft cosmético, $40-60/sqft full rehab."
                  value={inputs.repairCost}
                  onChange={update}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Hipoteca existente
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="mortgageBalance"
                  label="Balance"
                  hint="Saldo actual del mortgage que asumes. Pídelo al seller (pay-off statement) o estímalo."
                  value={inputs.mortgageBalance}
                  onChange={update}
                />
                <NumberField
                  id="monthlyPI"
                  label="P&I/mes"
                  hint="Principal + Interest del mortgage actual (no incluye taxes/insurance)."
                  value={inputs.monthlyPI}
                  onChange={update}
                />
                <NumberField
                  id="monthlyTaxes"
                  label="Taxes/mes"
                  hint="Property taxes mensuales. AL promedio: 0.4-0.6% anual / 12."
                  value={inputs.monthlyTaxes}
                  onChange={update}
                />
                <NumberField
                  id="monthlyInsurance"
                  label="Insurance/mes"
                  hint="Hazard insurance. Tip: cambia la póliza a tu nombre con seller como additional insured."
                  value={inputs.monthlyInsurance}
                  onChange={update}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Términos del deal
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="cashToSeller"
                  label="Cash al seller"
                  hint="Dinero que entregas al seller al cierre (moving costs, equity buyout). En Sub-To puro idealmente $0-5k."
                  value={inputs.cashToSeller}
                  onChange={update}
                />
                <NumberField
                  id="arrears"
                  label="Atrasos"
                  hint="Pagos atrasados que debes ponerte al día (back payments, late fees). Común en sellers en pre-foreclosure."
                  value={inputs.arrears}
                  onChange={update}
                />
                <NumberField
                  id="estimatedRent"
                  label="Renta estimada"
                  hint="Market rent mensual si vas a hold. Verifica con Rentometer o comparables locales."
                  value={inputs.estimatedRent}
                  onChange={update}
                />
              </div>
            </div>
          </div>

          {/* ============ OUTPUTS ============ */}
          <div className="space-y-4">
            {/* Verdict */}
            <div className={`rounded-lg border p-4 ${verdictColors[calc.verdict]}`}>
              <div className="flex items-start gap-2">
                {calc.verdict === 'excellent' || calc.verdict === 'good' ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-sm">Veredicto del deal</p>
                  <p className="text-xs mt-1 opacity-90">{calc.verdictMsg}</p>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Equity capturada
                </span>
                <Badge variant="outline" className="text-xs">
                  {fmtPct(calc.equityPercent)}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmt(calc.equityCaptured)}</p>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Costo total adquisición</p>
                  <p className="font-semibold text-foreground">{fmt(calc.totalAcquisitionCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cash invertido</p>
                  <p className="font-semibold text-foreground">{fmt(calc.cashInvested)}</p>
                </div>
              </div>
            </div>

            {/* MAO comparison */}
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                MAO de referencia
              </span>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Cash (70% rule)</p>
                  <p className="font-bold text-foreground">{fmt(calc.mao70)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sub-To (85% rule)</p>
                  <p className="font-bold text-primary">{fmt(calc.maoSubTo)}</p>
                </div>
              </div>
            </div>

            {/* Cashflow + DSCR */}
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Buy & Hold rental
                </span>
                <Badge
                  variant={calc.dscr >= 1.2 ? 'default' : 'outline'}
                  className="text-xs"
                >
                  DSCR {calc.dscr.toFixed(2)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">PITI/mes</p>
                  <p className="font-semibold text-foreground">{fmt(calc.piti)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cashflow/mes</p>
                  <p
                    className={`font-bold ${
                      calc.monthlyCashflow >= 0 ? 'text-emerald-500' : 'text-destructive'
                    }`}
                  >
                    {fmt(calc.monthlyCashflow)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cashflow anual</p>
                  <p
                    className={`font-semibold ${
                      calc.annualCashflow >= 0 ? 'text-emerald-500' : 'text-destructive'
                    }`}
                  >
                    {fmt(calc.annualCashflow)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cash-on-cash</p>
                  <p className="font-semibold text-foreground">{fmtPct(calc.cocReturn)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-muted-foreground">
            <strong className="text-amber-500">⚖️ Disclaimer:</strong> Esta calculadora es una
            herramienta educativa para estimación. NO sustituye asesoría legal, financiera o
            tributaria profesional. Las operaciones Subject-To en Alabama deben cerrarse con un
            attorney licenciado y revelar el due-on-sale clause al seller. Verifica siempre el
            pay-off statement actualizado del lender antes del cierre.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
