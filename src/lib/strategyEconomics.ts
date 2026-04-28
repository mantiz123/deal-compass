// ============================================================
// Strategy Economics — Frontend-only deal math
// Genera el desglose numérico que justifica cada estrategia
// para que el wholesaler entienda QUÉ ofrece y CUÁNTO gana.
// ============================================================

export type StrategyCode =
  | 'cash'
  | 'sub_to'
  | 'wrap'
  | 'seller_finance'
  | 'hybrid'
  | 'novation'
  | 'pass';

export interface EconomicsInputs {
  arv: number | null;
  mortgageBalance: number | null;
  repairs: number | null;
  equityPercent: number | null;
  listingPrice: number | null;
  /** Tasa hipoteca existente (anual %). Default 6 si no hay. */
  existingMortgageRate?: number | null;
  /** Años restantes de la hipoteca. Default 25. */
  mortgageYearsLeft?: number | null;
}

export interface EconomicsLine {
  label: string;
  value: string;
  hint?: string;
  emphasis?: 'positive' | 'negative' | 'neutral';
}

export interface StrategyEconomics {
  /** Lo que el wholesaler PAGA / asume en total */
  totalAcquisition: number | null;
  /** Lo que el SELLER recibe en cash al closing */
  sellerCashAtClose: number | null;
  /** Lo que el wholesaler GANA estimado (assignment fee o spread) */
  estimatedProfit: number | null;
  /** Líneas detalladas para la UI */
  lines: EconomicsLine[];
  /** Pitch corto numérico para usar en la llamada */
  pitchLine: string;
}

