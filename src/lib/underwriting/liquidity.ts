import type { Comp } from './types';

export interface LiquidityResult {
  score: number;
  label: 'Excellent' | 'Good' | 'Moderate' | 'Weak' | 'Very Weak';
  factors: { label: string; points: number; max: number; detail: string }[];
}

export function computeLiquidity(comps: Comp[], arv: number): LiquidityResult {
  const closed = comps.filter((c) => c.status === 'closed' && c.price);
  const active = comps.filter((c) => c.status === 'active');
  const pending = comps.filter((c) => c.status === 'pending');
  const factors: LiquidityResult['factors'] = [];

  // Recent closed sales volume (0-30)
  const closedPts = Math.min(30, closed.length * 7.5);
  factors.push({
    label: 'Ventas cerradas recientes',
    points: closedPts,
    max: 30,
    detail: `${closed.length} ventas cerradas en los comparables`,
  });

  // Days on market (0-20)
  const doms = comps.map((c) => c.days_on_market).filter((d): d is number => typeof d === 'number');
  const avgDom = doms.length ? doms.reduce((s, d) => s + d, 0) / doms.length : null;
  const domPts = avgDom === null ? 10 : avgDom <= 30 ? 20 : avgDom <= 60 ? 15 : avgDom <= 90 ? 9 : 4;
  factors.push({
    label: 'Días en mercado',
    points: domPts,
    max: 20,
    detail: avgDom === null ? 'Dato no disponible — puntaje neutral' : `Promedio ${Math.round(avgDom)} días`,
  });

  // Pending demand (0-15)
  const pendPts = Math.min(15, pending.length * 7.5);
  factors.push({
    label: 'Demanda pendiente',
    points: pendPts,
    max: 15,
    detail: `${pending.length} propiedades bajo contrato`,
  });

  // Inventory pressure (0-15) — too much active inventory hurts
  const invPts = active.length === 0 ? 12 : active.length <= 3 ? 15 : active.length <= 6 ? 9 : 4;
  factors.push({
    label: 'Inventario activo',
    points: invPts,
    max: 15,
    detail: `${active.length} listados activos compitiendo`,
  });

  // Price dispersion (0-20) — tight comps = predictable resale
  const prices = closed.map((c) => c.price as number);
  let dispPts = 8;
  let dispDetail = 'Comps insuficientes para medir dispersión';
  if (prices.length >= 2) {
    const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
    const sd = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
    const cv = mean > 0 ? sd / mean : 1;
    dispPts = cv <= 0.12 ? 20 : cv <= 0.2 ? 15 : cv <= 0.3 ? 9 : 4;
    dispDetail = `Coeficiente de variación ${(cv * 100).toFixed(0)}%`;
  }
  factors.push({ label: 'Consistencia de precios', points: dispPts, max: 20, detail: dispDetail });

  const score = Math.round(factors.reduce((s, f) => s + f.points, 0));
  const label: LiquidityResult['label'] =
    score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Moderate' : score >= 35 ? 'Weak' : 'Very Weak';

  return { score, label, factors };
}
