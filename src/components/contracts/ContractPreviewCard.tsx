import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, AlertTriangle, DollarSign, Shield } from 'lucide-react';
import type { Contract } from '@/hooks/useContracts';

interface ContractPreviewCardProps {
  contract: Contract;
}

interface RiskCheck {
  label: string;
  ok: boolean;
  critical: boolean;
}

type RiskLevel = 'green' | 'yellow' | 'red';

function getABChecks(data: Record<string, any>): RiskCheck[] {
  return [
    { label: 'Nombre del Seller',       ok: !!data.seller_name,                                  critical: true },
    { label: 'Dirección propiedad',      ok: !!data.property_address,                             critical: true },
    { label: 'Precio de venta',          ok: !!data.sale_price && Number(data.sale_price) > 0,    critical: true },
    { label: 'Compañía de título',       ok: !!data.title_company,                                critical: false },
    { label: 'Días de cierre',           ok: !!data.closing_days,                                 critical: false },
    { label: 'Due Diligence Period',     ok: !!data.due_diligence_days,                           critical: false },
    { label: 'Email del Seller',         ok: !!data.seller_email,                                 critical: false },
    { label: '✅ As-Is Clause (Alabama)',    ok: true,                                             critical: false },
    { label: '✅ Assignment Clause',         ok: true,                                             critical: false },
    { label: '✅ Investor Disclosure',       ok: true,                                             critical: false },
  ];
}

function getDCChecks(data: Record<string, any>): RiskCheck[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closingDate = data.closing_date ? new Date(data.closing_date) : null;
  const closingPast = closingDate ? closingDate < today : false;
  return [
    { label: 'Nombre del Seller',         ok: !!data.seller_name,                                    critical: true },
    { label: 'Dirección propiedad',        ok: !!data.property_address,                               critical: true },
    { label: 'A→B Price (Confidencial)',   ok: !!data.ab_price && Number(data.ab_price) > 0,          critical: true },
    { label: 'Nombre del End Buyer',       ok: !!data.buyer_name,                                     critical: true },
    { label: 'B→C Price (Buyer paga)',     ok: !!data.bc_price && Number(data.bc_price) > 0,          critical: true },
    { label: 'Fecha de Cierre Simultáneo', ok: !!data.closing_date && !closingPast,                    critical: true },
    { label: 'Compañía de Título',         ok: !!data.title_company,                                  critical: false },
    { label: 'Email del End Buyer',        ok: !!data.buyer_email,                                    critical: false },
    { label: 'Fuente Funding A→B',         ok: !!data.transactional_funding,                          critical: false },
    { label: '✅ Doble Cierre Simultáneo',  ok: true,                                                  critical: false },
    { label: '✅ Confidencialidad A→B',     ok: true,                                                  critical: false },
    { label: '✅ Investor Disclosure',      ok: true,                                                  critical: false },
  ];
}

function getBCChecks(data: Record<string, any>): RiskCheck[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closingDate = data.closing_date ? new Date(data.closing_date) : null;
  const closingPast = closingDate ? closingDate < today : false;
  return [
    { label: 'Nombre del Buyer (Assignee)', ok: !!data.assignee_name,                                        critical: true },
    { label: 'Total Assignment Amount',     ok: !!data.total_assignment_amount && Number(data.total_assignment_amount) > 0, critical: true },
    { label: 'Fecha de Cierre',             ok: !!data.closing_date && !closingPast,                          critical: true },
    { label: 'Método de Pago',              ok: !!data.payment_method,                                        critical: false },
    { label: 'Compañía de Título',          ok: !!data.title_company,                                         critical: false },
    { label: 'Email del Buyer',             ok: !!data.buyer_email,                                           critical: false },
    { label: '✅ Investor Disclosure',       ok: true,                                                         critical: false },
    { label: '✅ Fair Housing (Federal)',    ok: true,                                                         critical: false },
  ];
}

function computeRisk(checks: RiskCheck[]): RiskLevel {
  if (checks.some(c => c.critical && !c.ok)) return 'red';
  if (checks.some(c => !c.critical && !c.ok)) return 'yellow';
  return 'green';
}

