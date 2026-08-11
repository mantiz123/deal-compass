import type { RehabLevel, RehabLineItem, RehabResult, SubjectProperty } from './types';

export const REHAB_DISCLAIMER =
  'Preliminary estimate — contractor inspection required. No es un presupuesto definitivo.';

interface ItemSpec {
  key: string;
  label: string;
  /** cost per sqft (used when perSqft = true) or flat cost */
  low: number;
  base: number;
  high: number;
  perSqft?: boolean;
}

/** Alabama / Birmingham market ballpark ranges for a medium rehab. */
const ITEM_SPECS: ItemSpec[] = [
  { key: 'roof', label: 'Roof', low: 5500, base: 8500, high: 13000 },
  { key: 'hvac', label: 'HVAC', low: 5000, base: 7500, high: 11000 },
  { key: 'plumbing', label: 'Plumbing', low: 2500, base: 5000, high: 9000 },
  { key: 'electrical', label: 'Electrical', low: 2500, base: 5000, high: 9500 },
  { key: 'kitchen', label: 'Kitchen', low: 6000, base: 10000, high: 16000 },
  { key: 'bathrooms', label: 'Bathrooms', low: 3500, base: 6000, high: 10000 },
  { key: 'flooring', label: 'Flooring', low: 3.5, base: 5, high: 8, perSqft: true },
  { key: 'paint', label: 'Paint', low: 2, base: 3, high: 4.5, perSqft: true },
  { key: 'windows', label: 'Windows', low: 2500, base: 4500, high: 8000 },
  { key: 'doors', label: 'Doors', low: 900, base: 1800, high: 3200 },
  { key: 'exterior', label: 'Exterior', low: 2000, base: 4500, high: 9000 },
  { key: 'foundation', label: 'Foundation', low: 0, base: 3500, high: 15000 },
  { key: 'landscaping', label: 'Landscaping', low: 800, base: 1800, high: 3500 },
  { key: 'appliances', label: 'Appliances', low: 1800, base: 2800, high: 4500 },
  { key: 'permits', label: 'Permits', low: 500, base: 1200, high: 2500 },
  { key: 'cleanup', label: 'Dumpster / Cleanup', low: 800, base: 1500, high: 3000 },
  { key: 'other', label: 'Other', low: 0, base: 0, high: 0 },
];

const LEVEL_SCOPE: Record<RehabLevel, string[]> = {
  light: ['paint', 'flooring', 'landscaping', 'cleanup', 'appliances', 'doors'],
  medium: [
    'hvac',
    'kitchen',
    'bathrooms',
    'flooring',
    'paint',
    'doors',
    'exterior',
    'landscaping',
    'appliances',
    'permits',
    'cleanup',
  ],
  full: ITEM_SPECS.filter((i) => i.key !== 'other').map((i) => i.key),
};

const LEVEL_FACTOR: Record<RehabLevel, number> = { light: 0.75, medium: 1, full: 1.15 };

export function buildRehabItems(
  subject: SubjectProperty,
  level: RehabLevel,
  overrides: Record<string, Partial<Pick<RehabLineItem, 'low' | 'base' | 'high' | 'included'>>> = {},
  contingencyPct = 10
): RehabResult {
  const sqft = subject.sqft && subject.sqft > 0 ? subject.sqft : 1000;
  const factor = LEVEL_FACTOR[level];
  const scope = new Set(LEVEL_SCOPE[level]);

  const items: RehabLineItem[] = ITEM_SPECS.map((spec) => {
    const mult = spec.perSqft ? sqft : 1;
    const ov = overrides[spec.key] || {};
    return {
      key: spec.key,
      label: spec.label,
      low: Math.round(ov.low ?? spec.low * mult * factor),
      base: Math.round(ov.base ?? spec.base * mult * factor),
      high: Math.round(ov.high ?? spec.high * mult * factor),
      included: ov.included ?? scope.has(spec.key),
      source: ov.low !== undefined || ov.base !== undefined ? 'USER_INPUT' : 'AI_ESTIMATE',
    };
  });

  const sum = (k: 'low' | 'base' | 'high') =>
    items.filter((i) => i.included).reduce((s, i) => s + i[k], 0);

  const c = 1 + contingencyPct / 100;
  return {
    items,
    low: Math.round(sum('low') * c),
    base: Math.round(sum('base') * c),
    high: Math.round(sum('high') * c),
    level,
    disclaimer: REHAB_DISCLAIMER,
  };
}

/** Heuristic scope suggestion from the listing / public record data. */
export function suggestRehabLevel(subject: SubjectProperty): {
  level: RehabLevel;
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;
  const text = `${subject.listing_description || ''} ${subject.heating || ''} ${subject.cooling || ''}`.toLowerCase();

  if (/no heat/.test(text)) {
    score += 2;
    signals.push('Listing indica "No Heat" — sistema de calefacción probablemente ausente');
  }
  if (/no air/.test(text)) {
    score += 2;
    signals.push('Listing indica "No Air" — aire acondicionado probablemente ausente');
  }
  if (/as[- ]is|handyman|investor|tlc|fixer|gut/.test(text)) {
    score += 2;
    signals.push('Lenguaje de listado sugiere venta as-is / rehab importante');
  }
  if (subject.year_built && subject.year_built < 1975) {
    score += 1;
    signals.push(`Construcción de ${subject.year_built} — posible plomería/eléctrico obsoleto`);
  }
  if (/crawl|wood/.test((subject.foundation || '').toLowerCase())) {
    score += 1;
    signals.push('Cimentación crawl space / madera — requiere inspección estructural');
  }

  const level: RehabLevel = score >= 4 ? 'full' : score >= 2 ? 'medium' : 'light';
  return { level, signals };
}
