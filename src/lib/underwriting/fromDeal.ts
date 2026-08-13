import type { Comp, SubjectProperty } from './types';

type DealRow = {
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
  extracted_data?: unknown;
};

type CompRow = {
  id: string;
  address: string;
  price?: number | null;
  status: string;
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
};

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export function dealToSubject(deal: DealRow): SubjectProperty {
  const extra = (deal.extracted_data ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof extra[k] === 'string' ? (extra[k] as string) : null);
  return {
    address: deal.address,
    city: deal.city ?? null,
    zip_code: deal.zip_code ?? null,
    county: deal.county ?? null,
    bedrooms: num(deal.bedrooms),
    bathrooms: num(deal.bathrooms),
    sqft: num(deal.sqft),
    lot_size_acres: num(deal.lot_size_acres),
    year_built: num(deal.year_built),
    list_price: num(deal.list_price),
    annual_taxes: num(deal.annual_taxes),
    assessed_value: num(deal.assessed_value),
    rvm_value: num(deal.rvm_value),
    rvm_range_low: num(deal.rvm_range_low),
    rvm_range_high: num(deal.rvm_range_high),
    cma_recommended_offer: num(deal.cma_recommended_offer),
    listing_description: deal.listing_description ?? null,
    property_type: deal.property_type ?? null,
    zoning: deal.zoning ?? null,
    heating: str('heating'),
    cooling: str('cooling'),
    foundation: str('foundation'),
    roof: str('roof'),
    basement: str('basement'),
  };
}

export function rowToComp(row: CompRow): Comp {
  return {
    id: row.id,
    address: row.address,
    price: num(row.price),
    status: (['closed', 'pending', 'active'].includes(row.status)
      ? row.status
      : 'unknown') as Comp['status'],
    closed_date: row.closed_date ?? null,
    distance_miles: num(row.distance_miles),
    similarity_score: num(row.similarity_score),
    bedrooms: num(row.bedrooms),
    bathrooms: num(row.bathrooms),
    sqft: num(row.sqft),
    lot_size_acres: num(row.lot_size_acres),
    year_built: num(row.year_built),
    days_on_market: num(row.days_on_market),
    included: row.included,
    exclusion_reason: row.exclusion_reason ?? null,
  };
}

export function publicVsListingFromDeal(
  deal: DealRow
): { field: string; publicValue: string; listingValue: string }[] {
  const extra = (deal.extracted_data ?? {}) as Record<string, unknown>;
  const list = extra.publicVsListing;
  if (!Array.isArray(list)) return [];
  return list
    .filter((x): x is Record<string, string> => !!x && typeof x === 'object')
    .map((x) => ({
      field: String(x.field ?? ''),
      publicValue: String(x.publicValue ?? ''),
      listingValue: String(x.listingValue ?? ''),
    }));
}
