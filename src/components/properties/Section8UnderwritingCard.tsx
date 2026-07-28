import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Home, TrendingUp, Percent, DollarSign, Wallet, Info } from 'lucide-react';
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

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
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

  // Operating (Alabama defaults)
  const [taxRatePct, setTaxRatePct] = useState(0.9); // % of purchase / yr
  const [insuranceAnnual, setInsuranceAnnual] = useState(1400);
  const [hoaMonthly, setHoaMonthly] = useState(0);
  const [pmPct, setPmPct] = useState(10);
  const [vacancyPct, setVacancyPct] = useState(5);
  const [repairsPct, setRepairsPct] = useState(5);
  const [capexPct, setCapexPct] = useState(5);
  const [closingPct, setClosingPct] = useState(3);

  const m = useMemo(() => {
    const loan = purchasePrice * (1 - downPct / 100);
    const monthlyRate = rate / 100 / 12;
    const n = amortYears * 12;
    const pAndI =
      monthlyRate > 0
        ? (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
        : loan / n;

    const taxMonthly = (purchasePrice * (taxRatePct / 100)) / 12;
    const insMonthly = insuranceAnnual / 12;
    const piti = pAndI + taxMonthly + insMonthly + hoaMonthly;

    const opexRate = (pmPct + vacancyPct + repairsPct + capexPct) / 100;
    const opex = monthlyRent * opexRate;

    const cashflow = monthlyRent - piti - opex;

    // NOI excludes debt service and HOA is an operating expense
    const noiMonthly = monthlyRent - opex - taxMonthly - insMonthly - hoaMonthly;
    const noiAnnual = noiMonthly * 12;

    const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
    const dscr = pAndI > 0 ? noiAnnual / (pAndI * 12) : 0;

    const cashInvested =
      purchasePrice * (downPct / 100) + rehab + purchasePrice * (closingPct / 100);
    const cocReturn =
      cashInvested > 0 ? ((cashflow * 12) / cashInvested) * 100 : 0;

    const rentToPrice =
      purchasePrice > 0 ? ((monthlyRent * 12) / purchasePrice) * 100 : 0;

    // 50% rule sanity check: operating expenses (ex debt) should be ≤ 50% of rent
    const fiftyPctOpex = monthlyRent * 0.5;
    const actualOpexPlusFixed = opex + taxMonthly + insMonthly + hoaMonthly;
    const fiftyPctPass = actualOpexPlusFixed <= fiftyPctOpex;

    return {
      loan,
      pAndI,
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
      rentToPrice,
      fiftyPctPass,
    };
  }, [
    purchasePrice,
    downPct,
    rate,
    amortYears,
    taxRatePct,
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
      color: 'bg-success',
      label: 'Deal viable — cashflow sólido, DSCR califica',
      badge: 'GO',
      badgeClass: 'bg-success/15 text-success border-success/30',
    },
    yellow: {
      color: 'bg-warning',
      label: 'Deal ajustado — negocia precio o rehab',
      badge: 'CAUTION',
      badgeClass: 'bg-warning/15 text-warning border-warning/30',
    },
    red: {
      color: 'bg-destructive',
      label: 'No viable con estos números — pasar o renegociar',
      badge: 'PASS',
      badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
    },
    none: {
      color: 'bg-muted',
      label: 'Ingresa precio y renta esperada',
      badge: '—',
      badgeClass: 'bg-muted text-muted-foreground border-border',
    },
  }[light];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Header + Semáforo */}
        <Card variant="glass" className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                Section 8 Underwriting
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[address, city, state].filter(Boolean).join(', ') || 'Análisis buy & hold'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${lightMeta.color} shadow-sm`} />
              <Badge variant="outline" className={`text-[10px] ${lightMeta.badgeClass}`}>
                {lightMeta.badge}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{lightMeta.label}</p>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              label="Cap Rate"
              value={pct(m.capRate)}
              tone={m.capRate >= 8 ? 'good' : m.capRate >= 6 ? 'warn' : 'bad'}
              hint="NOI anual ÷ precio de compra. Section 8 Alabama target ≥ 8%"
            />
            <KPI
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Cash-on-Cash"
              value={pct(m.cocReturn)}
              tone={m.cocReturn >= 10 ? 'good' : m.cocReturn >= 6 ? 'warn' : 'bad'}
              hint="Cashflow anual ÷ efectivo invertido (down + rehab + closing)"
            />
          </div>

          {/* Breakdown mensual */}
          <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-xs">
            <Row label="Renta esperada" value={`$${fmt(monthlyRent)}`} bold />
            <Row label="− P&I préstamo" value={`−$${fmt(m.pAndI)}`} negative />
            <Row label="− Property tax" value={`−$${fmt(m.taxMonthly)}`} negative />
            <Row label="− Insurance" value={`−$${fmt(m.insMonthly)}`} negative />
            <Row
              label={`− OpEx (${pmPct + vacancyPct + repairsPct + capexPct}%)`}
              value={`−$${fmt(m.opex)}`}
              negative
            />
            <div className="border-t border-border pt-1.5 mt-1">
              <Row
                label="= Cashflow mensual"
                value={`$${fmt(m.cashflow)}`}
                bold
                positive={m.cashflow > 0}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground pt-2">
              <span>Rent-to-price ratio</span>
              <span className="tabular-nums">
                {pct(m.rentToPrice)}{' '}
                {m.rentToPrice >= 12 ? '✓ Section 8 friendly' : '— buscar > 12%'}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Cash invertido (down + rehab + closing)</span>
              <span className="tabular-nums">${fmt(m.cashInvested)}</span>
            </div>
          </div>
        </Card>

        {/* Inputs propiedad */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Propiedad
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
              label={
                estimatedRent ? 'Renta Section 8 / mes' : 'Renta esperada / mes'
              }
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
            <NumberField
              label="Down payment"
              value={downPct}
              onChange={setDownPct}
              suffix="%"
            />
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

        {/* Operating */}
        <Card variant="glass" className="p-4">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Gastos operativos
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField
              label="Property tax / año"
              value={taxRatePct}
              onChange={setTaxRatePct}
              suffix="%"
              step={0.1}
            />
            <NumberField
              label="Insurance / año"
              value={insuranceAnnual}
              onChange={setInsuranceAnnual}
              prefix="$"
            />
            <NumberField
              label="Property mgmt"
              value={pmPct}
              onChange={setPmPct}
              suffix="%"
            />
            <NumberField
              label="Vacancy"
              value={vacancyPct}
              onChange={setVacancyPct}
              suffix="%"
            />
            <NumberField
              label="Repairs"
              value={repairsPct}
              onChange={setRepairsPct}
              suffix="%"
            />
            <NumberField
              label="CapEx"
              value={capexPct}
              onChange={setCapexPct}
              suffix="%"
            />
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
        <div className="rounded-lg border border-border bg-background/40 p-2.5 cursor-help">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            {icon}
            {label}
          </div>
          <div className={`text-base font-semibold tabular-nums mt-1 ${toneClass}`}>
            {value}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
  positive,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span
        className={`tabular-nums ${bold ? 'font-semibold' : ''} ${
          negative ? 'text-destructive' : positive ? 'text-success' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
