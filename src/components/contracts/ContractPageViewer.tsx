import { Separator } from '@/components/ui/separator';
import { PenTool, CheckCircle } from 'lucide-react';

export interface KloseSignatureData {
  pageNum: number;
  signerName: string;
  signatureImage: string;
  signedAt: string;
}

interface ContractPageViewerProps {
  contractType: 'AB' | 'BC' | 'AMENDMENT';
  data: Record<string, string>;
  mode?: 'view' | 'signing';
}

const V = ({ k, data, fallback }: { k: string; data: Record<string, string>; fallback?: string }) => (
  <span className="text-primary font-semibold underline decoration-primary/40">
    {data[k] || fallback || '______________________________'}
  </span>
);

const FilledCheck = ({ value, label }: { value?: string; label: string }) => {
  const checked = value === label || value === label.toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1 ${checked ? 'font-bold text-primary' : ''}`}>
      {checked ? '☑' : '☐'} {label}
    </span>
  );
};

const PageHeader = ({ title, showEIN = true }: { title?: string; showEIN?: boolean }) => (
  <div className="text-center mb-6">
    <h2 className="text-xl font-bold tracking-wider">KLOSE LLC</h2>
    {showEIN && (
      <p className="text-xs text-muted-foreground mt-1">
        A Wyoming Limited Liability Company | Real Estate Investment<br />EIN: 41-4409334
      </p>
    )}
    {title && <h3 className="text-lg font-bold mt-4 uppercase">{title}</h3>}
  </div>
);

const SignatureMarker = ({ label, mode, kloseSignature }: { label: string; mode?: 'view' | 'signing'; kloseSignature?: KloseSignatureData }) => {
  if (mode === 'signing') {
    return (
      <div className="mt-6 pt-4 border-t-2 border-dashed border-amber-400">
        {kloseSignature && (
          <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-semibold text-primary mb-1">🏢 Klose LLC — Signed by {kloseSignature.signerName}</p>
            <img src={kloseSignature.signatureImage} alt="Klose Signature" className="h-12 bg-white rounded p-1" />
          </div>
        )}
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          <PenTool className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">✍️ {label} — Sign below using the signature pad</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-8 pt-4 border-t border-dashed border-border/50">
      <div className="w-64">
        <div className="border-b border-foreground/30 h-8 mb-1" />
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Date: ________________________</p>
      </div>
    </div>
  );
};

const DualSignatureMarker = ({ leftLabel, rightLabel, leftPrint, rightPrint, mode }: {
  leftLabel: string; rightLabel: string; leftPrint: string; rightPrint: string; mode?: 'view' | 'signing';
}) => {
  if (mode === 'signing') {
    return (
      <div className="mt-6 pt-4 border-t-2 border-dashed border-amber-400">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          <PenTool className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">✍️ {leftLabel} — Sign below using the signature pad</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-8 pt-4 border-t border-dashed border-border/50 grid grid-cols-2 gap-8">
      <div>
        <div className="border-b border-foreground/30 h-8 mb-1" />
        <p className="text-xs text-muted-foreground">{leftLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{leftPrint}</p>
        <p className="text-xs text-muted-foreground mt-1">Date: ________________</p>
      </div>
      <div>
        <div className="border-b border-foreground/30 h-8 mb-1" />
        <p className="text-xs text-muted-foreground">{rightLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">{rightPrint}</p>
        <p className="text-xs text-muted-foreground mt-1">Date: ________________</p>
      </div>
    </div>
  );
};

const PageWrapper = ({ children, pageNum, total }: { children: React.ReactNode; pageNum: number; total: number }) => (
  <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
    {children}
    <div className="text-right mt-6 text-xs text-muted-foreground">Page {pageNum} of {total}</div>
  </div>
);

// ─── Helper to get signable pages for the wizard ───
export interface SignablePageInfo {
  pageNum: number;
  title: string;
  requiresSignature: boolean;
  signatureLabel: string;
}

export function getABSignablePages(): SignablePageInfo[] {
  return [
    { pageNum: 1, title: 'Purchase & Sale Agreement (1/3)', requiresSignature: false, signatureLabel: '' },
    { pageNum: 2, title: 'Purchase & Sale Agreement (2/3)', requiresSignature: false, signatureLabel: '' },
    { pageNum: 3, title: 'Purchase & Sale Agreement (3/3)', requiresSignature: true, signatureLabel: 'Seller Signature — Purchase & Sale Agreement' },
    { pageNum: 4, title: 'Seller Info Worksheet (1/2)', requiresSignature: false, signatureLabel: '' },
    { pageNum: 5, title: 'Seller Info Worksheet (2/2)', requiresSignature: true, signatureLabel: 'Seller Signature — Seller Info Worksheet' },
    { pageNum: 6, title: 'Investor Disclosure Statement', requiresSignature: true, signatureLabel: 'Seller Signature — Investor Disclosure' },
    { pageNum: 7, title: 'Fair Housing & Affiliated Business', requiresSignature: true, signatureLabel: 'Seller Signature — Fair Housing' },
    { pageNum: 8, title: 'Notice of Non-Representation', requiresSignature: true, signatureLabel: 'Seller Signature — Non-Representation' },
    { pageNum: 9, title: 'Special Limited Power of Attorney', requiresSignature: true, signatureLabel: 'Seller Signature — Power of Attorney' },
    { pageNum: 10, title: 'Authorization for Release of Info', requiresSignature: true, signatureLabel: 'Seller Signature — Release of Info' },
    { pageNum: 11, title: "Seller's Responsibility Acknowledgement", requiresSignature: true, signatureLabel: "Seller Signature — Seller's Responsibility" },
  ];
}

export function getBCSignablePages(): SignablePageInfo[] {
  return [
    { pageNum: 1, title: 'Assignment Agreement (1/3)', requiresSignature: false, signatureLabel: '' },
    { pageNum: 2, title: 'Assignment Agreement (2/3)', requiresSignature: false, signatureLabel: '' },
    { pageNum: 3, title: 'Assignment Agreement (3/3)', requiresSignature: true, signatureLabel: 'Assignee Signature — Assignment Agreement' },
    { pageNum: 4, title: 'Investor Disclosure', requiresSignature: true, signatureLabel: 'Buyer/Assignee Signature — Investor Disclosure' },
    { pageNum: 5, title: 'Notices & Disclosures', requiresSignature: true, signatureLabel: 'Buyer/Assignee Signature — Non-Representation' },
    { pageNum: 6, title: 'Fair Housing Acknowledgement', requiresSignature: true, signatureLabel: 'Buyer/Assignee Signature — Fair Housing' },
  ];
}

export function getAmendmentSignablePages(): SignablePageInfo[] {
  return [
    { pageNum: 1, title: 'Amendment (1/2)', requiresSignature: false, signatureLabel: '' },
    { pageNum: 2, title: 'Amendment — Seller Signatures', requiresSignature: true, signatureLabel: 'Seller Signature — Amendment' },
  ];
}

// ─── Klose representative signable pages ───
export function getABKloseSignablePages(): SignablePageInfo[] {
  return [
    { pageNum: 3, title: 'Purchase & Sale Agreement (3/3)', requiresSignature: true, signatureLabel: 'Buyer (Klose LLC) Signature — Purchase & Sale Agreement' },
    { pageNum: 6, title: 'Investor Disclosure Statement', requiresSignature: true, signatureLabel: 'Buyer (Klose LLC) Signature — Investor Disclosure' },
    { pageNum: 7, title: 'Fair Housing & Affiliated Business', requiresSignature: true, signatureLabel: 'Buyer (Klose LLC) Signature — Fair Housing' },
    { pageNum: 8, title: 'Notice of Non-Representation', requiresSignature: true, signatureLabel: 'Buyer (Klose LLC) Signature — Non-Representation' },
  ];
}

export function getBCKloseSignablePages(): SignablePageInfo[] {
  return [
    { pageNum: 3, title: 'Assignment Agreement (3/3)', requiresSignature: true, signatureLabel: 'Assignor (Klose LLC) Signature — Assignment Agreement' },
  ];
}

export function getAmendmentKloseSignablePages(): SignablePageInfo[] {
  return [
    { pageNum: 2, title: 'Amendment — Buyer Signature', requiresSignature: true, signatureLabel: 'Buyer (Klose LLC) Signature — Amendment' },
  ];
}

// ─── BC single page renderer ───
function BCPageSingle({ pageNum, d, mode = 'view' }: { pageNum: number; d: Record<string, string>; mode?: 'view' | 'signing' }) {
  const totalPages = 6;
  const fullAddr = [d.property_address, d.property_city, d.property_state].filter(Boolean).join(', ');
  switch (pageNum) {
    case 1: return (
      <PageWrapper pageNum={1} total={totalPages}>
        <PageHeader title='ASSIGNMENT OF "AS IS" CASH-OFFER PURCHASE AND SALE AGREEMENT' />
        <h4 className="font-bold mt-4 mb-2">1. PARTIES:</h4>
        <p className="text-sm leading-relaxed">The undersigned Klose LLC, a Wyoming Limited Liability Company (the "ASSIGNOR"), having executed an "As Is" Cash-Offer Purchase and Sale Agreement (the "INITIAL PURCHASE AGREEMENT") with <V k="seller_name" data={d} /> (the "SELLER"), for the Property identified in Paragraph 2 of this Assignment Agreement (the "ASSIGNMENT"), hereby assigns and otherwise transfers all rights, title, and interest held by Assignor in said Property to <V k="assignee_name" data={d} /> (the "ASSIGNEE") in exchange for an Assignment Fee as described below.</p>
        <h4 className="font-bold mt-4 mb-2">2. PROPERTY:</h4>
        <p className="text-sm leading-relaxed"><V k="property_address" data={d} fallback={fullAddr} />, including all fixtures, appliances, other permanently installed equipment, and all other items stipulated under other provisions of this contract.</p>
        <h4 className="font-bold mt-4 mb-2">3. AGREEMENT AND ASSIGNMENT TERMS:</h4>
        <p className="text-sm leading-relaxed">Assignee shall pay a gross amount of $ <V k="total_assignment_amount" data={d} />.</p>
        <h4 className="font-bold mt-4 mb-2">4. METHOD OF PAYMENT:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE'S method of payment: <V k="payment_method" data={d} /></p>
        <h4 className="font-bold mt-4 mb-2">5. CLOSING COSTS:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE expressly agrees to pay all closing costs associated with this transaction.</p>
        <h4 className="font-bold mt-4 mb-2">6. ASSIGNEE REPRESENTATIONS:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE represents and acknowledges receipt of the INITIAL PURCHASE AGREEMENT prior to the execution of this ASSIGNMENT.</p>
      </PageWrapper>
    );
    case 2: return (
      <PageWrapper pageNum={2} total={totalPages}>
        <h4 className="font-bold mt-2 mb-2">7. ASSIGNOR REPRESENTATIONS:</h4>
        <p className="text-sm leading-relaxed">ASSIGNOR represents that the INITIAL PURCHASE AGREEMENT is in full force and effect and is fully assignable.</p>
        <h4 className="font-bold mt-4 mb-2">8. CONDITION OF THE PROPERTY – "AS-IS":</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE acknowledges purchasing the Property in its present physical condition. EXCEPT: <V k="exceptions" data={d} fallback="None" />.</p>
        <h4 className="font-bold mt-4 mb-2">9. NON-REFUNDABLE OPTION FEE:</h4>
        <p className="text-sm leading-relaxed">Non-refundable Assignment Option Fee of $ <V k="option_fee" data={d} /> to <V k="title_company" data={d} />.</p>
        <h4 className="font-bold mt-4 mb-2">10. CLOSING:</h4>
        <p className="text-sm leading-relaxed">Closing shall occur on or before <V k="closing_date" data={d} />.</p>
        <h4 className="font-bold mt-4 mb-2">11. TITLE POLICY:</h4>
        <p className="text-sm leading-relaxed">The SELLER shall furnish to ASSIGNEE an Owner's Policy of Title Insurance.</p>
        <h4 className="font-bold mt-4 mb-2">12. DEFAULT:</h4>
        <p className="text-sm leading-relaxed">If ASSIGNOR is unable to perform, ASSIGNEE'S sole remedy is termination and return of Option Fee.</p>
      </PageWrapper>
    );
    case 3: return (
      <PageWrapper pageNum={3} total={totalPages}>
        <h4 className="font-bold mt-2 mb-2">13. MARKETABLE TITLE</h4>
        <p className="text-sm leading-relaxed">This sale is contingent upon Seller obtaining marketable title.</p>
        <h4 className="font-bold mt-4 mb-2">14. HOLD HARMLESS AND ASSUMPTION OF LIABILITY</h4>
        <p className="text-sm leading-relaxed">Assignor is to be held harmless by the Assignee for third-party damages or liabilities.</p>
        <h4 className="font-bold mt-4 mb-2">15. ENTIRE AGREEMENT OF PARTIES</h4>
        <p className="text-sm leading-relaxed">This contract contains the entire agreement of the parties.</p>
        <h4 className="font-bold mt-4 mb-2">16. SPECIAL PROVISIONS</h4>
        <p className="text-sm leading-relaxed">{d.special_provisions || '______________________________________________________________________'}</p>
        <DualSignatureMarker leftLabel="Assignee Signature" rightLabel="Assignor Signature" leftPrint="Assignee Printed Name" rightPrint="Klose LLC / Authorized Signatory" mode={mode} />
      </PageWrapper>
    );
    case 4: return (
      <PageWrapper pageNum={4} total={totalPages}>
        <PageHeader title="INVESTOR DISCLOSURE STATEMENT" />
        <p className="text-sm leading-relaxed mb-3">I, the undersigned, acknowledge and understand that Klose LLC is a for-profit real estate investment company.</p>
        <ol className="list-decimal ml-6 text-sm space-y-2">
          <li>Klose is a real estate investor and is NOT a licensed broker or agent.</li>
          <li>Klose holds an equitable interest through a Purchase and Sale Agreement.</li>
          <li>This transaction is contingent upon Klose obtaining marketable title.</li>
          <li>The parties agree to use <V k="title_company" data={d} /> (Title Company).</li>
          <li>This property is sold as-is, where-is.</li>
          <li>The undersigned is encouraged to seek independent legal counsel.</li>
        </ol>
        <SignatureMarker label="Buyer/Assignee Signature — Investor Disclosure" mode={mode} />
      </PageWrapper>
    );
    case 5: return (
      <PageWrapper pageNum={5} total={totalPages}>
        <PageHeader title="NOTICES & DISCLOSURES" />
        <h4 className="font-bold mt-2 mb-2">NOTICE OF NON-REPRESENTATION</h4>
        <p className="text-sm leading-relaxed">Klose LLC does not represent you as a real estate broker or agent.</p>
        <SignatureMarker label="Buyer/Assignee Signature — Non-Representation" mode={mode} />
        <Separator className="my-6" />
        <h4 className="font-bold mt-2 mb-2">FAIR HOUSING STATEMENT & AFFILIATED BUSINESS DISCLOSURE</h4>
        <p className="text-sm leading-relaxed">It is illegal discrimination under the Federal Fair Housing Law to discriminate based on protected characteristics.</p>
      </PageWrapper>
    );
    case 6: return (
      <PageWrapper pageNum={6} total={totalPages}>
        <p className="text-sm leading-relaxed">By signing below, I/We acknowledge receipt of the Fair Housing Statement and the Affiliated Business Disclosure.</p>
        <SignatureMarker label="Buyer/Assignee Signature — Fair Housing" mode={mode} />
      </PageWrapper>
    );
    default: return null;
  }
}

// ─── Amendment single page renderer ───
function AmendmentPageSingle({ pageNum, d, mode = 'view' }: { pageNum: number; d: Record<string, string>; mode?: 'view' | 'signing' }) {
  const totalPages = 2;
  switch (pageNum) {
    case 1: return (
      <PageWrapper pageNum={1} total={totalPages}>
        <PageHeader showEIN={false} />
        <h3 className="text-center text-lg font-bold mb-6">AMENDMENT TO PURCHASE AND SALE AGREEMENT</h3>
        <div className="text-sm space-y-2 mb-4">
          <p>Buyer: Klose LLC, a Wyoming Limited Liability Company</p>
          <p>Seller: <V k="seller_name" data={d} /></p>
          <p>Property: <V k="property_address" data={d} /></p>
        </div>
        <p className="text-sm leading-relaxed">The parties agree to amend the Purchase and Sale Agreement with a Binding Agreement Date of <V k="binding_agreement_date" data={d} />.</p>
        <h4 className="font-bold mt-6 mb-2">Amendment 1 – Purchase Price:</h4>
        <p className="text-sm leading-relaxed">New purchase price: $ <V k="new_purchase_price" data={d} /></p>
        <h4 className="font-bold mt-4 mb-2">Amendment 2 – Closing Date:</h4>
        <p className="text-sm leading-relaxed">New closing date: <V k="new_closing_date" data={d} /></p>
        <h4 className="font-bold mt-4 mb-2">Amendment 3 – Additional Terms:</h4>
        <p className="text-sm leading-relaxed">{d.additional_terms || '______________________________________________________________________'}</p>
        <DualSignatureMarker leftLabel="BUYER Signature" rightLabel="BUYER (2nd)" leftPrint="Klose LLC / Authorized Signatory" rightPrint="Printed Name / Title" mode={mode} />
      </PageWrapper>
    );
    case 2: return (
      <PageWrapper pageNum={2} total={totalPages}>
        <p className="text-sm mb-4">The party(ies) below have signed and acknowledge receipt of a copy.</p>
        <DualSignatureMarker leftLabel="SELLER Signature" rightLabel="SELLER (2nd)" leftPrint="Seller Printed Name" rightPrint="Printed Name" mode={mode} />
      </PageWrapper>
    );
    default: return null;
  }
}

// ─── Individual page renderers for wizard mode ───
export function ABPage({ pageNum, d, mode = 'view', contractType = 'AB' }: { pageNum: number; d: Record<string, string>; mode?: 'view' | 'signing'; contractType?: 'AB' | 'BC' | 'AMENDMENT' }) {
  if (contractType === 'BC') return <BCPageSingle pageNum={pageNum} d={d} mode={mode} />;
  if (contractType === 'AMENDMENT') return <AmendmentPageSingle pageNum={pageNum} d={d} mode={mode} />;
  const totalPages = 11;

  switch (pageNum) {
    case 1:
      return (
        <PageWrapper pageNum={1} total={totalPages}>
          <PageHeader showEIN={false} />
          <h3 className="text-center text-lg font-bold mb-1">STANDARD PURCHASE AND SALE AGREEMENT</h3>
          <p className="text-center text-sm font-semibold mb-6">"AS IS" CASH-OFFER</p>
          <h4 className="font-bold mt-4 mb-2">1. PARTIES:</h4>
          <p className="text-sm leading-relaxed">Klose LLC, a Wyoming Limited Liability Company (hereinafter "BUYER"), and <V k="seller_name" data={d} /> (hereinafter "SELLER"), which terms may be singular or plural and will include the heirs, successors, personal representatives, and assigns of Seller and Buyer, hereby agree that Seller will sell and Buyer will buy the following property, upon the following terms and conditions. In any conflict of terms or conditions, that which is added will supersede that which is printed.</p>
          <h4 className="font-bold mt-4 mb-2">2. PROPERTY:</h4>
          <p className="text-sm leading-relaxed">(Street Address): <V k="property_address" data={d} /></p>
          <p className="text-sm leading-relaxed">(City): <V k="property_city" data={d} /> &nbsp; (County): <V k="property_county" data={d} /> &nbsp; (State): <V k="property_state" data={d} /></p>
          <p className="text-sm leading-relaxed mt-2">The Property includes the land and all appurtenant rights, privileges and easements, all buildings and fixtures, including without limitation, all of the following as are NOW on the Property: electrical, heating, cooling, plumbing, bathroom mirrors and fixtures, awnings, screens, storm windows and doors, landscaping, disposals, TV antennas, built-in electronics wiring, ceiling fans, smoke alarms, security systems, doorbells, thermostats, garage door openers and controls, attached carpeting, ranges/ovens, microwave ovens, kitchen refrigerators, dishwashers, air conditioners, water softeners, existing window treatments, satellite/TV reception systems, affixed gas/oil tanks not including fuel therein unless otherwise agreed by the parties. NOT Included: <V k="not_included_items" data={d} fallback="None" />. All property sold by this contract is called the "Property".</p>
          <h4 className="font-bold mt-4 mb-2">3. CONTRACT TERMS:</h4>
          <p className="text-sm leading-relaxed">Sale Price: $ <V k="sale_price" data={d} /></p>
          <h4 className="font-bold mt-4 mb-2">4. NON-FINANCING / ALL CASH:</h4>
          <p className="text-sm leading-relaxed">This is an all-cash sale; no financing is involved, unless agreed upon in writing by both parties at a later date.</p>
          <h4 className="font-bold mt-4 mb-2">5. CLOSING:</h4>
          <p className="text-sm leading-relaxed">Buyer will deliver contract to <V k="title_company" data={d} /> (the "Title Company") upon execution of the contract by both parties. Closing shall occur within <V k="closing_days" data={d} fallback="30" /> business days from the execution of this agreement, or within seven (7) days after objection to title has been cured, whichever date is later.</p>
          <h4 className="font-bold mt-4 mb-2">6. TITLE POLICY:</h4>
          <p className="text-sm leading-relaxed">Seller shall furnish to Buyer at Buyer's expense an Owner's Policy of Title Insurance issued by the Title Company in the amount of the Sales Price, dated at or after closing, insuring Buyer against loss under the provisions of the Title Policy.</p>
        </PageWrapper>
      );

    case 2:
      return (
        <PageWrapper pageNum={2} total={totalPages}>
          <h4 className="font-bold mt-2 mb-2">7. PROPERTY CONDITION</h4>
          <p className="text-sm leading-relaxed">The Buyer is purchasing the Property in an "AS-IS" condition subject to a <V k="due_diligence_days" data={d} fallback="10" /> – "AS-IS" SUBJECT TO Business Day Due Diligence Period. During Due Diligence, Buyer will need to access the property with Inspectors, Appraisers, Investors, Contractors, and potentially others. Klose may also have professionals make condition determinations using pictures and videos. If Buyer determines, in its sole and absolute discretion, before the expiration of the Due Diligence Period that the Property is unacceptable for Buyer's purposes, Buyer shall have the right to terminate this Agreement by giving Seller written notice before the expiration of the Due Diligence Period. If Buyer does not give written notice of termination before the expiration of the Due Diligence Period, this Agreement shall continue in full force and effect.</p>
          <h4 className="font-bold mt-4 mb-2">8. POSSESSION:</h4>
          <p className="text-sm leading-relaxed">The possession of the Property shall be delivered to the Buyer at closing. No exceptions, unless specifically agreed upon in writing by all parties.</p>
          <h4 className="font-bold mt-4 mb-2">9. PRE-MARKETING AGREEMENT:</h4>
          <p className="text-sm leading-relaxed">If vacant, and upon acceptance of this contract by Seller, Seller is to furnish Buyer a key or combination to lockbox and give Buyer permission to enter the premises for inspections prior to closing. At Buyer's option, Buyer is allowed to display a For Sale or similar sign in front of the Property. Buyer has the right to market its contract interest in the Property in Buyer's sole discretion, which may include but is not limited to listing the Property on any Multiple Listing Service ("MLS"), investor networks, or other marketing channels.</p>
          <h4 className="font-bold mt-4 mb-2">10. PRORATIONS:</h4>
          <p className="text-sm leading-relaxed">Property Taxes, flood and hazard insurance, rents, maintenance fees, interest on any present loan, and any prepaid unearned mortgage insurance premium which is refundable in whole or in part shall be prorated through the Closing Date.</p>
          <h4 className="font-bold mt-4 mb-2">11. PROPERTY DOCUMENTATION:</h4>
          <p className="text-sm leading-relaxed">Seller to furnish Buyer a General Warranty Deed conveying title subject only to liens securing payment of debt created as part of the consideration, taxes for the current year, restrictive covenants and utility easements common to the platted subdivision of which the Property is a part, and reservations and conditions permitted by this contract or otherwise acceptable to Buyer.</p>
          <h4 className="font-bold mt-4 mb-2">12. CASUALTY LOSS:</h4>
          <p className="text-sm leading-relaxed">If any part of Property is damaged or destroyed by fire or other casualty loss, Seller shall restore the same to its previous condition as soon as reasonably possible, but in any event by Closing Date. If Seller is unable to do so without fault, Buyer may terminate this contract.</p>
          <h4 className="font-bold mt-4 mb-2">13. DEFAULT:</h4>
          <p className="text-sm leading-relaxed">If Seller fails to comply herewith for any reason, Buyer may either (a) enforce specific performance hereof and seek such other relief such as loss of profit from resale as may be provided by law, or (b) terminate this contract, thereby releasing Seller from this contract. If any party hereto shall file suit for breach or enforcement of this Agreement (including suits filed after Closing), the prevailing party shall be entitled to recover all costs of such enforcement, including reasonable attorney's fees. If any party exercises its right to terminate due to the default of the other, the terminating party retains the right to pursue all legal rights and remedies against the defaulting party.</p>
          <h4 className="font-bold mt-4 mb-2">14. REPRESENTATIONS:</h4>
          <p className="text-sm leading-relaxed">Seller represents that as of the Closing Date (a) there will be no unrecorded liens, assessments, or Uniform Commercial Code Security interests against any of the Property which will not be satisfied out of the sales price, and (b) any loans will be without default. If any representation in this contract is untrue on the Closing Date, this contract may be terminated by Buyer. All representations shall survive closing.</p>
        </PageWrapper>
      );

    case 3:
      return (
        <PageWrapper pageNum={3} total={totalPages}>
          <h4 className="font-bold mt-2 mb-2">15. SALES EXPENSES:</h4>
          <p className="text-sm leading-relaxed">The following expenses shall be paid at or prior to closing:</p>
          <ul className="list-disc ml-6 text-sm space-y-1">
            <li>A. Buyer's Expenses: Expenses stipulated to be paid by Buyer under other provisions of this contract.</li>
            <li>B. Seller's Expenses: Releases of existing liens, including prepayment penalties and recording fees; release of Seller's loan liability; tax statements or certificates; real estate transfer tax and/or conveyance fees; and other expenses stipulated to be paid by Seller under other provisions of this contract.</li>
            <li>C. If Seller(s) fails to perform, they are responsible for any consequential damages, including indirect expenses, incurred by Buyer or Buyer's assignee, including title cost, loan and sales processing, and other closing costs.</li>
          </ul>
          <h4 className="font-bold mt-4 mb-2">16. RESALE OF PROPERTY:</h4>
          <p className="text-sm leading-relaxed">Seller agrees that Buyer retains all profit, whether by note, trade, or cash, in the event of resale, simultaneous close, or assignment of this contract. Seller understands that Buyer is an investor who may: purchase the property and rent it; purchase and renovate for resale; sell as-is; or demolish and/or new build on the land.</p>
          <h4 className="font-bold mt-4 mb-2">17. ASSIGNMENT OF CONTRACT:</h4>
          <p className="text-sm leading-relaxed">Buyer may assign the contract. If assigned, all rights, interests, suits, claims, and titles in and to the contract will be assigned, and the Assignor will be released of all liability. In the event Buyer enters an Assignment Agreement with a third-party Assignee, the third-party Assignee will assume all the obligations and responsibilities of the Buyer, including any responsibility to pay Seller's closing costs as outlined in this Agreement. The Buyer is to be held harmless of all obligations under this Agreement not specifically agreed upon in writing.</p>
          <h4 className="font-bold mt-4 mb-2">18. HOLD HARMLESS AND ASSUMPTION OF LIABILITY:</h4>
          <p className="text-sm leading-relaxed">In the event the Seller has any damages or other liabilities caused by a third party, Buyer is to be held harmless by the Seller for these damages or other liabilities. This specifically includes any third parties' duty to perform under a contract with the Buyer. Seller understands and assumes the risk of loss for any liability caused by a third-party action.</p>
          <h4 className="font-bold mt-4 mb-2">19. ENTIRE AGREEMENT OF PARTIES:</h4>
          <p className="text-sm leading-relaxed">This contract contains the entire agreement of the parties and cannot be changed except by their written agreement.</p>
          <h4 className="font-bold mt-4 mb-2">20. SPECIAL PROVISIONS:</h4>
          <p className="text-sm leading-relaxed">{d.special_provisions || '______________________________________________________________________'}</p>
          <DualSignatureMarker leftLabel="Seller Signature" rightLabel="Buyer Signature" leftPrint="Seller Printed Name" rightPrint="Klose LLC / Authorized Signatory" mode={mode} />
        </PageWrapper>
      );

    case 4:
      return (
        <PageWrapper pageNum={4} total={totalPages}>
          <PageHeader title="PRELIMINARY SELLER INFORMATION WORKSHEET" showEIN={false} />
          <h4 className="font-bold mb-2">SELLER INFORMATION</h4>
          <div className="text-sm space-y-2">
            <p>Full Legal Name: <V k="seller_name" data={d} /></p>
            <p>Date of Birth: <V k="seller_dob" data={d} /></p>
            <p>Phone Number: <V k="seller_phone" data={d} /></p>
            <p>Best Day/Time to Reach: <V k="best_time_reach" data={d} /></p>
            <p>Marital Status: <V k="marital_status" data={d} /></p>
            <p>Spouse Name (if married): <V k="spouse_name" data={d} /></p>
          </div>
          <h4 className="font-bold mt-4 mb-2">PROPERTY OWNERSHIP & STATUS</h4>
          <div className="text-sm space-y-1">
            <p>Is this your primary residence? <FilledCheck value={d.is_primary_residence} label="Yes" /> <FilledCheck value={d.is_primary_residence} label="No" /></p>
            <p>Are you the direct title holder? <FilledCheck value={d.is_title_holder} label="Yes" /> <FilledCheck value={d.is_title_holder} label="No" /></p>
            <p>Are there any co-title holders? <FilledCheck value={d.has_co_title_holders} label="Yes" /> <FilledCheck value={d.has_co_title_holders} label="No" /></p>
            {d.title_holders_names && <p>Name(s) of all title holders: <V k="title_holders_names" data={d} /></p>}
            <p>How was the property acquired? <V k="acquisition_method" data={d} /></p>
            <p>Years property has been owned: <V k="years_owned" data={d} /> years</p>
            <p>Are any of the title holders deceased? <FilledCheck value={d.title_holder_deceased} label="Yes" /> <FilledCheck value={d.title_holder_deceased} label="No" /></p>
            <p>Has the property gone through probate? <FilledCheck value={d.has_probate} label="Yes" /> <FilledCheck value={d.has_probate} label="No" /></p>
          </div>
          <h4 className="font-bold mt-4 mb-2">PROPERTY DETAILS</h4>
          <div className="text-sm space-y-1">
            <p>Property Type: <V k="property_type_seller" data={d} /></p>
            <p>Occupancy Status: <V k="occupancy_status" data={d} /></p>
          </div>
        </PageWrapper>
      );

    case 5:
      return (
        <PageWrapper pageNum={5} total={totalPages}>
          <div className="text-sm space-y-2">
            <p className="font-bold">How soon would you like to close?</p>
            <p><V k="desired_closing" data={d} /></p>
            <p className="font-bold mt-3">Is there a mortgage on the property? <FilledCheck value={d.has_mortgage} label="Yes" /> <FilledCheck value={d.has_mortgage} label="No" /></p>
            {d.has_mortgage === 'yes' && <p>Estimated balance: $ <V k="mortgage_balance_seller" data={d} /></p>}
            <p className="font-bold mt-3">Is the property in pre-foreclosure or pending foreclosure? <FilledCheck value={d.is_preforeclosure} label="Yes" /> <FilledCheck value={d.is_preforeclosure} label="No" /></p>
            <p className="font-bold mt-3">Is there an HOA? <FilledCheck value={d.has_hoa} label="Yes" /> <FilledCheck value={d.has_hoa} label="No" /></p>
            <p className="font-bold mt-3">RENTAL INFORMATION</p>
            <p>Is the property generating rental income? <FilledCheck value={d.has_rental_income} label="Yes" /> <FilledCheck value={d.has_rental_income} label="No" /></p>
            {d.has_rental_income === 'yes' && (
              <>
                <p>Monthly amount: $ <V k="monthly_rent" data={d} /></p>
                <p>Written lease agreement? <FilledCheck value={d.has_lease} label="Yes" /> <FilledCheck value={d.has_lease} label="No" /></p>
              </>
            )}
            <p className="font-bold mt-3">ADDITIONAL INFORMATION</p>
            <p>Power of Attorney (POA) involved? <FilledCheck value={d.has_poa} label="Yes" /> <FilledCheck value={d.has_poa} label="No" /></p>
            <p>Have you ever filed for bankruptcy? <FilledCheck value={d.has_bankruptcy} label="Yes" /> <FilledCheck value={d.has_bankruptcy} label="No" /></p>
            {d.consult_people && <p>People to consult: <V k="consult_people" data={d} /></p>}
          </div>
          <SignatureMarker label="Seller Signature — Seller Info Worksheet" mode={mode} />
        </PageWrapper>
      );

    case 6:
      return (
        <PageWrapper pageNum={6} total={totalPages}>
          <PageHeader title="INVESTOR DISCLOSURE STATEMENT" />
          <p className="text-center text-sm font-semibold mb-4">WORKING WITH KLOSE LLC</p>
          <p className="text-sm leading-relaxed mb-3">I, the undersigned, acknowledge and understand that Klose LLC ("Klose") is a for-profit real estate investment company organized under the laws of Wyoming and operating in multiple states including Alabama. Klose specializes in the acquisition and disposition of off-market real estate assets. Accordingly, the undersigned acknowledges the following:</p>
          <ol className="list-decimal ml-6 text-sm space-y-2">
            <li>Klose is a real estate investor and is NOT a licensed real estate broker or agent. No brokerage or agency relationship is created by any agreement with Klose.</li>
            <li>Klose holds an equitable interest in the subject property through a Purchase and Sale Agreement, which allows Klose to market the property for sale or assignment.</li>
            <li>Klose is not currently the fee simple owner of the property at the time of assignment.</li>
            <li>This transaction is contingent upon Klose obtaining marketable title to the property.</li>
            <li>Marketable title means the property's title is free from significant liens, disputes, or legal issues that could question the seller's right to transfer ownership.</li>
            <li>The parties agree to use <V k="title_company" data={d} /> (Title Company) to determine marketable title, handle the closing, and issue title insurance, unless otherwise agreed in writing.</li>
            <li>If Klose is unable to obtain marketable title, Klose shall return the undersigned's option/earnest money, and all agreements shall be void and unenforceable.</li>
            <li>The closing may occur through: (a) Assignment of Contract, (b) Simultaneous Closing, or (c) Traditional Purchase.</li>
            <li>This property is sold as-is, where-is. Klose will not be responsible for cleaning, removing, or disposing of any items from the property prior to closing.</li>
            <li>The undersigned is encouraged to seek independent legal counsel prior to executing any agreement with Klose.</li>
          </ol>
          <h4 className="font-bold mt-4 mb-2">ACKNOWLEDGMENT</h4>
          <p className="text-sm leading-relaxed">I/We have read and understand this disclosure. By signing below, I/we agree to the terms and conditions stated above.</p>
          <SignatureMarker label="Seller Signature — Investor Disclosure" mode={mode} />
        </PageWrapper>
      );

    case 7:
      return (
        <PageWrapper pageNum={7} total={totalPages}>
          <PageHeader title="FAIR HOUSING STATEMENT & AFFILIATED BUSINESS DISCLOSURE" />
          <h4 className="font-bold mt-2 mb-2">FAIR HOUSING STATEMENT</h4>
          <p className="text-sm leading-relaxed">It is illegal discrimination under the Federal Fair Housing Law, 42 U.S.C.A. 3601 to take any of the following actions because of race, color, religion, sex (including gender identity and sexual orientation), disability, familial status, or national origin: Refuse to rent or sell housing; Refuse to negotiate for housing; Set different terms, conditions or privileges for sale or rental of a dwelling; Provide different housing services or facilities; Falsely deny that housing is available for inspection, sale or rental; Make, print or publish any notice, statement or advertisement indicating any preference, limitation or discrimination; Impose different sales prices or rental charges; Use different qualification criteria; Evict a tenant or tenant's guest; Harass a person; Fail or delay maintenance or repairs; Limit privileges, services or facilities of a dwelling; Discourage the purchase or rental of a dwelling; Assign a person to a particular building or neighborhood (blockbusting); Refuse to provide or discriminate in the terms or conditions of homeowners insurance because of any protected characteristic.</p>
          <h4 className="font-bold mt-4 mb-2">AFFILIATED BUSINESS DISCLOSURE</h4>
          <p className="text-sm leading-relaxed">Klose LLC and/or its affiliated companies and/or its management may have relationships with certain service providers, including title companies and lenders. Referrals to such providers may provide Klose LLC with a financial benefit.</p>
          <p className="text-sm leading-relaxed mt-2">You are NOT required to use any specific title company, lender, or settlement service provider as a condition of your purchase or sale. There are frequently other providers available with similar services. You are free to inquire with other providers to determine whether you are receiving best services at competitive rates.</p>
          <p className="text-sm leading-relaxed mt-2">By signing below, I/We acknowledge receipt of the Fair Housing Statement and the Affiliated Business Disclosure.</p>
          <SignatureMarker label="Seller Signature — Fair Housing" mode={mode} />
        </PageWrapper>
      );

    case 8:
      return (
        <PageWrapper pageNum={8} total={totalPages}>
          <PageHeader title="NOTICE OF NON-REPRESENTATION" />
          <p className="text-sm leading-relaxed">You are hereby notified that Klose LLC and its members, managers, and employees do not represent you in any capacity as a real estate broker or agent.</p>
          <p className="text-sm leading-relaxed mt-2">You should not assume that any representative of Klose LLC represents your interests unless you separately engage a licensed real estate agent or attorney. You are advised not to disclose any information you want held in confidence until you decide on representation.</p>
          <p className="text-sm leading-relaxed mt-2">Your signature below acknowledges receipt of this notice and does not establish a brokerage relationship.</p>
          <SignatureMarker label="Seller Signature — Non-Representation" mode={mode} />
        </PageWrapper>
      );

    case 9:
      return (
        <PageWrapper pageNum={9} total={totalPages}>
          <PageHeader title="AUTHORIZATION TO SIGN LISTING DOCUMENTS AND OFFERS" />
          <p className="text-center text-sm font-semibold mb-4">(Special Limited Power of Attorney)</p>
          <p className="text-sm leading-relaxed">BE IT ACKNOWLEDGED that I/we, <V k="seller_name" data={d} />, the "Seller", desire to execute and grant a SPECIAL LIMITED POWER OF ATTORNEY, hereby appointing Klose LLC, a Wyoming Limited Liability Company, as my Attorney-in-Fact to act as follows, GRANTING unto my Attorney-in-Fact full power to:</p>
          <p className="text-sm leading-relaxed mt-2">Do all things necessary to close on the sale of the property commonly known as <V k="property_address" data={d} />, <V k="property_city" data={d} />, <V k="property_state" data={d} /> (hereinafter "Property"), with full power and authority for me and my name to execute any and all documents necessary to list, market, and contract the Property on the Multiple Listing Services ("MLS"), investor networks, Zillow, and/or realtors for the purpose of marketing and selling the Property. This includes executing listing agreements, listing agreement addendums, disclosures, sale contracts, sales contract addendums, and/or other instruments of whatever kind, character, and nature as may be necessary to complete the listing, marketing, and contracting of the Property.</p>
          <p className="text-sm leading-relaxed mt-2">The authority herein shall include such incidental acts as reasonably required to carry out the authorities granted herein.</p>
          <p className="text-sm leading-relaxed mt-2">This authorization is effective upon execution and shall be valid and may be relied upon by any third parties until such time as any revocation is executed. This authorization may be revoked when the above-stated one (1) time power or responsibility has been completed.</p>
          <p className="text-sm leading-relaxed mt-2">This authorization shall automatically be revoked upon death or incapacitation of the Seller, provided any person relying on this power of attorney shall be given full rights to accept and rely upon the authority of the Attorney-in-Fact until receipt of actual notice of revocation.</p>
          <SignatureMarker label="Seller Signature — Power of Attorney" mode={mode} />
        </PageWrapper>
      );

    case 10:
      return (
        <PageWrapper pageNum={10} total={totalPages}>
          <PageHeader title="AUTHORIZATION FOR THE RELEASE OF INFORMATION" />
          <ol className="list-decimal ml-6 text-sm space-y-2">
            <li>I/We have entered into a real property sales contract. As part of this process, <V k="title_company" data={d} /> (Title Company) may request information related to my current open mortgage(s), judgments, and other documents required in connection with and in preparation of a closing.</li>
            <li>I/We authorize you to provide to the Title Company any and all information and documentation they request, including but not limited to: judgment and lien payoffs, payoff information on open mortgages, deeds of trust, etc.</li>
            <li>The Title Company or any title company substituted in their place may address this authorization to any party named in the loan application or related to any outstanding liens on the property.</li>
            <li>I agree to hold the Title Company and its agents and employees harmless for any judgment or lien payoff obtained that differs from one obtained independently.</li>
            <li>A copy of this authorization may be accepted as an original.</li>
          </ol>
          <SignatureMarker label="Seller Signature — Release of Information" mode={mode} />
        </PageWrapper>
      );

    case 11:
      return (
        <PageWrapper pageNum={11} total={totalPages}>
          <PageHeader title="SELLER'S RESPONSIBILITY ACKNOWLEDGEMENT" />
          <h4 className="font-bold mt-2 mb-2">15. SALES EXPENSES:</h4>
          <p className="text-sm leading-relaxed">The following expenses shall be paid at or prior to closing:</p>
          <ul className="list-disc ml-6 text-sm space-y-1">
            <li>A. Buyer's Expenses: Expenses stipulated to be paid by Buyer under other provisions of this contract.</li>
            <li>B. Seller's Expenses: Releases of existing liens, including prepayment penalties and recording fees; release of Seller's loan liability; tax statements or certificates; real estate transfer tax and/or conveyance fees; and other expenses stipulated to be paid by Seller under other provisions of this contract.</li>
            <li>C. If Seller(s) fails to perform, they are responsible for any consequential damages, including indirect expenses, incurred by Buyer or Buyer's assignee, including title cost, loan and sales processing, and other closing costs.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-3">To facilitate a clear title transfer, the Seller is required to pay off any outstanding mortgages, utility bills, property taxes, assessments, judgments, legal fees, and any other lien or encumbrance on the property.</p>
          <p className="text-sm leading-relaxed mt-2">Klose LLC's cash offer is based on the assumption that the Seller will use the proceeds from the sale of their property to cover the above-described expenses.</p>
          <p className="text-sm leading-relaxed mt-2">Klose LLC is not responsible for directly paying any liens, property taxes, or any other cost discovered in the title examination.</p>
          <p className="text-sm leading-relaxed mt-2">By signing this Acknowledgement, I/we confirm that: (i) I/we have carefully read, fully understand, and agree to all terms and conditions herein; (ii) this Acknowledgement constitutes the entire understanding between me/us and Klose LLC regarding my/our payment obligations associated with selling the property; and (iii) my/our payment obligations for the items outlined above will be deducted from the total purchase price.</p>
          <SignatureMarker label="Seller Signature — Seller's Responsibility" mode={mode} />
        </PageWrapper>
      );

    default:
      return null;
  }
}

// ─── AB CONTRACT PAGES (full viewer) ───
function ABPages({ d, mode }: { d: Record<string, string>; mode?: 'view' | 'signing' }) {
  return (
    <>
      {Array.from({ length: 11 }, (_, i) => (
        <ABPage key={i + 1} pageNum={i + 1} d={d} mode={mode} />
      ))}
    </>
  );
}

// ─── BC CONTRACT PAGES ───
function BCPages({ d, mode }: { d: Record<string, string>; mode?: 'view' | 'signing' }) {
  const totalPages = 6;
  const fullAddr = [d.property_address, d.property_city, d.property_state].filter(Boolean).join(', ');
  return (
    <>
      <PageWrapper pageNum={1} total={totalPages}>
        <PageHeader title='ASSIGNMENT OF "AS IS" CASH-OFFER PURCHASE AND SALE AGREEMENT' />
        <h4 className="font-bold mt-4 mb-2">1. PARTIES:</h4>
        <p className="text-sm leading-relaxed">The undersigned Klose LLC, a Wyoming Limited Liability Company (the "ASSIGNOR"), having executed an "As Is" Cash-Offer Purchase and Sale Agreement (the "INITIAL PURCHASE AGREEMENT") with <V k="seller_name" data={d} /> (the "SELLER"), for the Property identified in Paragraph 2 of this Assignment Agreement (the "ASSIGNMENT"), hereby assigns and otherwise transfers all rights, title, and interest held by Assignor in said Property to <V k="assignee_name" data={d} /> (the "ASSIGNEE") in exchange for an Assignment Fee as described below.</p>
        <h4 className="font-bold mt-4 mb-2">2. PROPERTY:</h4>
        <p className="text-sm leading-relaxed"><V k="property_address" data={d} fallback={fullAddr} />, including all fixtures, appliances, other permanently installed equipment, and all other items stipulated under other provisions of this contract. All property sold by this contract is called "the PROPERTY".</p>
        <h4 className="font-bold mt-4 mb-2">3. AGREEMENT AND ASSIGNMENT TERMS:</h4>
        <p className="text-sm leading-relaxed">Assignee shall pay a gross amount of $ <V k="total_assignment_amount" data={d} /> (which shall include the purchase price in the Purchase and Sale Agreement being assigned and the Assignment Fee due to the Assignor).</p>
        <h4 className="font-bold mt-4 mb-2">4. METHOD OF PAYMENT:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE warrants that at Closing they will have sufficient cash to complete the purchase under the terms of the ASSIGNMENT and can provide proof of funds if requested by the ASSIGNOR. ASSIGNEE'S method of payment: <V k="payment_method" data={d} /></p>
        {d.payment_method && d.payment_method !== 'Cash' && (
          <p className="text-sm leading-relaxed mt-1">Lender: <V k="lender_name" data={d} /> — Contact: <V k="lender_contact" data={d} /> — Email: <V k="lender_email" data={d} /> — Phone: <V k="lender_phone" data={d} /></p>
        )}
        <h4 className="font-bold mt-4 mb-2">5. CLOSING COSTS:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE expressly agrees to pay all closing costs associated with this transaction and all closing costs as detailed in the INITIAL PURCHASE AGREEMENT.</p>
        <h4 className="font-bold mt-4 mb-2">6. ASSIGNEE REPRESENTATIONS:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE represents and acknowledges receipt of the INITIAL PURCHASE AGREEMENT prior to the execution of this ASSIGNMENT. ASSIGNEE further agrees to accept all rights, obligations, and responsibilities the ASSIGNOR has agreed to as the BUYER in the INITIAL PURCHASE AGREEMENT.</p>
      </PageWrapper>

      <PageWrapper pageNum={2} total={totalPages}>
        <h4 className="font-bold mt-2 mb-2">7. ASSIGNOR REPRESENTATIONS:</h4>
        <p className="text-sm leading-relaxed">ASSIGNOR represents that the INITIAL PURCHASE AGREEMENT is in full force and effect and is fully assignable, that it has not been modified, and remains on the terms contained therein.</p>
        <h4 className="font-bold mt-4 mb-2">8. CONDITION OF THE PROPERTY – "AS-IS":</h4>
        <p className="text-sm leading-relaxed">Except as previously disclosed in writing to ASSIGNEE, ASSIGNOR has no knowledge of any underground tanks, faulty major appliances, faulty electrical, plumbing, heating, cooling, sewer, septic, well or water systems, structural or chimney defects, or hidden or latent defects (including leakage or water seepage) in the Property. EXCEPT: <V k="exceptions" data={d} fallback="None" />.</p>
        <h4 className="font-bold mt-4 mb-2">9. NON-REFUNDABLE OPTION FEE:</h4>
        <p className="text-sm leading-relaxed">ASSIGNEE has paid or will pay immediately upon execution of this ASSIGNMENT to <V k="title_company" data={d} /> (the "TITLE COMPANY") a non-refundable Assignment Option Fee of $ <V k="option_fee" data={d} /> by check or wire, to be held in a non-interest-bearing escrow account.</p>
        <div className="mt-2 text-sm">
          <p className="font-semibold">Required Non-Refundable Option Fee by Contract Price:</p>
          <table className="text-xs mt-1 border border-border">
            <tbody>
              <tr className="border-b border-border"><td className="px-3 py-1">A. ≤ $50,000</td><td className="px-3 py-1">= $2,500 Option Fee</td></tr>
              <tr className="border-b border-border"><td className="px-3 py-1">B. $50,000 up to $200,000</td><td className="px-3 py-1">= $5,000 Option Fee</td></tr>
              <tr><td className="px-3 py-1">C. $200,000+</td><td className="px-3 py-1">= $10,000 Option Fee</td></tr>
            </tbody>
          </table>
        </div>
        <h4 className="font-bold mt-4 mb-2">10. CLOSING:</h4>
        <p className="text-sm leading-relaxed">Closing shall occur on or before <V k="closing_date" data={d} />, or within seven (7) days after objection to title has been cured.</p>
        <h4 className="font-bold mt-4 mb-2">11. TITLE POLICY:</h4>
        <p className="text-sm leading-relaxed">The SELLER shall furnish to ASSIGNEE at ASSIGNEE'S expense an Owner's Policy of Title Insurance issued by the TITLE COMPANY in the amount of the Sale Price.</p>
        <h4 className="font-bold mt-4 mb-2">12. DEFAULT:</h4>
        <p className="text-sm leading-relaxed">If the ASSIGNOR is unable to perform, the ASSIGNEE'S express and sole remedy shall be limited to the termination of the ASSIGNMENT and return of an amount equal to the Non-Refundable Option Fee. If ASSIGNEE fails to comply herewith for any reason, ASSIGNOR may either enforce specific performance or terminate this ASSIGNMENT and retain the Non-Refundable Option Fee.</p>
      </PageWrapper>

      <PageWrapper pageNum={3} total={totalPages}>
        <h4 className="font-bold mt-2 mb-2">13. MARKETABLE TITLE</h4>
        <p className="text-sm leading-relaxed">At the time of this Agreement, Seller owns a Contract for Sale & Purchase of the subject property. Buyer acknowledges that Seller currently does not own fee simple title to the subject property. This sale is contingent upon Seller obtaining marketable title.</p>
        <h4 className="font-bold mt-4 mb-2">14. HOLD HARMLESS AND ASSUMPTION OF LIABILITY</h4>
        <p className="text-sm leading-relaxed">In the event the Assignee has any damages or other liabilities caused by a third party, Assignor is to be held harmless by the Assignee for these damages or other liabilities.</p>
        <h4 className="font-bold mt-4 mb-2">15. ENTIRE AGREEMENT OF PARTIES</h4>
        <p className="text-sm leading-relaxed">This contract contains the entire agreement of the parties and cannot be changed except by their written agreement.</p>
        <h4 className="font-bold mt-4 mb-2">16. SPECIAL PROVISIONS</h4>
        <p className="text-sm leading-relaxed">{d.special_provisions || '______________________________________________________________________'}</p>
        <DualSignatureMarker leftLabel="Assignee Signature" rightLabel="Assignor Signature" leftPrint="Assignee Printed Name" rightPrint="Klose LLC / Authorized Signatory" mode={mode} />
      </PageWrapper>

      <PageWrapper pageNum={4} total={totalPages}>
        <PageHeader title="INVESTOR DISCLOSURE STATEMENT" />
        <p className="text-center text-sm font-semibold mb-4">WORKING WITH KLOSE LLC</p>
        <p className="text-sm leading-relaxed mb-3">I, the undersigned, acknowledge and understand that Klose LLC ("Klose") is a for-profit real estate investment company organized under the laws of Wyoming and operating in multiple states including Alabama.</p>
        <ol className="list-decimal ml-6 text-sm space-y-2">
          <li>Klose is a real estate investor and is NOT a licensed real estate broker or agent.</li>
          <li>Klose holds an equitable interest in the subject property through a Purchase and Sale Agreement.</li>
          <li>Klose is not currently the fee simple owner of the property at the time of assignment.</li>
          <li>This transaction is contingent upon Klose obtaining marketable title.</li>
          <li>Marketable title means the property's title is free from significant liens, disputes, or legal issues.</li>
          <li>The parties agree to use <V k="title_company" data={d} /> (Title Company) to determine marketable title.</li>
          <li>If Klose is unable to obtain marketable title, Klose shall return the undersigned's option/earnest money.</li>
          <li>The closing may occur through: (a) Assignment of Contract, (b) Simultaneous Closing, or (c) Traditional Purchase.</li>
          <li>This property is sold as-is, where-is.</li>
          <li>The undersigned is encouraged to seek independent legal counsel.</li>
        </ol>
        <SignatureMarker label="Buyer/Assignee Signature — Investor Disclosure" mode={mode} />
      </PageWrapper>

      <PageWrapper pageNum={5} total={totalPages}>
        <PageHeader title="NOTICES & DISCLOSURES" />
        <h4 className="font-bold mt-2 mb-2">NOTICE OF NON-REPRESENTATION</h4>
        <p className="text-sm leading-relaxed">You are hereby notified that Klose LLC and its members, managers, and employees do not represent you in any capacity as a real estate broker or agent. You should not assume that any representative of Klose LLC represents your interests unless you separately engage a licensed real estate agent or attorney.</p>
        <SignatureMarker label="Buyer/Assignee Signature — Non-Representation" mode={mode} />
        <Separator className="my-6" />
        <h4 className="font-bold mt-2 mb-2">FAIR HOUSING STATEMENT</h4>
        <p className="text-sm leading-relaxed">It is illegal discrimination under the Federal Fair Housing Law, 42 U.S.C.A. 3601 to take any actions because of race, color, religion, sex, disability, familial status, or national origin.</p>
        <h4 className="font-bold mt-4 mb-2">AFFILIATED BUSINESS DISCLOSURE</h4>
        <p className="text-sm leading-relaxed">Klose LLC and/or its affiliated companies may have relationships with certain service providers. You are NOT required to use any specific provider as a condition of your purchase or sale.</p>
      </PageWrapper>

      <PageWrapper pageNum={6} total={totalPages}>
        <p className="text-sm leading-relaxed">By signing below, I/We acknowledge receipt of the Fair Housing Statement and the Affiliated Business Disclosure.</p>
        <SignatureMarker label="Buyer/Assignee Signature — Fair Housing" mode={mode} />
      </PageWrapper>
    </>
  );
}

// ─── AMENDMENT PAGES ───
function AmendmentPages({ d, mode }: { d: Record<string, string>; mode?: 'view' | 'signing' }) {
  const totalPages = 2;
  return (
    <>
      <PageWrapper pageNum={1} total={totalPages}>
        <PageHeader showEIN={false} />
        <h3 className="text-center text-lg font-bold mb-6">AMENDMENT TO PURCHASE AND SALE AGREEMENT</h3>
        <div className="text-sm space-y-2 mb-4">
          <p>Buyer: Klose LLC, a Wyoming Limited Liability Company</p>
          <p>Seller: <V k="seller_name" data={d} /></p>
          <p>Property: <V k="property_address" data={d} /></p>
        </div>
        <p className="text-sm leading-relaxed">In consideration of the mutual covenants herein and other good and valuable consideration, the receipt and sufficiency of which is hereby acknowledged, the parties agree to amend that certain Purchase and Sale Agreement with a Binding Agreement Date of <V k="binding_agreement_date" data={d} /> and any incorporated addenda, exhibits, or prior amendments (collectively referred to herein as "Agreement") for the purchase and sale of the real property specified above as follows:</p>
        <h4 className="font-bold mt-6 mb-2">Amendment 1 – Purchase Price:</h4>
        <p className="text-sm leading-relaxed">Buyer & Seller hereby mutually agree to amend the purchase price to: $ <V k="new_purchase_price" data={d} /></p>
        <h4 className="font-bold mt-4 mb-2">Amendment 2 – Closing / Expiration / Due Diligence Date:</h4>
        <p className="text-sm leading-relaxed">Buyer & Seller hereby mutually agree to amend the closing, contract expiration, and due diligence date to: <V k="new_closing_date" data={d} /></p>
        <h4 className="font-bold mt-4 mb-2">Amendment 3 – Additional Terms (if applicable):</h4>
        <p className="text-sm leading-relaxed">{d.additional_terms || '______________________________________________________________________'}</p>
        <p className="text-sm leading-relaxed mt-4">This Amendment shall become binding when signed by all parties and shall be incorporated into the Agreement. All other terms and conditions of the Purchase and Sale Agreement shall remain in full force and effect.</p>
        <DualSignatureMarker leftLabel="BUYER Signature" rightLabel="BUYER (2nd, if applicable)" leftPrint="Klose LLC / Authorized Signatory" rightPrint="Printed Name / Title" mode={mode} />
      </PageWrapper>

      <PageWrapper pageNum={2} total={totalPages}>
        <p className="text-sm mb-4">The party(ies) below have signed and acknowledge receipt of a copy.</p>
        <DualSignatureMarker leftLabel="SELLER Signature" rightLabel="SELLER (2nd, if applicable)" leftPrint="Seller Printed Name" rightPrint="Printed Name" mode={mode} />
      </PageWrapper>
    </>
  );
}

export default function ContractPageViewer({ contractType, data, mode = 'view' }: ContractPageViewerProps) {
  return (
    <div className="space-y-6">
      {contractType === 'AB' && <ABPages d={data} mode={mode} />}
      {contractType === 'BC' && <BCPages d={data} mode={mode} />}
      {contractType === 'AMENDMENT' && <AmendmentPages d={data} mode={mode} />}
    </div>
  );
}
