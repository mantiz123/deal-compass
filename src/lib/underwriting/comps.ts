import type { Comp, SubjectProperty } from './types';

export interface WeightedComp {
  comp: Comp;
  adjustedValue: number;
  weight: number;
  weightBreakdown: {
    status: number;
    distance: number;
    similarity: number;
    recency: number;
    size: number;
  };
  reasons: string[];
}

export interface ArvResult {
  conservative: number;
  base: number;
  optimistic: number;
  used: WeightedComp[];
  discarded: { comp: Comp; reason: string }[];
  pricePerSqft: number | null;
  confidence: 'high' | 'medium' | 'low';
  method: string;
}

const STATUS_WEIGHT: Record<string, number> = {
  closed: 1,
  pending: 0.7,
  active: 0.45,
  unknown: 0.3,
};

function monthsSince(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function weightedPercentile(pairs: { value: number; weight: number }[], p: number): number {
  const sorted = [...pairs].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return sorted.length ? sorted[0].value : 0;
  let acc = 0;
  for (const item of sorted) {
    acc += item.weight;
    if (acc / total >= p) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Weighted ARV. Closed sales dominate; distance, similarity and recency decay the weight.
 * Each comp is adjusted to the subject's square footage using its own $/sqft, then blended
 * 60/40 with its raw sale price so tiny-sqft comps can't explode the estimate.
 */
export function computeArv(comps: Comp[], subject: SubjectProperty): ArvResult {
  const discarded: { comp: Comp; reason: string }[] = [];
  const used: WeightedComp[] = [];

  for (const comp of comps) {
    if (!comp.included) {
      discarded.push({ comp, reason: comp.exclusion_reason || 'Excluido manualmente' });
      continue;
    }
    if (!comp.price || comp.price <= 0) {
      discarded.push({ comp, reason: 'Sin precio disponible' });
      continue;
    }
    const age = monthsSince(comp.closed_date);
    if (age !== null && age > 18) {
      discarded.push({ comp, reason: `Venta muy antigua (${Math.round(age)} meses)` });
      continue;
    }
    if (comp.distance_miles !== null && comp.distance_miles !== undefined && comp.distance_miles > 2) {
      discarded.push({ comp, reason: `Distancia excesiva (${comp.distance_miles} mi)` });
      continue;
    }

    const reasons: string[] = [];

    const wStatus = STATUS_WEIGHT[comp.status] ?? 0.3;
    reasons.push(
      comp.status === 'closed' ? 'Venta cerrada (máximo peso)' : `Estado ${comp.status} (peso reducido)`
    );

    const dist = comp.distance_miles ?? 1;
    const wDistance = 1 / (1 + dist * 0.8);
    if (dist <= 0.5) reasons.push('Muy cercano al sujeto');

    const sim = comp.similarity_score ?? 70;
    const wSimilarity = Math.max(0.2, Math.min(1, sim / 100));
    if (sim >= 85) reasons.push(`Similitud alta (${sim})`);

    const wRecency = age === null ? 0.7 : Math.max(0.35, 1 - age / 24);

    let wSize = 1;
    let adjustedValue = comp.price;
    if (comp.sqft && subject.sqft && comp.sqft > 0) {
      const ppsf = comp.price / comp.sqft;
      const sizeAdjusted = ppsf * subject.sqft;
      adjustedValue = sizeAdjusted * 0.6 + comp.price * 0.4;
      const ratio = comp.sqft / subject.sqft;
      wSize = ratio > 1.4 || ratio < 0.7 ? 0.6 : 1;
      if (wSize < 1) reasons.push('Diferencia de tamaño relevante');
    }

    const weight = wStatus * wDistance * wSimilarity * wRecency * wSize;
    used.push({
      comp,
      adjustedValue,
      weight,
      weightBreakdown: {
        status: wStatus,
        distance: wDistance,
        similarity: wSimilarity,
        recency: wRecency,
        size: wSize,
      },
      reasons,
    });
  }

  if (used.length === 0) {
    return {
      conservative: 0,
      base: 0,
      optimistic: 0,
      used,
      discarded,
      pricePerSqft: null,
      confidence: 'low',
      method: 'Sin comparables utilizables — ARV no calculable',
    };
  }

  const totalWeight = used.reduce((s, u) => s + u.weight, 0);
  const base = used.reduce((s, u) => s + u.adjustedValue * u.weight, 0) / totalWeight;

  const pairs = used.map((u) => ({ value: u.adjustedValue, weight: u.weight }));
  const p25 = weightedPercentile(pairs, 0.25);
  const p75 = weightedPercentile(pairs, 0.75);

  const conservative = Math.min(base * 0.92, p25);
  const optimistic = Math.max(base * 1.08, p75);

  const closedCount = used.filter((u) => u.comp.status === 'closed').length;
  const confidence: ArvResult['confidence'] =
    closedCount >= 3 && used.length >= 4 ? 'high' : closedCount >= 2 ? 'medium' : 'low';

  return {
    conservative: Math.round(conservative),
    base: Math.round(base),
    optimistic: Math.round(optimistic),
    used: used.sort((a, b) => b.weight - a.weight),
    discarded,
    pricePerSqft: subject.sqft ? Math.round(base / subject.sqft) : null,
    confidence,
    method:
      'Promedio ponderado por estado de venta, distancia, similitud, antigüedad y tamaño; cada comp ajustado a los sqft del sujeto.',
  };
}
