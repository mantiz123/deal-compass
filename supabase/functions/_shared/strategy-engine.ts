// ============================================================
// KLOSE Strategy Engine v1
// Determinista. Sin AI. Decide el mejor vehículo financiero
// para un lead basado en property + lead data.
// ============================================================

export type StrategyCode =
  | 'cash'
  | 'sub_to'
  | 'wrap'
  | 'seller_finance'
  | 'hybrid'
  | 'novation'
  | 'pass';

export interface StrategyResult {
  code: StrategyCode;
  label: string;
  confidence: number;     // 0-100
  mao: number | null;     // MAO sugerido para esta estrategia
  reasons: string[];      // Por qué se eligió
  disqualifiers?: string[]; // (solo en alternativas/pass) por qué no
}

export interface StrategyEngineOutput {
  recommended: StrategyResult;
  alternatives: StrategyResult[]; // top 2-3 alternativas
  disqualified: { code: StrategyCode; reasons: string[] }[];
  calculated_at: string;
}

const STRATEGY_LABELS: Record<StrategyCode, string> = {
  cash: 'Cash Offer (Wholesale)',
  sub_to: 'Subject-To',
  wrap: 'Wrap-Around Mortgage',
  seller_finance: 'Seller Financing',
  hybrid: 'Hybrid (Sub-To + Seller Finance)',
  novation: 'Novation Agreement',
  pass: 'Pass / No Deal',
};

// Helper: clamp 0-100
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Helper: traditional cash MAO formula
// MAO = ARV * 0.70 - Repairs (the classic 70% rule)
function calcCashMAO(arv: number | null, repairs: number | null): number | null {
  if (!arv || arv <= 0) return null;
  const r = repairs && repairs > 0 ? repairs : 0;
  const mao = arv * 0.70 - r;
  return mao > 0 ? Math.round(mao) : null;
}

// Helper: Sub-To MAO ≈ Mortgage Balance + Equity Capture target + Arrears
// We approximate "what we'd pay seller" as a small "moving money" / equity slice
function calcSubToMAO(
  arv: number | null,
  mortgageBalance: number | null,
  repairs: number | null,
): number | null {
  if (!arv || !mortgageBalance || arv <= 0) return null;
  const equityToSeller = Math.max(0, (arv - mortgageBalance) * 0.10); // 10% of net equity to seller
  const r = repairs && repairs > 0 ? repairs : 0;
  // Total acquisition cost target: balance + small equity + repairs, capped at 80% ARV
  const cost = mortgageBalance + equityToSeller + r;
  const cap = arv * 0.80;
  return Math.round(Math.min(cost, cap));
}

// Helper: Seller Finance MAO ≈ purchase price we negotiate (close to listing or appraisal)
// Realistic target = 85-90% ARV with low/no down + seller carry
function calcSellerFinanceMAO(arv: number | null): number | null {
  if (!arv || arv <= 0) return null;
  return Math.round(arv * 0.85);
}

