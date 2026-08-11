import { computeFinancing } from './financing';
import { computeHolding } from './holding';
import { computeSelling } from './selling';
import { computeClosingCosts, computeDeal } from './deal';
import { computeCapital } from './capital';
import type { FinancingInputs, HoldingInputs, SellingInputs } from './types';

export interface StructureOption {
  key: string;
  name: string;
  description: string;
  cashRequired: number;
  loanAmount: number;
  monthlyPayment: number;
  financingCost: number;
  totalProjectCost: number;
  profit: number;
  roi: number;
  fitsCapital: boolean;
  recommended: boolean;
  caveat?: string;
}

export function computeStructures(params: {
  purchasePrice: number;
  rehab: number;
  arv: number;
  buyerClosingPct: number;
  buyerClosingFlat: number;
  financing: FinancingInputs;
  holding: HoldingInputs;
  selling: SellingInputs;
  cashAvailable: number;
  cashReserve: number;
}): StructureOption[] {
  const { purchasePrice, rehab, arv, cashAvailable, cashReserve } = params;
  const closingCosts = computeClosingCosts({
    purchasePrice,
    buyerClosingPct: params.buyerClosingPct,
    buyerClosingFlat: params.buyerClosingFlat,
  });
  const holding = computeHolding(params.holding);
  const selling = computeSelling(arv, params.selling);

  const base = { ...params.financing, purchasePrice, rehabBudget: rehab, arv };

  const variants: {
    key: string;
    name: string;
    description: string;
    fin: FinancingInputs;
    caveat?: string;
  }[] = [
    {
      key: 'cash',
      name: 'Cash Purchase',
      description: 'Compra y rehab 100% con capital propio. Cero costo de financiación.',
      fin: { ...base, useHardMoney: false, privateMoneyAmount: 0 },
    },
    {
      key: 'hm_purchase',
      name: 'Hard Money — Purchase Only',
      description: 'El lender financia sólo la compra; el rehab sale de bolsillo.',
      fin: { ...base, useHardMoney: true, rehabFinancedPct: 0 },
    },
    {
      key: 'hm_purchase_rehab',
      name: 'Hard Money — Purchase + Rehab',
      description: 'El lender financia compra y rehab por draws. Estructura estándar de flip.',
      fin: { ...base, useHardMoney: true, rehabFinancedPct: 100 },
    },
    {
      key: 'hm_private',
      name: 'Hard Money + Private Money',
      description:
        'Hard money para compra + rehab y private money para cubrir el down payment y los costos de cierre.',
      fin: {
        ...base,
        useHardMoney: true,
        rehabFinancedPct: 100,
        privateMoneyAmount: Math.round(purchasePrice * (1 - base.ltvPurchasePct / 100) + closingCosts),
      },
      caveat: 'Requiere un socio prestamista real; muchos HM lenders prohíben gravámenes secundarios.',
    },
    {
      key: 'seller_finance',
      name: 'Seller Financing',
      description: 'El vendedor financia el 80% del precio; el rehab lo aporta el inversionista.',
      fin: {
        ...base,
        useHardMoney: false,
        privateMoneyAmount: Math.round(purchasePrice * 0.8),
        privateMoneyRatePct: 8,
      },
      caveat: 'Sólo viable si el vendedor acepta financiar — confirmar antes de modelar en firme.',
    },
    {
      key: 'hybrid',
      name: 'Hybrid',
      description: 'Hard money conservador (menor LTV y puntos) más aporte propio reducido.',
      fin: {
        ...base,
        useHardMoney: true,
        ltvPurchasePct: Math.max(60, base.ltvPurchasePct - 15),
        rehabFinancedPct: 70,
        interestRatePct: Math.max(8, base.interestRatePct - 2),
        points: Math.max(0, base.points - 1),
      },
    },
  ];

  const options: StructureOption[] = variants.map((v) => {
    const financing = computeFinancing(v.fin);
    const deal = computeDeal({
      purchasePrice,
      closingCosts,
      rehab,
      arv,
      financing,
      holding,
      selling,
      cashReserve,
    });
    const capital = computeCapital(deal.cashRequired, cashAvailable);
    return {
      key: v.key,
      name: v.name,
      description: v.description,
      cashRequired: deal.cashRequired,
      loanAmount: financing.loanAmount,
      monthlyPayment: financing.monthlyInterest,
      financingCost: deal.financingCost,
      totalProjectCost: deal.totalProjectCost,
      profit: deal.grossProfit,
      roi: deal.roi,
      fitsCapital: capital.fits,
      recommended: false,
      caveat: v.caveat,
    };
  });

  // Recommend the structure with the lowest cash requirement that still fits capital
  // and keeps a positive profit.
  const viable = options.filter((o) => o.fitsCapital && o.profit > 0);
  const best = viable.sort((a, b) => a.cashRequired - b.cashRequired)[0];
  if (best) best.recommended = true;

  return options;
}
