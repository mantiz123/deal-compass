import type { ArvResult } from './comps';
import type { CapitalResult } from './capital';
import type { LiquidityResult } from './liquidity';
import type { Comp, DealResult, RehabResult, SubjectProperty } from './types';

export interface RedFlag {
  key: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
}

export function detectRedFlags(params: {
  subject: SubjectProperty;
  comps: Comp[];
  arv: ArvResult;
  arvUsed: number;
  rehab: RehabResult;
  deal: DealResult;
  capital: CapitalResult;
  liquidity: LiquidityResult;
  publicVsListing?: { field: string; publicValue: string; listingValue: string }[];
}): RedFlag[] {
  const { subject, comps, arv, arvUsed, rehab, deal, capital, liquidity, publicVsListing } = params;
  const flags: RedFlag[] = [];
  const text = (subject.listing_description || '').toLowerCase();

  if (/foundation|structural|settling|cracked slab/.test(text) || /wood/.test((subject.foundation || '').toLowerCase())) {
    flags.push({
      key: 'foundation',
      severity: 'high',
      title: 'Posible problema de cimentación',
      detail: `Foundation reportada: ${subject.foundation || 'no especificada'}. Requiere inspección estructural antes de ofertar.`,
    });
  }

  if (/no heat/.test(`${subject.heating || ''} ${text}`) || /no air/.test(`${subject.cooling || ''} ${text}`)) {
    flags.push({
      key: 'hvac_missing',
      severity: 'high',
      title: 'HVAC ausente o inoperante',
      detail: 'El listing indica sin calefacción y/o sin aire. Presupuestar sistema completo.',
    });
  }

  if (subject.year_built && subject.year_built < 1978) {
    flags.push({
      key: 'old_property',
      severity: 'medium',
      title: `Construcción de ${subject.year_built}`,
      detail: 'Anterior a 1978: riesgo de pintura con plomo y asbesto, más plomería/eléctrico obsoleto.',
    });
  }

  if (arvUsed > 0 && rehab.base / arvUsed > 0.35) {
    flags.push({
      key: 'high_rehab',
      severity: 'high',
      title: 'Rehab desproporcionado',
      detail: `El rehab estimado ($${rehab.base.toLocaleString()}) supera el 35% del ARV.`,
    });
  }

  if (arv.used.length < 3) {
    flags.push({
      key: 'weak_comps',
      severity: 'critical',
      title: 'Comparables insuficientes',
      detail: `Sólo ${arv.used.length} comparables utilizables. El ARV no es confiable.`,
    });
  }

  const closed = comps.filter((c) => c.status === 'closed').length;
  if (closed < 2) {
    flags.push({
      key: 'few_closed_sales',
      severity: 'high',
      title: 'Pocas ventas cerradas',
      detail: 'Menos de 2 ventas cerradas recientes en el área — la reventa puede ser lenta.',
    });
  }

  if (liquidity.score < 50) {
    flags.push({
      key: 'low_liquidity',
      severity: 'high',
      title: `Liquidez de reventa ${liquidity.label}`,
      detail: 'Barrio con poca absorción: barato no significa vendible.',
    });
  }

  if (subject.rvm_value && arvUsed > subject.rvm_value * 1.25) {
    flags.push({
      key: 'unrealistic_arv',
      severity: 'high',
      title: 'ARV posiblemente irreal',
      detail: `El ARV modelado ($${arvUsed.toLocaleString()}) supera en más de 25% el RVM del reporte ($${subject.rvm_value.toLocaleString()}).`,
    });
  }

  if (!capital.fits) {
    flags.push({
      key: 'insufficient_capital',
      severity: 'critical',
      title: 'Capital insuficiente',
      detail: `Faltan $${capital.shortfall.toLocaleString()} respecto al capital disponible.`,
    });
  }

  if (deal.grossProfit <= 0) {
    flags.push({
      key: 'no_profit',
      severity: 'critical',
      title: 'Sin ganancia proyectada',
      detail: `El costo total del proyecto ($${deal.totalProjectCost.toLocaleString()}) iguala o supera el ARV.`,
    });
  }

  for (const d of publicVsListing || []) {
    flags.push({
      key: `discrepancy_${d.field}`,
      severity: 'medium',
      title: `Discrepancia en ${d.field}`,
      detail: `Public records: "${d.publicValue}" vs listing: "${d.listingValue}". Verificar cuál es correcto.`,
    });
  }

  if (subject.zoning && !/^r/i.test(subject.zoning)) {
    flags.push({
      key: 'zoning',
      severity: 'medium',
      title: `Zonificación ${subject.zoning}`,
      detail: 'No parece zonificación residencial estándar — confirmar uso permitido.',
    });
  }

  const order = { critical: 0, high: 1, medium: 2 } as const;
  return flags.sort((a, b) => order[a.severity] - order[b.severity]);
}