// ============================================================
// Main engine
// ============================================================
export function runStrategyEngine(property: any, lead: any): StrategyEngineOutput {
  const arv = property?.arv ? Number(property.arv) : null;
  const mortgageBalance = property?.mortgage_balance ? Number(property.mortgage_balance) : null;
  const equityPct = property?.equity_percent != null ? Number(property.equity_percent) : null;
  const repairs = property?.repair_cost ? Number(property.repair_cost) : null;
  const listingPrice = lead?.listing_price ? Number(lead.listing_price) : null;
  const taxDelinquent = !!property?.tax_delinquent;
  const isForeclosure = !!property?.is_foreclosure;
  const auctionDate = property?.auction_date ? new Date(property.auction_date) : null;
  const auctionDays = auctionDate
    ? Math.ceil((auctionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const liens = property?.active_liens_count != null ? Number(property.active_liens_count) : 0;
  const ownerType = (property?.owner_type || '').toLowerCase();
  const isVacant = !!property?.is_vacant;
  const dom = property?.days_on_market != null ? Number(property.days_on_market) : null;
  const mortgageAge = property?.mortgage_age_years != null ? Number(property.mortgage_age_years) : null;

  // Compute spread for cash deals
  let spreadPct: number | null = null;
  if (listingPrice && arv && arv > 0) {
    spreadPct = ((arv - listingPrice) / arv) * 100;
  }

  const candidates: StrategyResult[] = [];
  const disqualified: { code: StrategyCode; reasons: string[] }[] = [];

  // ----------------------------------------------------------
  // 1) CASH OFFER (Wholesale)
  // ----------------------------------------------------------
  {
    const reasons: string[] = [];
    const dq: string[] = [];
    let conf = 30;

    if (equityPct != null && equityPct >= 60) {
      conf += 25;
      reasons.push(`Alta equity (${Math.round(equityPct)}%) — viable wholesale`);
    } else if (equityPct != null && equityPct < 30) {
      dq.push(`Equity baja (${Math.round(equityPct)}%) — cash difícil`);
      conf -= 20;
    }

    if (spreadPct != null && spreadPct >= 25) {
      conf += 20;
      reasons.push(`Spread ${Math.round(spreadPct)}% sobre ARV`);
    } else if (spreadPct != null && spreadPct < 10) {
      dq.push('Listing cerca de ARV — sin margen para cash');
      conf -= 15;
    }

    if (isForeclosure || (auctionDays != null && auctionDays > 0 && auctionDays <= 60)) {
      conf += 15;
      reasons.push('Urgencia (foreclosure/auction) — favorece cash rápido');
    }
    if (taxDelinquent) {
      conf += 5;
      reasons.push('Tax delinquent — necesita liquidez');
    }
    if (liens > 2) {
      conf -= 10;
      dq.push(`${liens} liens activos — complica wholesale`);
    }

    const mao = calcCashMAO(arv, repairs);
    if (!mao) dq.push('Falta ARV — no se puede calcular MAO');

    const result: StrategyResult = {
      code: 'cash',
      label: STRATEGY_LABELS.cash,
      confidence: clamp(conf),
      mao,
      reasons,
      ...(dq.length ? { disqualifiers: dq } : {}),
    };

    if (mao && conf >= 40 && (equityPct == null || equityPct >= 30)) candidates.push(result);
    else disqualified.push({ code: 'cash', reasons: dq.length ? dq : ['Confianza baja'] });
  }

  // ----------------------------------------------------------
  // 2) SUBJECT-TO
  // ----------------------------------------------------------
  {
    const reasons: string[] = [];
    const dq: string[] = [];
    let conf = 25;

    if (mortgageBalance && mortgageBalance > 0 && arv && arv > 0) {
      conf += 15;
      reasons.push('Hipoteca existente asumible');
    } else {
      dq.push('Sin hipoteca activa — Sub-To no aplica');
    }

    if (equityPct != null) {
      if (equityPct >= 20 && equityPct <= 60) {
        conf += 25;
        reasons.push(`Equity moderada (${Math.round(equityPct)}%) — ideal para Sub-To`);
      } else if (equityPct < 20) {
        conf += 15;
        reasons.push('Equity baja — vendedor abierto a soluciones creativas');
      } else if (equityPct > 80) {
        conf -= 15;
        dq.push('Equity muy alta — vendedor preferirá cash');
      }
    }

    if (mortgageAge != null && mortgageAge >= 3) {
      conf += 10;
      reasons.push(`Hipoteca de ${mortgageAge}+ años — payment schedule estable`);
    }

    if (isForeclosure) {
      conf += 20;
      reasons.push('Foreclosure activa — Sub-To salva crédito del seller');
    }
    if (taxDelinquent) {
      conf += 5;
      reasons.push('Tax delinquent — Sub-To resuelve pagos');
    }

    if (liens > 1) {
      conf -= 8;
      dq.push(`${liens} liens — riesgo de title issues`);
    }

    if (auctionDays != null && auctionDays > 0 && auctionDays <= 14) {
      conf -= 10;
      dq.push(`Auction en ${auctionDays}d — tiempo insuficiente para Sub-To`);
    }

    const mao = calcSubToMAO(arv, mortgageBalance, repairs);
    if (!mao) dq.push('Falta ARV o mortgage balance');

    const result: StrategyResult = {
      code: 'sub_to',
      label: STRATEGY_LABELS.sub_to,
      confidence: clamp(conf),
      mao,
      reasons,
      ...(dq.length ? { disqualifiers: dq } : {}),
    };

    if (mao && conf >= 40 && mortgageBalance && mortgageBalance > 0) candidates.push(result);
    else disqualified.push({ code: 'sub_to', reasons: dq.length ? dq : ['Confianza baja'] });
  }

  // ----------------------------------------------------------
  // 3) SELLER FINANCE
  // ----------------------------------------------------------
  {
    const reasons: string[] = [];
    const dq: string[] = [];
    let conf = 20;

    if (equityPct != null && equityPct >= 80) {
      conf += 30;
      reasons.push(`Equity alta (${Math.round(equityPct)}%) — vendedor puede cargar nota`);
    } else if (equityPct != null && equityPct < 50) {
      dq.push(`Equity baja (${Math.round(equityPct)}%) — sin colchón para seller carry`);
      conf -= 15;
    }

    if (!mortgageBalance || mortgageBalance === 0) {
      conf += 25;
      reasons.push('Free & clear — ideal para seller finance');
    }

    if (ownerType === 'individual' && property?.owner_tenure_years && property.owner_tenure_years >= 10) {
      conf += 10;
      reasons.push('Owner long-term — orientado a ingreso pasivo');
    }

    if (dom != null && dom > 90) {
      conf += 10;
      reasons.push(`${dom} DOM — vendedor cansado, abierto a creative`);
    }

    if (isForeclosure || (auctionDays != null && auctionDays > 0 && auctionDays <= 60)) {
      conf -= 20;
      dq.push('Urgencia — seller necesita cash, no notas');
    }

    const mao = calcSellerFinanceMAO(arv);
    if (!mao) dq.push('Falta ARV');

    const result: StrategyResult = {
      code: 'seller_finance',
      label: STRATEGY_LABELS.seller_finance,
      confidence: clamp(conf),
      mao,
      reasons,
      ...(dq.length ? { disqualifiers: dq } : {}),
    };

    if (mao && conf >= 40) candidates.push(result);
    else disqualified.push({ code: 'seller_finance', reasons: dq.length ? dq : ['Confianza baja'] });
  }

  // ----------------------------------------------------------
  // 4) WRAP-AROUND
  // ----------------------------------------------------------
  {
    const reasons: string[] = [];
    const dq: string[] = [];
    let conf = 25;

    if (mortgageBalance && mortgageBalance > 0 && equityPct != null && equityPct >= 30 && equityPct <= 70) {
      conf += 30;
      reasons.push('Hipoteca + equity moderada — perfecto para wrap');
    } else {
      dq.push('Wrap requiere hipoteca activa + equity 30-70%');
    }

    if (dom != null && dom > 60) {
      conf += 10;
      reasons.push(`${dom} DOM — vendedor flexible`);
    }

    if (isForeclosure) {
      conf -= 15;
      dq.push('Foreclosure — Sub-To es mejor que Wrap aquí');
    }

    const mao = arv ? Math.round(arv * 0.82) : null;
    if (!mao) dq.push('Falta ARV');

    const result: StrategyResult = {
      code: 'wrap',
      label: STRATEGY_LABELS.wrap,
      confidence: clamp(conf),
      mao,
      reasons,
      ...(dq.length ? { disqualifiers: dq } : {}),
    };

    if (mao && conf >= 45 && mortgageBalance && mortgageBalance > 0) candidates.push(result);
    else disqualified.push({ code: 'wrap', reasons: dq.length ? dq : ['Confianza baja'] });
  }

  // ----------------------------------------------------------
  // 5) NOVATION (rare — when listed on MLS with realtor)
  // ----------------------------------------------------------
  {
    const reasons: string[] = [];
    const dq: string[] = [];
    let conf = 20;

    if (listingPrice && spreadPct != null && spreadPct >= 15 && spreadPct <= 35) {
      conf += 30;
      reasons.push(`Listed on MLS con ${Math.round(spreadPct)}% spread — novation viable`);
    } else {
      dq.push('Novation requiere listing MLS con spread 15-35%');
    }

    if (property?.mls_agent_name) {
      conf += 15;
      reasons.push('Agente MLS identificado');
    }

    if (repairs && arv && (repairs / arv) > 0.15) {
      conf -= 15;
      dq.push('Repairs > 15% ARV — buyer retail no comprará');
    }

    const mao = listingPrice ? Math.round(listingPrice * 1.05) : null; // pagamos hasta 5% sobre listing
    if (!mao) dq.push('Falta listing price');

    const result: StrategyResult = {
      code: 'novation',
      label: STRATEGY_LABELS.novation,
      confidence: clamp(conf),
      mao,
      reasons,
      ...(dq.length ? { disqualifiers: dq } : {}),
    };

    if (mao && conf >= 50) candidates.push(result);
    else disqualified.push({ code: 'novation', reasons: dq.length ? dq : ['Confianza baja'] });
  }

  // ----------------------------------------------------------
  // 6) HYBRID (Sub-To + Seller Finance second)
  // ----------------------------------------------------------
  {
    const reasons: string[] = [];
    const dq: string[] = [];
    let conf = 20;

    if (mortgageBalance && mortgageBalance > 0 && equityPct != null && equityPct >= 40 && equityPct <= 70) {
      conf += 35;
      reasons.push(`Hipoteca + equity ${Math.round(equityPct)}% — hybrid maximiza acquisition`);
    } else {
      dq.push('Hybrid requiere hipoteca + equity 40-70%');
    }

    if (!isForeclosure && (auctionDays == null || auctionDays > 60)) {
      conf += 10;
      reasons.push('Sin urgencia extrema — tiempo para estructurar');
    }

    const mao = arv && mortgageBalance
      ? Math.round(Math.min(arv * 0.85, mortgageBalance + (arv - mortgageBalance) * 0.30))
      : null;
    if (!mao) dq.push('Falta ARV o mortgage balance');

    const result: StrategyResult = {
      code: 'hybrid',
      label: STRATEGY_LABELS.hybrid,
      confidence: clamp(conf),
      mao,
      reasons,
      ...(dq.length ? { disqualifiers: dq } : {}),
    };

    if (mao && conf >= 50 && mortgageBalance && mortgageBalance > 0) candidates.push(result);
    else disqualified.push({ code: 'hybrid', reasons: dq.length ? dq : ['Confianza baja'] });
  }

  // ----------------------------------------------------------
  // Pick winner
  // ----------------------------------------------------------
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    const passReasons: string[] = [];
    if (!arv) passReasons.push('Falta ARV');
    if (equityPct != null && equityPct < 20 && (!mortgageBalance || mortgageBalance === 0)) {
      passReasons.push('Equity insuficiente y sin hipoteca asumible');
    }
    if (liens > 3) passReasons.push(`${liens} liens — title muy complicado`);
    if (passReasons.length === 0) passReasons.push('Ninguna estrategia alcanzó confianza mínima');

    return {
      recommended: {
        code: 'pass',
        label: STRATEGY_LABELS.pass,
        confidence: 100,
        mao: null,
        reasons: passReasons,
      },
      alternatives: [],
      disqualified,
      calculated_at: new Date().toISOString(),
    };
  }

  return {
    recommended: candidates[0],
    alternatives: candidates.slice(1, 4),
    disqualified,
    calculated_at: new Date().toISOString(),
  };
}