const fmt = (n: number | null | undefined): string => {
  if (n == null || !isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtPct = (n: number | null | undefined): string => {
  if (n == null || !isFinite(n)) return '—';
  return `${Math.round(n)}%`;
};

/** Pago mensual de hipoteca (capital + interés). */
function monthlyPayment(balance: number, ratePct: number, years: number): number {
  if (balance <= 0) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return balance / n;
  return (balance * r) / (1 - Math.pow(1 + r, -n));
}

/** Renta estimada (regla del 1% sobre ARV) */
function estimatedRent(arv: number): number {
  return Math.round(arv * 0.008); // 0.8% mensual conservador
}

export function computeStrategyEconomics(
  code: StrategyCode,
  mao: number | null,
  inp: EconomicsInputs,
): StrategyEconomics {
  const arv = inp.arv ?? 0;
  const mort = inp.mortgageBalance ?? 0;
  const repairs = inp.repairs ?? 0;
  const eqPct = inp.equityPercent ?? (arv > 0 && mort >= 0 ? ((arv - mort) / arv) * 100 : 0);
  const equityValue = Math.max(0, arv - mort);
  const rate = inp.existingMortgageRate ?? 6;
  const years = inp.mortgageYearsLeft ?? 25;

  switch (code) {
    // --------------------------------------------------------
    case 'cash': {
      const offer = mao ?? 0;
      // Wholesaler vende al cash buyer ~75-78% ARV → spread = assignment fee
      const cashBuyerExit = Math.round(arv * 0.75) - repairs;
      const profit = Math.max(0, cashBuyerExit - offer);
      return {
        totalAcquisition: offer,
        sellerCashAtClose: offer,
        estimatedProfit: profit,
        lines: [
          { label: 'Oferta al seller (MAO)', value: fmt(offer), hint: 'ARV × 70% − repairs', emphasis: 'neutral' },
          { label: 'Repairs estimados', value: fmt(repairs), emphasis: 'negative' },
          { label: 'Precio de venta a cash buyer', value: fmt(cashBuyerExit), hint: 'Buyer paga ~75% ARV − repairs' },
          { label: 'Assignment fee (tu profit)', value: fmt(profit), emphasis: 'positive' },
        ],
        pitchLine: `Te ofrezco ${fmt(offer)} en efectivo, cierre en 14 días, sin comisiones.`,
      };
    }

    // --------------------------------------------------------
    case 'sub_to': {
      const equityToSeller = Math.round(equityValue * 0.10);
      const totalToSeller = equityToSeller; // cash al close
      const monthly = Math.round(monthlyPayment(mort, rate, years));
      const rent = estimatedRent(arv);
      const cashflow = rent - monthly;
      // Profit estimado: assignment a inversionista creative ~$15-25k
      const creativeAssignment = Math.round(Math.min(25000, Math.max(10000, equityValue * 0.05)));
      return {
        totalAcquisition: mort + equityToSeller,
        sellerCashAtClose: totalToSeller,
        estimatedProfit: creativeAssignment,
        lines: [
          { label: 'Asumes hipoteca existente', value: fmt(mort), hint: `~${rate}% por ${years}y restantes` },
          { label: 'Cash al seller (moving money)', value: fmt(equityToSeller), hint: '~10% del equity', emphasis: 'neutral' },
          { label: 'Pago mensual P&I (lo cubre el inquilino)', value: fmt(monthly) },
          { label: 'Renta estimada', value: fmt(rent), hint: '~0.8% ARV/mes' },
          { label: 'Cashflow mensual neto', value: fmt(cashflow), emphasis: cashflow > 0 ? 'positive' : 'negative' },
          { label: 'Assignment a inversor creative', value: fmt(creativeAssignment), emphasis: 'positive' },
        ],
        pitchLine: `Tomamos los pagos de tu hipoteca (${fmt(monthly)}/mes), te damos ${fmt(equityToSeller)} en efectivo y salvamos tu crédito.`,
      };
    }

    // --------------------------------------------------------
    case 'wrap': {
      const purchasePrice = mao ?? Math.round(arv * 0.82);
      const downPayment = Math.round(purchasePrice * 0.05);
      const wrapBalance = purchasePrice - downPayment;
      const wrapRate = rate + 2; // wrap suele ser 2% sobre tasa subyacente
      const wrapMonthly = Math.round(monthlyPayment(wrapBalance, wrapRate, 30));
      const underlyingMonthly = Math.round(monthlyPayment(mort, rate, years));
      const monthlySpread = wrapMonthly - underlyingMonthly;
      const sellerEquity = Math.max(0, purchasePrice - mort);
      return {
        totalAcquisition: purchasePrice,
        sellerCashAtClose: downPayment,
        estimatedProfit: monthlySpread * 12 * 5, // 5 años de spread
        lines: [
          { label: 'Precio de compra (wrap)', value: fmt(purchasePrice), hint: '~82% ARV' },
          { label: 'Down payment al seller', value: fmt(downPayment), hint: '~5%' },
          { label: 'Equity del seller (carry)', value: fmt(sellerEquity - downPayment), hint: 'Pagos mensuales' },
          { label: `Pago wrap (${wrapRate}%)`, value: fmt(wrapMonthly) },
          { label: `Pago hipoteca subyacente (${rate}%)`, value: fmt(underlyingMonthly) },
          { label: 'Spread mensual a tu favor', value: fmt(monthlySpread), emphasis: monthlySpread > 0 ? 'positive' : 'negative' },
          { label: 'Profit acumulado (5 años)', value: fmt(monthlySpread * 60), emphasis: 'positive' },
        ],
        pitchLine: `Te compro en ${fmt(purchasePrice)}, ${fmt(downPayment)} al cerrar, y tú recibes ${fmt(wrapMonthly)}/mes durante el carry.`,
      };
    }

    // --------------------------------------------------------
    case 'seller_finance': {
      const purchasePrice = mao ?? Math.round(arv * 0.85);
      const downPayment = Math.round(purchasePrice * 0.10);
      const carryBalance = purchasePrice - downPayment;
      const sfRate = 7; // típico seller finance
      const sfMonthly = Math.round(monthlyPayment(carryBalance, sfRate, 30));
      const totalInterest = Math.round(sfMonthly * 360 - carryBalance);
      return {
        totalAcquisition: purchasePrice,
        sellerCashAtClose: downPayment,
        estimatedProfit: Math.round(arv * 0.05), // refi/exit ~5% ARV
        lines: [
          { label: 'Precio de compra', value: fmt(purchasePrice), hint: '~85% ARV (premium por términos)' },
          { label: 'Down payment al seller', value: fmt(downPayment), hint: '~10%' },
          { label: `Pago mensual al seller (${sfRate}%)`, value: fmt(sfMonthly), hint: '30 años amortizado' },
          { label: 'Interés total que recibirá seller', value: fmt(totalInterest), emphasis: 'positive' },
          { label: 'Renta estimada', value: fmt(estimatedRent(arv)) },
          { label: 'Cashflow mensual neto', value: fmt(estimatedRent(arv) - sfMonthly), emphasis: estimatedRent(arv) - sfMonthly > 0 ? 'positive' : 'negative' },
        ],
        pitchLine: `Te pago ${fmt(purchasePrice)} con ${fmt(downPayment)} al cerrar y ${fmt(sfMonthly)}/mes por 30 años — ingreso pasivo garantizado.`,
      };
    }

    // --------------------------------------------------------
    case 'hybrid': {
      const purchasePrice = mao ?? Math.round(Math.min(arv * 0.85, mort + equityValue * 0.30));
      const sellerCarry = Math.max(0, purchasePrice - mort);
      const carryRate = 6;
      const carryMonthly = Math.round(monthlyPayment(sellerCarry, carryRate, 15));
      const underlyingMonthly = Math.round(monthlyPayment(mort, rate, years));
      const totalMonthly = carryMonthly + underlyingMonthly;
      const rent = estimatedRent(arv);
      return {
        totalAcquisition: purchasePrice,
        sellerCashAtClose: 0,
        estimatedProfit: Math.round(equityValue * 0.10),
        lines: [
          { label: 'Precio total de compra', value: fmt(purchasePrice) },
          { label: 'Asumes hipoteca (Sub-To)', value: fmt(mort) },
          { label: `Seller carry @ ${carryRate}% / 15y`, value: fmt(sellerCarry), emphasis: 'neutral' },
          { label: 'Pago Sub-To (existente)', value: fmt(underlyingMonthly) },
          { label: 'Pago seller carry', value: fmt(carryMonthly) },
          { label: 'Pago mensual total', value: fmt(totalMonthly) },
          { label: 'Renta estimada', value: fmt(rent) },
          { label: 'Cashflow mensual', value: fmt(rent - totalMonthly), emphasis: rent - totalMonthly > 0 ? 'positive' : 'negative' },
        ],
        pitchLine: `Asumimos tu hipoteca y te pagamos ${fmt(carryMonthly)}/mes por 15 años por tu equity de ${fmt(sellerCarry)}.`,
      };
    }

    // --------------------------------------------------------
    case 'novation': {
      const purchasePrice = mao ?? (inp.listingPrice ? Math.round(inp.listingPrice * 1.05) : 0);
      const retailExit = Math.round(arv * 0.97);
      const realtorFees = Math.round(retailExit * 0.06);
      const lightRehab = Math.round(repairs * 0.5);
      const profit = retailExit - purchasePrice - realtorFees - lightRehab;
      return {
        totalAcquisition: purchasePrice,
        sellerCashAtClose: purchasePrice,
        estimatedProfit: profit,
        lines: [
          { label: 'Precio garantizado al seller', value: fmt(purchasePrice), hint: '~5% sobre listing' },
          { label: 'Light rehab (cosmético)', value: fmt(lightRehab), emphasis: 'negative' },
          { label: 'Venta retail (MLS)', value: fmt(retailExit), hint: '~97% ARV' },
          { label: 'Comisiones realtor (6%)', value: fmt(realtorFees), emphasis: 'negative' },
          { label: 'Profit compartido (tú)', value: fmt(profit), emphasis: profit > 0 ? 'positive' : 'negative' },
        ],
        pitchLine: `Te garantizo ${fmt(purchasePrice)} en 30 días — más alto que cualquier cash buyer.`,
      };
    }

    // --------------------------------------------------------
    case 'pass':
    default:
      return {
        totalAcquisition: null,
        sellerCashAtClose: null,
        estimatedProfit: null,
        lines: [],
        pitchLine: '',
      };
  }
}
