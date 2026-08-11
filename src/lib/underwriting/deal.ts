import type {
  AcquisitionInputs,
  DealResult,
  FinancingResult,
  HoldingResult,
  SellingResult,
} from './types';

export function computeClosingCosts(input: AcquisitionInputs): number {
  return Math.round(input.purchasePrice * (input.buyerClosingPct / 100) + input.buyerClosingFlat);
}

export function computeDeal(params: {
  purchasePrice: number;
  closingCosts: number;
  rehab: number;
  arv: number;
  financing: FinancingResult;
  holding: HoldingResult;
  selling: SellingResult;
  cashReserve?: number;
}): DealResult {
  const { purchasePrice, closingCosts, rehab, arv, financing, holding, selling } = params;
  const cashReserve = params.cashReserve ?? 0;

  const financingCost = financing.totalFinancingCost;
  const holdingCost = holding.total;
  const sellingCost = selling.total;

  const totalProjectCost =
    purchasePrice + closingCosts + rehab + financingCost + holdingCost + sellingCost;

  const grossProfit = arv - totalProjectCost;

  // Cash out of pocket: down payment, closing, unfinanced rehab, lender upfront fees,
  // interest paid during the hold, holding costs, and any reserve.
  const cashRequired = Math.round(
    financing.downPayment +
      closingCosts +
      financing.unfinancedRehab +
      financing.upfrontLenderCash +
      financing.totalInterest +
      financing.privateMoneyInterest +
      holdingCost +
      cashReserve
  );

  const roi = cashRequired > 0 ? grossProfit / cashRequired : 0;
  const months = holding.months || 6;

  return {
    purchasePrice: Math.round(purchasePrice),
    closingCosts: Math.round(closingCosts),
    rehab: Math.round(rehab),
    financingCost: Math.round(financingCost),
    holdingCost: Math.round(holdingCost),
    sellingCost: Math.round(sellingCost),
    totalProjectCost: Math.round(totalProjectCost),
    arv: Math.round(arv),
    grossProfit: Math.round(grossProfit),
    roi,
    cashOnCash: roi,
    profitMarginPct: arv > 0 ? grossProfit / arv : 0,
    annualizedRoi: roi * (12 / months),
    cashRequired,
  };
}
