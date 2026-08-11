import type { SellingInputs, SellingResult } from './types';

export const DEFAULT_SELLING: SellingInputs = {
  agentCommissionPct: 5,
  sellerClosingPct: 1.5,
  transferTaxPct: 0.1, // Alabama deed tax ~$1.00 per $1,000
  titleFlat: 900,
  attorneyFlat: 600,
  stagingFlat: 0,
  photographyFlat: 250,
  otherFlat: 0,
};

export function computeSelling(arv: number, input: SellingInputs): SellingResult {
  const rows = [
    { label: 'Agent commission', amount: Math.round(arv * (input.agentCommissionPct / 100)) },
    { label: 'Seller closing costs', amount: Math.round(arv * (input.sellerClosingPct / 100)) },
    { label: 'Transfer tax', amount: Math.round(arv * (input.transferTaxPct / 100)) },
    { label: 'Title', amount: input.titleFlat },
    { label: 'Attorney', amount: input.attorneyFlat },
    { label: 'Staging', amount: input.stagingFlat },
    { label: 'Photography', amount: input.photographyFlat },
    { label: 'Other', amount: input.otherFlat },
  ].filter((r) => r.amount > 0);

  return { total: rows.reduce((s, r) => s + r.amount, 0), breakdown: rows };
}
