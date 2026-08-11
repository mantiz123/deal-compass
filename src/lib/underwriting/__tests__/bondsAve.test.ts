import { describe, it, expect } from 'vitest';
import { runUnderwriting, defaultConfig, type Comp, type SubjectProperty } from '../index';

// Real data from the RPR report for 3306 Bonds Ave, Birmingham AL 35224 (8/7/2026)
const subject: SubjectProperty = {
  address: '3306 Bonds Ave',
  city: 'Birmingham',
  zip_code: '35224',
  county: 'Jefferson County',
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1040,
  lot_size_acres: 0.42,
  year_built: 1971,
  list_price: 29000,
  annual_taxes: 999,
  assessed_value: 99700,
  rvm_value: 138120,
  rvm_range_low: 122900,
  rvm_range_high: 153300,
  cma_recommended_offer: 101000,
  property_type: 'Single Family',
  zoning: 'R2',
  heating: 'No Heat',
  cooling: 'No Air',
  foundation: 'Crawl Space',
  listing_description: 'Investor special, sold as-is.',
};

const comps: Comp[] = [
  {
    id: '1',
    address: 'Comp A',
    price: 75000,
    status: 'closed',
    closed_date: '2026-04-10',
    distance_miles: 0.58,
    similarity_score: 87,
    bedrooms: 3,
    bathrooms: 1,
    sqft: 1000,
    year_built: 1968,
    included: true,
  },
  {
    id: '2',
    address: 'Comp B',
    price: 107000,
    status: 'closed',
    closed_date: '2026-05-02',
    distance_miles: 0.64,
    similarity_score: 86,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1120,
    year_built: 1970,
    included: true,
  },
  {
    id: '3',
    address: 'Comp C',
    price: 108100,
    status: 'closed',
    closed_date: '2026-03-20',
    distance_miles: 0.69,
    similarity_score: 86,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1100,
    year_built: 1972,
    included: true,
  },
  {
    id: '4',
    address: '3113 Monroe Ave',
    price: 106500,
    status: 'closed',
    closed_date: '2026-05-22',
    distance_miles: 0.5,
    similarity_score: 84,
    bedrooms: 3,
    bathrooms: 1,
    sqft: 1152,
    year_built: 1951,
    days_on_market: 5,
    included: true,
  },
];

describe('3306 Bonds Ave underwriting', () => {
  const config = defaultConfig(subject);
  const out = runUnderwriting(subject, comps, config);

  it('derives a weighted ARV inside the comp range', () => {
    expect(out.arv.used.length).toBe(4);
    expect(out.arv.base).toBeGreaterThan(80000);
    expect(out.arv.base).toBeLessThan(115000);
    expect(out.arv.conservative).toBeLessThan(out.arv.base);
    expect(out.arv.optimistic).toBeGreaterThan(out.arv.base);
  });

  it('suggests a full rehab given No Heat / No Air / as-is', () => {
    expect(out.rehab.level).toBe('full');
    expect(out.rehab.base).toBeGreaterThan(40000);
  });

  it('caps the hard money loan by one of the three lender caps', () => {
    expect(out.financing.loanAmount).toBeGreaterThan(0);
    expect(out.financing.loanCapReason).toMatch(/LTV|LTC|ARV/);
  });

  it('produces a coherent total project cost and profit', () => {
    const d = out.deal;
    const sum =
      d.purchasePrice + d.closingCosts + d.rehab + d.financingCost + d.holdingCost + d.sellingCost;
    expect(d.totalProjectCost).toBe(Math.round(sum));
    expect(d.grossProfit).toBe(Math.round(d.arv - d.totalProjectCost));
  });

  it('answers the $30K capital question', () => {
    expect(out.capital.cashAvailable).toBe(30000);
    expect(typeof out.capital.fits).toBe('boolean');
    expect(out.capital.cashRequired).toBeGreaterThan(0);
  });

  it('computes a MAO below the ARV and flags a decision', () => {
    expect(out.mao.maxPurchasePrice).toBeLessThan(out.arvUsed);
    expect(out.mao.lowOffer).toBeLessThanOrEqual(out.mao.targetOffer);
    expect(out.mao.targetOffer).toBeLessThanOrEqual(out.mao.doNotExceed);
    expect(['buy', 'negotiate', 'pass']).toContain(out.score.decision);
  });

  it('detects the HVAC and old-property red flags', () => {
    const keys = out.redFlags.map((f) => f.key);
    expect(keys).toContain('hvac_missing');
    expect(keys).toContain('old_property');
  });

  it('compares six deal structures and recommends one', () => {
    expect(out.structures.length).toBe(6);
    const rec = out.structures.filter((s) => s.recommended);
    expect(rec.length).toBeLessThanOrEqual(1);
  });
});
