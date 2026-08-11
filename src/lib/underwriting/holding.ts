import type { HoldingInputs, HoldingResult, SubjectProperty } from './types';

export function defaultHolding(subject: SubjectProperty, months = 6): HoldingInputs {
  const annualTaxes = subject.annual_taxes ?? 1000;
  return {
    months,
    monthlyTaxes: Math.round(annualTaxes / 12),
    monthlyInsurance: 145, // builder's risk / vacant policy Alabama
    monthlyUtilities: 180,
    monthlyHoa: 0,
    monthlyMaintenance: 75,
    monthlySecurity: 0,
    monthlyLawn: 90,
    monthlyOther: 0,
  };
}

export function computeHolding(input: HoldingInputs): HoldingResult {
  const rows: { label: string; monthly: number }[] = [
    { label: 'Property taxes', monthly: input.monthlyTaxes },
    { label: 'Insurance', monthly: input.monthlyInsurance },
    { label: 'Utilities', monthly: input.monthlyUtilities },
    { label: 'HOA', monthly: input.monthlyHoa },
    { label: 'Maintenance', monthly: input.monthlyMaintenance },
    { label: 'Security', monthly: input.monthlySecurity },
    { label: 'Lawn', monthly: input.monthlyLawn },
    { label: 'Other', monthly: input.monthlyOther },
  ].filter((r) => r.monthly > 0);

  const monthlyTotal = rows.reduce((s, r) => s + r.monthly, 0);
  return {
    months: input.months,
    monthlyTotal,
    total: Math.round(monthlyTotal * input.months),
    breakdown: rows.map((r) => ({ ...r, total: Math.round(r.monthly * input.months) })),
  };
}
