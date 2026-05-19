import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ContractPageViewer from './ContractPageViewer';
import { ContractPreviewCard } from './ContractPreviewCard';
import type { Contract } from '@/hooks/useContracts';

const DEMO_PROPERTY = {
  address: '648 27th St SW',
  city: 'Birmingham',
  state: 'AL',
  county: 'Jefferson',
  owner_name: 'John Smith',
  owner_phone: '(205) 555-0101',
  owner_email: 'jsmith@example.com',
  mao: 49735,
  arv: 76500,
  repair_cost: 20000,
};

const AB_DEMO: Record<string, string> = {
  seller_name: 'John Smith',
  property_address: '648 27th St SW',
  property_city: 'Birmingham',
  property_county: 'Jefferson',
  property_state: 'AL',
  sale_price: '38000',
  title_company: 'First American Title Insurance',
  closing_days: '30',
  due_diligence_days: '10',
  seller_email: 'jsmith@example.com',
  seller_phone: '(205) 555-0101',
  marital_status: 'Single',
  not_included_items: 'None',
  special_provisions: 'None',
};

const BC_DEMO: Record<string, string> = {
  seller_name: 'John Smith',
  property_address: '648 27th St SW',
  property_city: 'Birmingham',
  property_state: 'AL',
  assignee_name: 'Milan Petojevic',
  buyer_email: 'milan@aevipeoplerealty.com',
  buyer_phone: '(205) 555-0202',
  total_assignment_amount: '49735',
  payment_method: 'Cash',
  closing_date: '2026-06-30',
  title_company: 'First American Title Insurance',
  option_fee: '2500',
  sale_price: '38000',
  exceptions: 'None',
};

const DC_DEMO: Record<string, string> = {
  seller_name: 'John Smith',
  property_address: '648 27th St SW',
  property_city: 'Birmingham',
  property_county: 'Jefferson',
  property_state: 'AL',
  ab_price: '38000',
  buyer_name: 'Milan Petojevic',
  buyer_email: 'milan@aevipeoplerealty.com',
  buyer_phone: '(205) 555-0202',
  bc_price: '49735',
  closing_date: '2026-06-30',
  title_company: 'First American Title Insurance',
  transactional_funding: 'Self-funded / Hard Money',
  closing_days: '30',
  special_provisions: 'None',
};

function makeDemoContract(type: 'AB' | 'BC' | 'DC', data: Record<string, string>): Contract {
  return {
    id: 'demo',
    contract_type: type,
    status: 'draft',
    contract_data: data,
    lead: {
      id: 'demo-lead',
      status: 'prospecto',
      property: DEMO_PROPERTY as any,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lead_id: 'demo-lead',
    signing_token: 'demo',
    seller_email: null,
    seller_phone: null,
    sent_at: null,
    viewed_at: null,
    signed_at: null,
    ip_address: null,
    created_by: null,
    pdf_url: null,
    signed_pdf_url: null,
  } as unknown as Contract;
}

const DEMO_MAP = { AB: AB_DEMO, BC: BC_DEMO, DC: DC_DEMO } as const;
const TYPE_LABELS = { AB: 'AB — Compra al Seller', BC: 'BC — Assignment al Buyer', DC: 'DC — Double Close' };

interface ContractDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDemoModal({ open, onOpenChange }: ContractDemoModalProps) {
  const [activeType, setActiveType] = useState<'AB' | 'BC' | 'DC'>('AB');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[95vw] lg:max-w-[1400px] overflow-hidden p-0 flex flex-col">
        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            🔍 Vista Demo — Contratos de Ejemplo
            <Badge variant="outline" className="text-xs font-normal">
              648 27th St SW, Birmingham AL · John Smith → Milan Petojevic
            </Badge>
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview completo con datos ficticios. No se guarda en base de datos ni se envía a nadie.
          </p>
        </SheetHeader>

        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as 'AB' | 'BC' | 'DC')} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-3 pb-2 border-b shrink-0">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              {(['AB', 'BC', 'DC'] as const).map(t => (
                <TabsTrigger key={t} value={t} className="text-xs">{TYPE_LABELS[t]}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          {(['AB', 'BC', 'DC'] as const).map(type => (
            <TabsContent key={type} value={type} className="flex-1 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] flex-1 overflow-hidden">
                {/* Contract pages — left */}
                <ScrollArea className="h-full border-r bg-muted/10">
                  <div className="p-4 space-y-4">
                    <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                      ⚠️ DEMO — Datos ficticios para visualización. Versión real usa datos del lead seleccionado.
                    </div>
                    <ContractPageViewer contractType={type} data={DEMO_MAP[type]} />
                  </div>
                </ScrollArea>

                {/* Risk semaphore + calculator — right */}
                <ScrollArea className="h-full bg-background">
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Análisis del Contrato</p>
                      <ContractPreviewCard contract={makeDemoContract(type, DEMO_MAP[type])} />
                    </div>

                    {/* Demo data summary */}
                    <div className="rounded-lg border bg-card p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Datos del Demo</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Propiedad</span>
                        <span>648 27th St SW, Birmingham AL</span>
                        <span className="text-muted-foreground">Seller</span>
                        <span>John Smith</span>
                        <span className="text-muted-foreground">ARV</span>
                        <span>$76,500</span>
                        <span className="text-muted-foreground">MAO (65% ARV - repairs)</span>
                        <span>$49,735</span>
                        <span className="text-muted-foreground">Precio A→B</span>
                        <span className="text-primary font-medium">$38,000</span>
                        <span className="text-muted-foreground">Assignment Fee</span>
                        <span className="text-success font-medium">$11,735</span>
                        <span className="text-muted-foreground">Buyer</span>
                        <span>Milan Petojevic</span>
                        <span className="text-muted-foreground">Company</span>
                        <span>AEVIPEOPLEREALTY.COM</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
