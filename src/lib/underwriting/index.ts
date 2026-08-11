import { computeArv, type ArvResult } from './comps';
import { buildRehabItems, suggestRehabLevel } from './rehab';
import { computeFinancing, DEFAULT_FINANCING } from './financing';
import { computeHolding, defaultHolding } from './holding';
import { computeSelling, DEFAULT_SELLING } from './selling';
import { computeClosingCosts, computeDeal } from './deal';
import { computeCapital, DEFAULT_CASH_AVAILABLE, type CapitalResult } from './capital';
import { computeMao, type MaoResult } from './mao';
import { computeLiquidity, type LiquidityResult } from './liquidity';
import { computeInvestmentScore, type InvestmentScoreResult } from './score';
import { detectRedFlags, type RedFlag } from './redflags';
import { computeStructures, type StructureOption } from './structures';
import type {
  Comp,
  DealResult,
  FinancingInputs,
  FinancingResult,
  HoldingInputs,
  HoldingResult,
  RehabLevel,
  RehabLineItem,
  RehabResult,
  SellingInputs,
  SellingResult,
  SubjectProperty,
} from './types';

export * from './types';
export * from './comps';
export * from './rehab';
export * from './financing';
export * from './holding';
export * from './selling';
export * from './deal';
export * from './capital';
export * from './mao';
export * from './liquidity';
export * from './score';
export * from './redflags';
export * from './structures';

export type ArvMode = 'conservative' | 'base' | 'optimistic' | 'manual';

export interface UnderwritingConfig {
  purchasePrice: number;
  arvMode: ArvMode;
  manualArv: number;
  rehabLevel: RehabLevel;
  rehabMode: 'low' | 'base' | 'high';
  rehabOverrides: Record<string, Partial<Pick<RehabLineItem, 'low' | 'base' | 'high' | 'included'>>>;
  rehabContingencyPct: number;
  buyerClosingPct: number;
  buyerClosingFlat: number;
  financing: FinancingInputs;
  holding: HoldingInputs;
  selling: SellingInputs;
  cashAvailable: number;
  cashReserve: number;
  desiredProfit: number;
  riskBufferPct: number;
  publicVsListing?: { field: string; publicValue: string; listingValue: string }[];
}

export interface UnderwritingOutput {
  arv: ArvResult;
  arvUsed: number;
  rehab: RehabResult;
  rehabUsed: number;
  closingCosts: number;
  financing: FinancingResult;
  holding: HoldingResult;
  selling: SellingResult;
  deal: DealResult;
  capital: CapitalResult;
  mao: MaoResult;
  liquidity: LiquidityResult;
  score: InvestmentScoreResult;
  redFlags: RedFlag[];
  structures: StructureOption[];
}

export function defaultConfig(subject: SubjectProperty): UnderwritingConfig {
  const { level } = suggestRehabLevel(subject);
  return {
    purchasePrice: subject.list_price ?? 0,
    arvMode: 'base',
    manualArv: 0,
    rehabLevel: level,
    rehabMode: 'base',
    rehabOverrides: {},
    rehabContingencyPct: 10,
    buyerClosingPct: 2,
    buyerClosingFlat: 1200,
    financing: { ...DEFAULT_FINANCING },
    holding: defaultHolding(subject, 6),
    selling: { ...DEFAULT_SELLING },
    cashAvailable: DEFAULT_CASH_AVAILABLE,
    cashReserve: 2500,
    desiredProfit: 25000,
    riskBufferPct: 5,
  };
}

export function runUnderwriting(
  subject: SubjectProperty,
  comps: Comp[],
  config: UnderwritingConfig
): UnderwritingOutput {
  const arv = computeArv(comps, subject);
  const arvUsed =
    config.arvMode === 'manual'
      ? config.manualArv
      : config.arvMode === 'conservative'
        ? arv.conservative
        : config.arvMode === 'optimistic'
          ? arv.optimistic
          : arv.base;

  const rehab = buildRehabItems(
    subject,
    config.rehabLevel,
    config.rehabOverrides,
    config.rehabContingencyPct
  );
  const rehabUsed = rehab[config.rehabMode];

  const closingCosts = computeClosingCosts({
    purchasePrice: config.purchasePrice,
    buyerClosingPct: config.buyerClosingPct,
    buyerClosingFlat: config.buyerClosingFlat,
  });

  const financing = computeFinancing({
    ...config.financing,
    purchasePrice: config.purchasePrice,
    rehabBudget: rehabUsed,
    arv: arvUsed,
  });

  const holding = computeHolding(config.holding);
  const selling = computeSelling(arvUsed, config.selling);

  const deal = computeDeal({
    purchasePrice: config.purchasePrice,
    closingCosts,
    rehab: rehabUsed,
    arv: arvUsed,
    financing,
    holding,
    selling,
    cashReserve: config.cashReserve,
  });

  const capital = computeCapital(deal.cashRequired, config.cashAvailable);

  const mao = computeMao({
    arv: arvUsed,
    rehab: rehabUsed,
    desiredProfit: config.desiredProfit,
    riskBufferPct: config.riskBufferPct,
    buyerClosingPct: config.buyerClosingPct,
    buyerClosingFlat: config.buyerClosingFlat,
    financing: config.financing,
    holding: config.holding,
    selling: config.selling,
  });

  const liquidity = computeLiquidity(comps, arvUsed);

  const score = computeInvestmentScore({
    subject,
    arv,
    arvUsed,
    rehab,
    deal,
    capital,
    liquidity,
    financingLoanAmount: financing.loanAmount,
    compsCount: comps.length,
  });

  const redFlags = detectRedFlags({
    subject,
    comps,
    arv,
    arvUsed,
    rehab,
    deal,
    capital,
    liquidity,
    publicVsListing: config.publicVsListing,
  });

  const structures = computeStructures({
    purchasePrice: config.purchasePrice,
    rehab: rehabUsed,
    arv: arvUsed,
    buyerClosingPct: config.buyerClosingPct,
    buyerClosingFlat: config.buyerClosingFlat,
    financing: config.financing,
    holding: config.holding,
    selling: config.selling,
    cashAvailable: config.cashAvailable,
    cashReserve: config.cashReserve,
  });

  return {
    arv,
    arvUsed,
    rehab,
    rehabUsed,
    closingCosts,
    financing,
    holding,
    selling,
    deal,
    capital,
    mao,
    liquidity,
    score,
    redFlags,
    structures,
  };
}
