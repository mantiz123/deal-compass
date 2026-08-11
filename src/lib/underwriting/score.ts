import type { ArvResult } from './comps';
import type { CapitalResult } from './capital';
import type { LiquidityResult } from './liquidity';
import type { DealResult, RehabResult, SubjectProperty } from './types';

export interface SubScore {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number;
  detail: string;
}

export interface InvestmentScoreResult {
  total: number;
  decision: 'buy' | 'negotiate' | 'pass';
  decisionLabel: string;
  subScores: SubScore[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeInvestmentScore(params: {
  subject: SubjectProperty;
  arv: ArvResult;
  arvUsed: number;
  rehab: RehabResult;
  deal: DealResult;
  capital: CapitalResult;
  liquidity: LiquidityResult;
  financingLoanAmount: number;
  compsCount: number;
}): InvestmentScoreResult {
  const { arv, arvUsed, rehab, deal, capital, liquidity, financingLoanAmount, compsCount } = params;

  const subScores: SubScore[] = [];

  // 1. Location — proxied by comp density and liquidity until external data is wired
  subScores.push({
    key: 'location',
    label: 'Location',
    score: clamp(liquidity.score * 0.8 + Math.min(20, compsCount * 4)),
    weight: 0.1,
    detail: `${compsCount} comparables en el área, liquidez ${liquidity.label}`,
  });

  // 2. Purchase price vs ARV
  const purchasePct = arvUsed > 0 ? deal.purchasePrice / arvUsed : 1;
  subScores.push({
    key: 'purchase_price',
    label: 'Purchase Price',
    score: clamp(100 - (purchasePct - 0.25) * 260),
    weight: 0.15,
    detail: `Precio = ${(purchasePct * 100).toFixed(0)}% del ARV`,
  });

  // 3. ARV potential — spread between conservative and optimistic
  const spread = arv.base > 0 ? (arv.optimistic - arv.conservative) / arv.base : 1;
  subScores.push({
    key: 'arv_potential',
    label: 'ARV Potential',
    score: clamp(100 - spread * 200),
    weight: 0.1,
    detail: `Rango ARV $${arv.conservative.toLocaleString()} – $${arv.optimistic.toLocaleString()} (${(spread * 100).toFixed(0)}% de dispersión)`,
  });

  // 4. Rehab risk
  const rehabPct = arvUsed > 0 ? rehab.base / arvUsed : 1;
  subScores.push({
    key: 'rehab_risk',
    label: 'Rehab Risk',
    score: clamp(100 - (rehabPct - 0.1) * 250),
    weight: 0.12,
    detail: `Rehab estimado = ${(rehabPct * 100).toFixed(0)}% del ARV (nivel ${rehab.level})`,
  });

  // 5. Resale liquidity
  subScores.push({
    key: 'resale_liquidity',
    label: 'Resale Liquidity',
    score: clamp(liquidity.score),
    weight: 0.12,
    detail: `${liquidity.label} (${liquidity.score}/100)`,
  });

  // 6. Comparable strength
  const confPts = arv.confidence === 'high' ? 100 : arv.confidence === 'medium' ? 65 : 30;
  subScores.push({
    key: 'comparable_strength',
    label: 'Comparable Strength',
    score: clamp(confPts - arv.discarded.length * 3),
    weight: 0.1,
    detail: `${arv.used.length} comps usados, ${arv.discarded.length} descartados, confianza ${arv.confidence}`,
  });

  // 7. Financing feasibility
  const financedPct =
    deal.purchasePrice + rehab.base > 0
      ? financingLoanAmount / (deal.purchasePrice + rehab.base)
      : 0;
  subScores.push({
    key: 'financing_feasibility',
    label: 'Financing Feasibility',
    score: clamp(financedPct * 115),
    weight: 0.08,
    detail: `El préstamo cubre ${(financedPct * 100).toFixed(0)}% de compra + rehab`,
  });

  // 8. Profit potential
  const margin = deal.profitMarginPct;
  subScores.push({
    key: 'profit_potential',
    label: 'Profit Potential',
    score: clamp((margin / 0.25) * 100),
    weight: 0.15,
    detail: `Ganancia $${deal.grossProfit.toLocaleString()} · margen ${(margin * 100).toFixed(1)}% del ARV`,
  });

  // 9. Cash required vs available
  const cashRatio = capital.cashAvailable > 0 ? capital.cashRequired / capital.cashAvailable : 2;
  subScores.push({
    key: 'cash_required',
    label: 'Cash Required',
    score: clamp(140 - cashRatio * 100),
    weight: 0.08,
    detail: capital.fits
      ? `Requiere $${capital.cashRequired.toLocaleString()} de $${capital.cashAvailable.toLocaleString()} disponibles`
      : `Faltan $${capital.shortfall.toLocaleString()}`,
  });

  const total = Math.round(
    subScores.reduce((s, x) => s + x.score * x.weight, 0) /
      subScores.reduce((s, x) => s + x.weight, 0)
  );

  // Hard gates: no matter the score, these kill or downgrade the deal.
  let decision: InvestmentScoreResult['decision'];
  if (deal.grossProfit <= 0 || !capital.fits || arv.used.length === 0) {
    decision = 'pass';
  } else if (total >= 72 && margin >= 0.15 && deal.roi >= 0.3) {
    decision = 'buy';
  } else if (total >= 52) {
    decision = 'negotiate';
  } else {
    decision = 'pass';
  }

  const decisionLabel =
    decision === 'buy'
      ? 'BUY — los números soportan la compra al precio modelado'
      : decision === 'negotiate'
        ? 'NEGOTIATE — funciona sólo a un precio menor o con mejores términos'
        : 'PASS — el negocio no cierra con los supuestos actuales';

  return { total, decision, decisionLabel, subScores };
}
