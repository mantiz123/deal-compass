import type { FinancingInputs, FinancingResult } from './types';

export const DEFAULT_FINANCING: FinancingInputs = {
  useHardMoney: true,
  purchasePrice: 0,
  rehabBudget: 0,
  arv: 0,
  ltvPurchasePct: 85,
  ltcPct: 90,
  arvLtvPct: 70,
  rehabFinancedPct: 100,
  interestRatePct: 12,
  points: 2,
  originationPct: 0,
  lenderFlatFees: 1500,
  termMonths: 6,
  interestOnly: true,
  drawUtilizationPct: 60,
  privateMoneyAmount: 0,
  privateMoneyRatePct: 10,
};

/**
 * Hard Money model. Nothing is hardcoded per lender — every cap is an input.
 * The loan is the MINIMUM of the three caps every HM lender applies:
 * purchase LTV + rehab draws, LTC on total cost, and LTV on ARV.
 */
export function computeFinancing(input: FinancingInputs): FinancingResult {
  const {
    useHardMoney,
    purchasePrice,
    rehabBudget,
    arv,
    ltvPurchasePct,
    ltcPct,
    arvLtvPct,
    rehabFinancedPct,
    interestRatePct,
    points,
    originationPct,
    lenderFlatFees,
    termMonths,
    interestOnly,
    drawUtilizationPct,
    privateMoneyAmount,
    privateMoneyRatePct,
  } = input;

  if (!useHardMoney) {
    const pmInterest = (privateMoneyAmount * (privateMoneyRatePct / 100) * termMonths) / 12;
    return {
      loanAmount: privateMoneyAmount,
      loanCapReason: privateMoneyAmount > 0 ? 'Private money únicamente' : 'Compra en efectivo',
      downPayment: Math.max(0, purchasePrice - privateMoneyAmount),
      unfinancedRehab: rehabBudget,
      pointsCost: 0,
      originationCost: 0,
      lenderFlatFees: 0,
      monthlyInterest: termMonths ? pmInterest / termMonths : 0,
      totalInterest: 0,
      privateMoneyInterest: Math.round(pmInterest),
      totalFinancingCost: Math.round(pmInterest),
      balloonAtSale: privateMoneyAmount,
      upfrontLenderCash: 0,
    };
  }

  const purchasePortion = purchasePrice * (ltvPurchasePct / 100);
  const rehabPortion = rehabBudget * (rehabFinancedPct / 100);
  const requested = purchasePortion + rehabPortion;

  const ltcCap = (purchasePrice + rehabBudget) * (ltcPct / 100);
  const arvCap = arv * (arvLtvPct / 100);

  const caps: { amount: number; reason: string }[] = [
    { amount: requested, reason: `LTV ${ltvPurchasePct}% compra + ${rehabFinancedPct}% rehab` },
    { amount: ltcCap, reason: `Tope LTC ${ltcPct}% del costo total` },
    { amount: arvCap, reason: `Tope ${arvLtvPct}% del ARV` },
  ];
  const binding = caps.reduce((min, c) => (c.amount < min.amount ? c : min), caps[0]);
  const loanAmount = Math.max(0, Math.round(binding.amount));

  // Split the granted loan back into purchase vs rehab money (purchase funded first).
  const purchaseFunded = Math.min(loanAmount, purchasePortion);
  const rehabFunded = Math.max(0, loanAmount - purchaseFunded);

  const downPayment = Math.max(0, Math.round(purchasePrice - purchaseFunded));
  const unfinancedRehab = Math.max(0, Math.round(rehabBudget - rehabFunded));

  const pointsCost = Math.round(loanAmount * (points / 100));
  const originationCost = Math.round(loanAmount * (originationPct / 100));

  // Rehab draws are released over time — only a share is outstanding on average.
  const avgBalance = purchaseFunded + rehabFunded * (drawUtilizationPct / 100);
  const monthlyInterest = Math.round((avgBalance * (interestRatePct / 100)) / 12);
  const totalInterest = Math.round(monthlyInterest * termMonths);

  const pmInterest = Math.round((privateMoneyAmount * (privateMoneyRatePct / 100) * termMonths) / 12);

  const totalFinancingCost =
    pointsCost + originationCost + lenderFlatFees + totalInterest + pmInterest;

  return {
    loanAmount,
    loanCapReason: binding.reason,
    downPayment,
    unfinancedRehab,
    pointsCost,
    originationCost,
    lenderFlatFees,
    monthlyInterest,
    totalInterest,
    privateMoneyInterest: pmInterest,
    totalFinancingCost,
    balloonAtSale: interestOnly ? loanAmount + privateMoneyAmount : loanAmount + privateMoneyAmount,
    upfrontLenderCash: pointsCost + originationCost + lenderFlatFees,
  };
}
