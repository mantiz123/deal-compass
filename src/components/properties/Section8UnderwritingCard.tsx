import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  TrendingUp,
  Percent,
  DollarSign,
  Wallet,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Section8UnderwritingCardProps {
  arv?: number | null;
  repairCost?: number | null;
  estimatedRent?: number | null;
  lastSalePrice?: number | null;
  address?: string;
  city?: string;
  state?: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;

// Alabama: Class II (non-owner-occupied / rental) assessment ratio = 20% of market value.
// Class III (owner-occupied homestead) is only 10% — using it underestimates the real tax bill.
const AL_CLASS_II_RATIO = 0.2;

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
        {label}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 cursor-help opacity-70" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </Label>
      <div className="relative mt-1">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={`h-8 text-xs ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-7' : ''}`}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function Section8UnderwritingCard({
  arv,
  repairCost,
  estimatedRent,
  lastSalePrice,
  address,
  city,
  state,
}: Section8UnderwritingCardProps) {
  // Defaults: purchase = last sale or 75% of ARV
  const defaultPurchase = Math.round(lastSalePrice || (arv || 0) * 0.75) || 0;
  const [purchasePrice, setPurchasePrice] = useState(defaultPurchase);
  const [rehab, setRehab] = useState(Math.round(repairCost || 0));
  const [monthlyRent, setMonthlyRent] = useState(Math.round(estimatedRent || 0));

  // Financing
  const [downPct, setDownPct] = useState(25);
  const [rate, setRate] = useState(7.5);
  const [amortYears, setAmortYears] = useState(30);

  // Taxes — Alabama Class II (rental). Millage varies by county/city; 55 mills is a
  // conservative statewide-ish default for incorporated areas.
  const [millage, setMillage] = useState(55);
  const [assessedValue, setAssessedValue] = useState(0); // 0 = use purchase price

  // Operating (Alabama defaults)
  const [insuranceAnnual, setInsuranceAnnual] = useState(1800);
  const [hoaMonthly, setHoaMonthly] = useState(0);
  const [pmPct, setPmPct] = useState(10);
  const [vacancyPct, setVacancyPct] = useState(5);
  const [repairsPct, setRepairsPct] = useState(5);
  const [capexPct, setCapexPct] = useState(5);
  const [closingPct, setClosingPct] = useState(3);

  const taxBase = assessedValue > 0 ? assessedValue : purchasePrice;
  const effectiveTaxRatePct = AL_CLASS_II_RATIO * (millage / 1000) * 100;

  const m = useMemo(() => {
    const loan = purchasePrice * (1 - downPct / 100);
    const monthlyRate = rate / 100 / 12;
    const n = amortYears * 12;
    const pAndI =
      monthlyRate > 0
        ? (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
        : loan / n;

    // Alabama Class II: assessed = 20% of market value, tax = assessed x millage
    const taxAnnual = taxBase * AL_CLASS_II_RATIO * (millage / 1000);
    const taxMonthly = taxAnnual / 12;
    const insMonthly = insuranceAnnual / 12;
    const piti = pAndI + taxMonthly + insMonthly + hoaMonthly;

    const opexRate = (pmPct + vacancyPct + repairsPct + capexPct) / 100;
    const opex = monthlyRent * opexRate;

    const cashflow = monthlyRent - piti - opex;

    const noiMonthly = monthlyRent - opex - taxMonthly - insMonthly - hoaMonthly;
    const noiAnnual = noiMonthly * 12;

    const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
    const dscr = pAndI > 0 ? noiAnnual / (pAndI * 12) : 0;

    const cashInvested =
      purchasePrice * (downPct / 100) + rehab + purchasePrice * (closingPct / 100);
    const cocReturn =
      cashInvested > 0 ? ((cashflow * 12) / cashInvested) * 100 : 0;

    // Regla del 1%: renta MENSUAL / precio de compra
    const onePctRule = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;

    // 50% rule: gastos operativos (sin deuda) ≤ 50% de la renta
    const actualOpexPlusFixed = opex + taxMonthly + insMonthly + hoaMonthly;
    const fiftyPctPass = monthlyRent > 0 && actualOpexPlusFixed <= monthlyRent * 0.5;
    const fiftyPctActual = monthlyRent > 0 ? (actualOpexPlusFixed / monthlyRent) * 100 : 0;

    return {
      loan,
      pAndI,
      taxAnnual,
      taxMonthly,
      insMonthly,
      hoaMonthly,
      piti,
      opex,
      cashflow,
      noiAnnual,
      capRate,
      dscr,
      cashInvested,
      cocReturn,
      onePctRule,
      fiftyPctPass,
      fiftyPctActual,
    };
  }, [
    purchasePrice,
    downPct,
    rate,
    amortYears,
    taxBase,
    millage,
    insuranceAnnual,
    hoaMonthly,
    pmPct,
    vacancyPct,
    repairsPct,
    capexPct,
    monthlyRent,
    rehab,
    closingPct,
  ]);

  // Semáforo Section 8
  type Light = 'green' | 'yellow' | 'red' | 'none';
  const light: Light = useMemo(() => {
    if (!purchasePrice || !monthlyRent) return 'none';
    if (m.cashflow >= 200 && m.dscr >= 1.25 && m.cocReturn >= 10) return 'green';
    if (m.cashflow > 0 && m.dscr >= 1.1) return 'yellow';
    return 'red';
  }, [m, purchasePrice, monthlyRent]);

  const lightMeta = {
    green: {
      title: 'Deal viable — GO',
      sub: 'Cashflow sólido, DSCR califica cómodo',
      wrap: 'bg-success/10 border-success/25',
      text: 'text-success',
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    yellow: {
      title: 'Deal ajustado — CAUTION',
      sub: 'Negocia precio o rehab para ganar margen',
      wrap: 'bg-warning/10 border-warning/25',
      text: 'text-warning',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    red: {
      title: 'No viable — PASS',
      sub: 'Con estos números no cierra: renegocia o pasa',
      wrap: 'bg-destructive/10 border-destructive/25',
      text: 'text-destructive',
      icon: <XCircle className="h-5 w-5" />,
    },
    none: {
      title: 'Sin datos suficientes',
      sub: 'Ingresa precio de compra y renta esperada',
      wrap: 'bg-muted/40 border-border',
      text: 'text-muted-foreground',
      icon: <Info className="h-5 w-5" />,
    },
  }[light];

  const barBase = Math.max(monthlyRent, m.piti + m.opex, 1);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Verdict banner */}
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${lightMeta.wrap}`}>
          <span className={lightMeta.text}>{lightMeta.icon}</span>
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${lightMeta.text}`}>{lightMeta.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{lightMeta.sub}</div>
            {(address || city) && (
              <div className="text-[11px] text-muted-foreground mt-1 truncate">
                {[address, city, state].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Cashflow / mes"
            value={`$${fmt(m.cashflow)}`}
            tone={m.cashflow >= 200 ? 'good' : m.cashflow > 0 ? 'warn' : 'bad'}
            hint="Renta − PITI − OpEx (PM, vacancy, repairs, capex)"
          />
          <KPI
            icon={<Percent className="h-3.5 w-3.5" />}
            label="DSCR"
            value={m.dscr.toFixed(2)}
            tone={m.dscr >= 1.25 ? 'good' : m.dscr >= 1.1 ? 'warn' : 'bad'}
            hint="NOI anual ÷ servicio de deuda anual. Lenders DSCR piden ≥ 1.20-1.25"
          />
          <KPI
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Cap rate"
            value={pct(m.capRate)}
            tone={m.capRate >= 8 ? 'good' : m.capRate >= 6 ? 'warn' : 'bad'}
            hint="NOI anual ÷ precio de compra. Section 8 Alabama target ≥ 8%"
          />
          <KPI
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="Cash-on-cash"
            value={pct(m.cocReturn)}
            tone={m.cocReturn >= 10 ? 'good' : m.cocReturn >= 6 ? 'warn' : 'bad'}
            hint="Cashflow anual ÷ efectivo invertido (down + rehab + closing)"
          />
        </div>

        {/* Desglose con barras proporcionales */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Desglose del cashflow mensual
          </h4>
          <div className="space-y-2.5">
            <BarRow label="Renta esperada" amount={monthlyRent} base={barBase} tone="income" bold />
            <BarRow label="P & I préstamo" amount={-m.pAndI} base={barBase} tone="expense" />
            <BarRow label="Property tax (Clase II)" amount={-m.taxMonthly} base={barBase} tone="expense" />
            <BarRow label="Insurance (estimado)" amount={-m.insMonthly} base={barBase} tone="expense" />
            {hoaMonthly > 0 && (
              <BarRow label="HOA" amount={-hoaMonthly} base={barBase} tone="expense" />
            )}
            <BarRow
              label={`OpEx ${pmPct + vacancyPct + repairsPct + capexPct}%`}
              amount={-m.opex}
              base={barBase}
              tone="expense"
            />
            <div className="border-t border-border pt-2.5 flex justify-between text-sm">
              <span className="font-semibold">Cashflow mensual</span>
              <span
                className={`font-semibold tabular-nums ${
                  m.cashflow > 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                ${fmt(m.cashflow)}
              </span>
            </div>
          </div>
        </Card>

        {/* Benchmarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BenchmarkCard
            title="Regla del 1%"
            value={pct(m.onePctRule, 2)}
            caption="renta mensual ÷ precio de compra"
            pass={m.onePctRule >= 1}
            passHint="≥ 1% — Section 8 friendly"
            failHint="< 1% — busca mejor precio o renta"
          />
          <BenchmarkCard
            title="Regla del 50%"
            value={m.fiftyPctPass ? 'Pasa' : 'Excede'}
            caption={`OpEx + fijos = ${pct(m.fiftyPctActual)} de la renta`}
            pass={m.fiftyPctPass}
            passHint="≤ 50% de la renta"
            failHint="> 50% — revisa gastos"
          />
        </div>

        <Card variant="glass" className="p-4">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Cash invertido total (down + rehab + closing)
            </span>
            <span className="font-semibold tabular-nums">${fmt(m.cashInvested)}</span>
          </div>
        </Card>

        {/* Inputs propiedad */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-primary" /> Propiedad
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField
              label="Precio de compra"
              value={purchasePrice}
              onChange={setPurchasePrice}
              prefix="$"
            />
            <NumberField
              label="Rehab estimado"
              value={rehab}
              onChange={setRehab}
              prefix="$"
            />
            <NumberField
              label={estimatedRent ? 'Renta Section 8 / mes' : 'Renta esperada / mes'}
              value={monthlyRent}
              onChange={setMonthlyRent}
              prefix="$"
            />
          </div>
          {!estimatedRent && (
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Tip: usa HUD Fair Market Rent del ZIP para estimar la renta del voucher.
            </p>
          )}
        </Card>

        {/* Financiamiento */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Financiamiento (DSCR)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField label="Down payment" value={downPct} onChange={setDownPct} suffix="%" />
            <NumberField
              label="Tasa de interés"
              value={rate}
              onChange={setRate}
              suffix="%"
              step={0.125}
            />
            <NumberField
              label="Amortización"
              value={amortYears}
              onChange={setAmortYears}
              suffix="yr"
            />
          </div>
        </Card>

        {/* Impuestos */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Property tax — Alabama Clase II (renta)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField
              label="Millage rate"
              value={millage}
              onChange={setMillage}
              suffix="mills"
              hint="Tasa combinada estado + condado + ciudad. Varía por jurisdicción (típico 40-70 mills en Alabama)."
            />
            <NumberField
              label="Valor tasado (opcional)"
              value={assessedValue}
              onChange={setAssessedValue}
              prefix="$"
              hint="Market value del county assessor. Si lo dejas en 0 se usa el precio de compra."
            />
            <div className="rounded-lg border border-border bg-background/40 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Impuesto anual
              </div>
              <div className="text-sm font-semibold tabular-nums mt-1">${fmt(m.taxAnnual)}</div>
              <div className="text-[10px] text-muted-foreground">
                {pct(effectiveTaxRatePct, 2)} efectivo
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Se aplica la{' '}
              <strong className="font-medium text-foreground">
                Clase II (20% de assessment ratio)
              </strong>{' '}
              porque es propiedad de alquiler, no homestead. Usar la Clase III (10%) subestimaría el
              impuesto a la mitad. Tampoco aplica la exención de homestead.
            </p>
          </div>

        </Card>

        {/* Operating */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Gastos operativos
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField
              label="Insurance / año"
              value={insuranceAnnual}
              onChange={setInsuranceAnnual}
              prefix="$"
            />
            <NumberField label="HOA / mes" value={hoaMonthly} onChange={setHoaMonthly} prefix="$" />
            <NumberField label="Property mgmt" value={pmPct} onChange={setPmPct} suffix="%" />
            <NumberField label="Vacancy" value={vacancyPct} onChange={setVacancyPct} suffix="%" />
            <NumberField label="Repairs" value={repairsPct} onChange={setRepairsPct} suffix="%" />
            <NumberField label="CapEx" value={capexPct} onChange={setCapexPct} suffix="%" />
          </div>
          <div className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-3 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="font-medium text-foreground">Insurance es un estimado.</strong>{' '}
              Cotiza con un agente antes de comprometerte. En la costa de Alabama (Mobile, Baldwin,
              Gulf Shores) y en zonas FEMA de inundación, wind/hail y flood pueden duplicar o
              triplicar esta cifra, y muchas veces se cotizan como pólizas separadas.
            </p>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function KPI({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad';
  hint: string;
}) {
  const toneClass = {
    good: 'text-success',
    warn: 'text-warning',
    bad: 'text-destructive',
  }[tone];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-xl border border-border bg-background/40 p-3 cursor-help">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            {icon}
            {label}
          </div>
          <div className={`text-xl font-semibold tabular-nums mt-1 ${toneClass}`}>{value}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function BarRow({
  label,
  amount,
  base,
  tone,
  bold,
}: {
  label: string;
  amount: number;
  base: number;
  tone: 'income' | 'expense';
  bold?: boolean;
}) {
  const width = Math.min(100, (Math.abs(amount) / base) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className={bold ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
        <span
          className={`tabular-nums ${bold ? 'font-medium' : ''} ${
            tone === 'expense' ? 'text-destructive' : ''
          }`}
        >
          {tone === 'expense' ? '−' : ''}${fmt(Math.abs(amount))}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${tone === 'income' ? 'bg-success' : 'bg-destructive/50'}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function BenchmarkCard({
  title,
  value,
  caption,
  pass,
  passHint,
  failHint,
}: {
  title: string;
  value: string;
  caption: string;
  pass: boolean;
  passHint: string;
  failHint: string;
}) {
  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{caption}</div>
        </div>
        <div className={`flex items-center gap-1 text-[11px] ${pass ? 'text-success' : 'text-warning'}`}>
          {pass ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </div>
      </div>
      <Badge
        variant="outline"
        className={`mt-2 text-[10px] ${
          pass
            ? 'bg-success/10 text-success border-success/30'
            : 'bg-warning/10 text-warning border-warning/30'
        }`}
      >
        {pass ? passHint : failHint}
      </Badge>
    </Card>
  );
}
