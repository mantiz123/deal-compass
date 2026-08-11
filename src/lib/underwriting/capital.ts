export interface CapitalResult {
  cashRequired: number;
  cashAvailable: number;
  remaining: number;
  shortfall: number;
  fits: boolean;
  label: string;
}

export const DEFAULT_CASH_AVAILABLE = 30000;

export function computeCapital(cashRequired: number, cashAvailable: number): CapitalResult {
  const diff = cashAvailable - cashRequired;
  return {
    cashRequired: Math.round(cashRequired),
    cashAvailable: Math.round(cashAvailable),
    remaining: Math.max(0, Math.round(diff)),
    shortfall: Math.max(0, Math.round(-diff)),
    fits: diff >= 0,
    label:
      diff >= 0
        ? `Cabe en el capital disponible`
        : `No cabe — faltan $${Math.round(-diff).toLocaleString()}`,
  };
}