const riskConfig = {
  green:  { label: '✅ Contrato Completo — Listo para firmar', border: 'border-green-500/30',  bg: 'bg-green-500/8',  text: 'text-green-700 dark:text-green-400' },
  yellow: { label: '⚠️ Campos faltantes — Revisar antes de firmar',  border: 'border-yellow-500/30', bg: 'bg-yellow-500/8', text: 'text-yellow-700 dark:text-yellow-400' },
  red:    { label: '🔴 Incompleto — No enviar aún',            border: 'border-destructive/30', bg: 'bg-destructive/8', text: 'text-destructive' },
};

export function ContractPreviewCard({ contract }: ContractPreviewCardProps) {
  const data = contract.contract_data || {};
  const lead = contract.lead as any;
  const property = lead?.property;

  const checks = useMemo(() => {
    if (contract.contract_type === 'AB') return getABChecks(data);
    if (contract.contract_type === 'BC') return getBCChecks(data);
    if (contract.contract_type === 'DC') return getDCChecks(data);
    return [];
  }, [contract.contract_type, data]);

  const risk = computeRisk(checks);
  const cfg = riskConfig[risk];

  // Financial numbers
  const salePrice        = Number(data.sale_price || 0);
  const totalAssignment  = Number(data.total_assignment_amount || 0);
  const optionFee        = Number(data.option_fee || 0);
  const mao              = Number(property?.mao || 0);
  const arv              = Number((property as any)?.arv || 0);
  const repairCost       = Number((property as any)?.repair_cost || 0);

  // For AB: spread = MAO - salePrice
  const abSpread = mao > 0 && salePrice > 0 ? mao - salePrice : null;

  // For BC: assignment fee = totalAssignment - salePrice (if both known)
  const assignmentFee = totalAssignment > 0 && salePrice > 0 ? totalAssignment - salePrice : null;

  // For DC: profit = bc_price - ab_price
  const abPrice = Number(data.ab_price || 0);
  const bcPrice = Number(data.bc_price || 0);
  const dcProfit = abPrice > 0 && bcPrice > 0 ? bcPrice - abPrice : null;

  return (
    <div className="space-y-3">
      {/* ── Risk Semaphore ── */}
      <div className={`rounded-lg border p-3 ${cfg.border} ${cfg.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</span>
          <Badge variant="outline" className="text-[10px]">
            {checks.filter(c => c.ok).length}/{checks.length}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-y-1 gap-x-2">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs min-w-0">
              {check.ok ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
              ) : check.critical ? (
                <XCircle className="h-3 w-3 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
              )}
              <span className={`truncate ${!check.ok ? (check.critical ? 'text-destructive font-medium' : 'text-yellow-600') : 'text-muted-foreground'}`}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Financial Calculator (AB) ── */}
      {contract.contract_type === 'AB' && (salePrice > 0 || mao > 0 || arv > 0) && (
        <Card className="border-blue-500/20">
          <CardContent className="p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-blue-400" />
              Calculadora A → B (Klose compra al Seller)
            </p>
            {arv > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ARV propiedad</span>
                <span>${arv.toLocaleString()}</span>
              </div>
            )}
            {repairCost > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Reparaciones estimadas</span>
                <span className="text-destructive">- ${repairCost.toLocaleString()}</span>
              </div>
            )}
            {mao > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">MAO calculado (65% ARV - repairs)</span>
                <span className="text-accent font-medium">${mao.toLocaleString()}</span>
              </div>
            )}
            {salePrice > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span>Precio Oferta al Seller</span>
                <span className="text-primary">${salePrice.toLocaleString()}</span>
              </div>
            )}
            {abSpread !== null && (
              <>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Spread disponible para fee</span>
                  <span className={abSpread >= 5000 ? 'text-success' : abSpread >= 0 ? 'text-warning' : 'text-destructive'}>
                    {abSpread >= 0 ? '+' : ''}${abSpread.toLocaleString()}
                  </span>
                </div>
                {abSpread >= 5000 && (
                  <p className="text-[10px] text-muted-foreground">
                    Assignment fee estimado: ${Math.round(abSpread * 0.3).toLocaleString()} – ${Math.round(abSpread * 0.6).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Financial Calculator (BC) ── */}
      {contract.contract_type === 'BC' && totalAssignment > 0 && (
        <Card className="border-purple-500/20">
          <CardContent className="p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-purple-400" />
              Calculadora B → C (Klose asigna al Buyer)
            </p>
            <div className="flex justify-between text-sm font-medium">
              <span>Total que paga el Buyer</span>
              <span className="text-primary">${totalAssignment.toLocaleString()}</span>
            </div>
            {salePrice > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lo que Klose pagó al Seller</span>
                <span className="text-destructive">- ${salePrice.toLocaleString()}</span>
              </div>
            )}
            {assignmentFee !== null && (
              <>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Assignment Fee — Ganancia Klose</span>
                  <span className={assignmentFee >= 5000 ? 'text-success' : 'text-warning'}>
                    ${assignmentFee.toLocaleString()}
                  </span>
                </div>
              </>
            )}
            {optionFee > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Option Fee (non-refundable al Buyer)</span>
                <span>${optionFee.toLocaleString()}</span>
              </div>
            )}
            {data.payment_method && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Método de Pago</span>
                <span>{data.payment_method}</span>
              </div>
            )}
            {data.closing_date && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fecha de Cierre</span>
                <span className={
                  new Date(data.closing_date) < new Date()
                    ? 'text-destructive font-medium'
                    : (new Date(data.closing_date).getTime() - Date.now()) < 7 * 86400000
                      ? 'text-warning font-medium'
                      : ''
                }>
                  {new Date(data.closing_date).toLocaleDateString('es-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {(new Date(data.closing_date).getTime() - Date.now()) < 7 * 86400000 && new Date(data.closing_date) > new Date() && ' ⚠️ <7 días'}
                  {new Date(data.closing_date) < new Date() && ' 🔴 VENCIDA'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Financial Calculator (DC) ── */}
      {contract.contract_type === 'DC' && (abPrice > 0 || bcPrice > 0) && (
        <Card className="border-teal-500/20">
          <CardContent className="p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-teal-400" />
              Calculadora Double Close (A→B / B→C)
            </p>
            {abPrice > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">A→B Price (Klose paga al Seller) — CONFIDENCIAL</span>
                <span className="text-destructive">- ${abPrice.toLocaleString()}</span>
              </div>
            )}
            {bcPrice > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span>B→C Price (End Buyer paga a Klose)</span>
                <span className="text-primary">${bcPrice.toLocaleString()}</span>
              </div>
            )}
            {dcProfit !== null && (
              <>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Ganancia Klose (Spread DC)</span>
                  <span className={dcProfit >= 5000 ? 'text-success' : dcProfit >= 0 ? 'text-warning' : 'text-destructive'}>
                    {dcProfit >= 0 ? '+' : ''}${dcProfit.toLocaleString()}
                  </span>
                </div>
              </>
            )}
            {data.closing_date && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cierre Simultáneo</span>
                <span className={
                  new Date(data.closing_date) < new Date()
                    ? 'text-destructive font-medium'
                    : (new Date(data.closing_date).getTime() - Date.now()) < 7 * 86400000
                      ? 'text-warning font-medium'
                      : ''
                }>
                  {new Date(data.closing_date).toLocaleDateString('es-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {(new Date(data.closing_date).getTime() - Date.now()) < 7 * 86400000 && new Date(data.closing_date) > new Date() && ' ⚠️ <7 días'}
                  {new Date(data.closing_date) < new Date() && ' 🔴 VENCIDA'}
                </span>
              </div>
            )}
            {data.transactional_funding && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Funding A→B</span>
                <span>{data.transactional_funding}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Alabama Compliance Badge ── */}
      <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
        <Shield className="h-4 w-4 text-green-500 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-green-600">Alabama Wholesale Compliance:</span>
          {' '}As-Is · Assignment Clause · Investor Disclosure · Fair Housing · Non-Representation
        </div>
      </div>
    </div>
  );
}
