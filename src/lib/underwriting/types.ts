// Core types for the Fix & Flip underwriting engine.
// Every number here is deterministic — the AI never computes these.

export type FieldSource = 'PDF' | 'USER_INPUT' | 'EXTERNAL_DATA' | 'AI_ESTIMATE';
export type FieldKind = 'FACT' | 'ESTIMATE' | 'ASSUMPTION' | 'USER_INPUT';

export interface TrackedField<T = string | number | boolean | null> {
  value: T | null;
  source: FieldSource | null;
  kind: FieldKind | null;
  confidence?: number | null;
  note?: string | null;
}

export type CompStatus = 'closed' | 'pending' | 'active' | 'unknown';

export interface Comp {
  id: string;
  address: string;
  price: number | null;
  status: CompStatus;
  closed_date?: string | null;
  distance_miles?: number | null;
  similarity_score?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  lot_size_acres?: number | null;
  year_built?: number | null;
  days_on_market?: number | null;
  included: boolean;
  exclusion_reason?: string | null;
}

export interface SubjectProperty {
  address: string;
  city?: string | null;
  zip_code?: string | null;
  county?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  lot_size_acres?: number | null;
  year_built?: number | null;
  list_price?: number | null;
  annual_taxes?: number | null;
  assessed_value?: number | null;
  rvm_value?: number | null;
  rvm_range_low?: number | null;
  rvm_range_high?: number | null;
  cma_recommended_offer?: number | null;
  listing_description?: string | null;
  property_type?: string | null;
  zoning?: string | null;
  heating?: string | null;
  cooling?: string | null;
  foundation?: string | null;
  roof?: string | null;
  basement?: string | null;
}

export type RehabLevel = 'light' | 'medium' | 'full';

export interface RehabLineItem {
  key: string;
  label: string;
  low: number;
  base: number;
  high: number;
  included: boolean;
  source: FieldSource;
}

export interface RehabResult {
  items: RehabLineItem[];
  low: number;
  base: number;
  high: number;
  level: RehabLevel;
  disclaimer: string;
}

export interface FinancingInputs {
  useHardMoney: boolean;
  purchasePrice: number;
  rehabBudget: number;
  arv: number;
  ltvPurchasePct: number; // % of purchase price lent
  ltcPct: number; // max % of total cost (purchase + rehab)
  arvLtvPct: number; // max % of ARV
  rehabFinancedPct: number; // % of rehab budget the lender funds via draws
  interestRatePct: number;
  points: number; // % of loan
  originationPct: number; // % of loan
  lenderFlatFees: number;
  termMonths: number;
  interestOnly: boolean;
  drawUtilizationPct: number; // avg outstanding rehab balance during rehab
  privateMoneyAmount: number;
  privateMoneyRatePct: number;
}

export interface FinancingResult {
  loanAmount: number;
  loanCapReason: string;
  downPayment: number;
  unfinancedRehab: number;
  pointsCost: number;
  originationCost: number;
  lenderFlatFees: number;
  monthlyInterest: number;
  totalInterest: number;
  privateMoneyInterest: number;
  totalFinancingCost: number;
  balloonAtSale: number;
  upfrontLenderCash: number;
}

export interface HoldingInputs {
  months: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyUtilities: number;
  monthlyHoa: number;
  monthlyMaintenance: number;
  monthlySecurity: number;
  monthlyLawn: number;
  monthlyOther: number;
}

export interface HoldingResult {
  months: number;
  monthlyTotal: number;
  total: number;
  breakdown: { label: string; monthly: number; total: number }[];
}

export interface SellingInputs {
  agentCommissionPct: number;
  sellerClosingPct: number;
  transferTaxPct: number;
  titleFlat: number;
  attorneyFlat: number;
  stagingFlat: number;
  photographyFlat: number;
  otherFlat: number;
}

export interface SellingResult {
  total: number;
  breakdown: { label: string; amount: number }[];
}

export interface AcquisitionInputs {
  purchasePrice: number;
  buyerClosingPct: number;
  buyerClosingFlat: number;
}

export interface DealResult {
  purchasePrice: number;
  closingCosts: number;
  rehab: number;
  financingCost: number;
  holdingCost: number;
  sellingCost: number;
  totalProjectCost: number;
  arv: number;
  grossProfit: number;
  roi: number;
  cashOnCash: number;
  profitMarginPct: number;
  annualizedRoi: number;
  cashRequired: number;
}
