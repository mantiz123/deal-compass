import { computeFinancing } from './financing';
import { computeHolding } from './holding';
import { computeSelling } from './selling';
import { computeClosingCosts, computeDeal } from './deal';
import type { FinancingInputs, HoldingInputs, SellingInputs } from './types';

export interface MaoInputs {
  arv: number;
  rehab: number;
  desiredProfit: number;
  riskBufferPct: number; // % of ARV held back as buffer
  buyerClosingPct: number;
  buyerClosingFlat: number;
  financing: FinancingInputs;
  holding: HoldingInputs;
  selling: SellingInputs;
}

export interface MaoResult {
  maxPurchasePrice: number;
  lowOffer: number;
  targetOffer: number;
  doNotExceed: number;
  riskBuffer: number;
  impliedPctOfArv: number;
  iterations: number;
  explanation: string;
}

/**
 * MAO solved by iteration: financing and closing costs depend on the price itself,
 * so we converge instead of applying a blind 70% rule.
 */
export function computeMao(input: MaoInputs): MaoResult {
  const { arv, rehab, desiredProfit, riskBufferPct } = input;
  const riskBuffer = Math.round(arv * (riskBufferPct / 100));
  const selling = computeSelling(arv, input.selling);

  let price = Math.max(0, arv * 0.5);
  let iterations = 0;

  for (let i = 0; i < 12; i++) {
    iterations = i + 1;
    const closing = computeClosingCosts({
      purchasePrice: price,
      buyerClosingPct: input.buyerClosingPct,
      buyerClosingFlat: input.buyerClosingFlat,
    });
    const financing = computeFinancing({
      ...input.financing,
      purchasePrice: price,
      rehabBudget: rehab,
      arv,
    });
    const holding = computeHolding(input.holding);

    const next =
      arv -
      rehab -
      closing -
      financing.totalFinancingCost -
      holding.total -
      selling.total -
      desiredProfit -
      riskBuffer;

    if (Math.abs(next - price) < 250) {
      price = next;
      break;
    }
    price = next;
  }

  const maxPurchasePrice = Math.max(0, Math.round(price));

  return {
    maxPurchasePrice,
    lowOffer: Math.round(maxPurchasePrice * 0.82),
    targetOffer: Math.round(maxPurchasePrice * 0.92),
    doNotExceed: maxPurchasePrice,
    riskBuffer,
    impliedPctOfArv: arv > 0 ? maxPurchasePrice / arv : 0,
    iterations,
    explanation:
      'MAO = ARV − rehab − closing − financiación − holding − costos de venta − ganancia deseada − buffer de riesgo, resuelto iterativamente porque la financiación depende del precio.',
  };
}

export function computeMaoFromDeal(params: {
  arv: number;
  rehab: number;
  closingCosts: number;
  financingCost: number;
  holdingCost: number;
  sellingCost: number;
  desiredProfit: number;
  riskBuffer: number;
}): number {
  return Math.round(
    params.arv -
      params.rehab -
      params.closingCosts -
      params.financingCost -
      params.holdingCost -
      params.sellingCost -
      params.desiredProfit -
      params.riskBuffer
  );
}
