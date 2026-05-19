import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { ABPage, getABSignablePages, getBCSignablePages, getAmendmentSignablePages, getDCSignablePages, type KloseSignatureData } from '@/components/contracts/ContractPageViewer';
import SellerInfoForm from '@/components/contracts/SellerInfoForm';
import SigningWizard, { type SignablePage } from '@/components/contracts/SigningWizard';
import kloseLogo from '@/assets/klose-logo.png';

type FlowStep = 'loading' | 'expired' | 'already_signed' | 'consent' | 'seller_info' | 'signing' | 'confirming' | 'success' | 'error';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callEdgeFunction(name: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export default function ContractSign() {
  const { token } = useParams<{ token: string }>();

  const [flowStep, setFlowStep] = useState<FlowStep>('loading');
  const [contract, setContract] = useState<any>(null);
  const [contractData, setContractData] = useState<Record<string, string>>({});
  const [pageSignatures, setPageSignatures] = useState<Record<number, string>>({});
  const [kloseSignatures, setKloseSignatures] = useState<KloseSignatureData[]>([]);
  const [agreeBinding, setAgreeBinding] = useState(false);
  const [agreeRead, setAgreeRead] = useState(false);
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [agreeEsign, setAgreeEsign] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState('');
  const [consentIp, setConsentIp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setFlowStep('error'); return; }
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      const { ok, status, data } = await callEdgeFunction('get-contract-for-signing', { token });

      if (!ok) {
        if (data.error === 'already_signed') { setFlowStep('already_signed'); return; }
        setFlowStep(status === 409 ? 'already_signed' : 'expired');
        return;
      }

      setContract(data.contract);
      setContractData((data.contract.contract_data as Record<string, string>) || {});

      // Parse Klose pre-signatures (handle both old "Klose Rep | Page X" and new JSON formats)
      const parsed: KloseSignatureData[] = (data.kloseSignatures || []).map((sig: any) => {
        let pageNum = 0;
        try {
          const ua = JSON.parse(sig.user_agent || '{}');
          pageNum = ua.page || 0;
        } catch {
          const m = sig.user_agent?.match(/Page\s+(\d+)/);
          if (m) pageNum = parseInt(m[1]);
        }
        return { pageNum, signerName: sig.signer_name, signatureImage: sig.signature_image || '', signedAt: sig.signed_at };
      });
      setKloseSignatures(parsed);

      setFlowStep('consent');
    } catch { setFlowStep('error'); }
  };

  const handleConsentAccept = () => {
    const ts = new Date().toISOString();
    setConsentTimestamp(ts);
    // Best-effort client-side IP (server also captures via CF/X-Forwarded-For headers)
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json()).then(d => setConsentIp(d.ip)).catch(() => {});
    if (contract?.contract_type === 'AB') setFlowStep('seller_info');
    else setFlowStep('signing');
  };

  const handleSellerInfoComplete = (sellerData: Record<string, string>) => {
    setContractData(prev => ({ ...prev, ...sellerData }));
    setFlowStep('signing');
  };

  const handleSigningComplete = (signatures: Record<number, string>) => {
    setPageSignatures(signatures);
    setFlowStep('confirming');
  };

  const handleSubmit = async () => {
    if (!contract) return;
    setSubmitting(true);
    try {
      const isDC = contract.contract_type === 'DC';
      const isBC = contract.contract_type === 'BC';
      const signerName = isDC
        ? (contractData.buyer_name || '')
        : isBC
        ? (contractData.assignee_name || '')
        : (contractData.seller_name || '');

      const browserData = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const { ok, data } = await callEdgeFunction('submit-contract-signing', {
        token: contract.signing_token,
        signatures: pageSignatures,
        contractData,
        signerName,
        consentData: {
          timestamp: consentTimestamp,
          ip: consentIp,
          esign_act: true,
          ueta_alabama: true,
          ...browserData,
        },
        browserData,
      });

      if (!ok) throw new Error(data.error || 'Submission failed');

      if (data.signedPdfUrl) {
        setContract((prev: any) => ({ ...prev, signed_pdf_url: data.signedPdfUrl }));
      }
      setFlowStep('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setFlowStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const buildWizardPages = (): SignablePage[] => {
    const type = contract?.contract_type;
    const pageInfos = type === 'AB'
      ? getABSignablePages()
      : type === 'BC'
      ? getBCSignablePages()
      : type === 'DC'
      ? getDCSignablePages()
      : getAmendmentSignablePages();

    return pageInfos.map(info => ({
      pageNum: info.pageNum,
      title: info.title,
      requiresSignature: info.requiresSignature,
      signatureLabel: info.signatureLabel,
      content: <ABPage pageNum={info.pageNum} d={contractData} mode="signing" contractType={type} kloseSignatures={kloseSignatures} />,
    }));
  };

  const Header = () => (
    <div className="bg-[#0a0a14] border-b border-border/50 p-4 flex items-center justify-center gap-3 sticky top-0 z-10">
      <img src={kloseLogo} alt="Klose LLC" className="h-8 w-8" />
      <span className="text-lg font-bold text-white">KLOSE LLC</span>
    </div>
  );

  if (flowStep === 'loading') return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  if (flowStep === 'expired') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">Link Expired</h2><p className="text-muted-foreground">This signing link has expired or is no longer valid. Please contact Klose LLC for a new link.</p></div></div>;
  if (flowStep === 'already_signed') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">Already Signed</h2><p className="text-muted-foreground">This document has already been signed. Thank you!</p></div></div>;

  if (flowStep === 'success') return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-md mx-auto mt-20 text-center p-6">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Thank You!</h2>
        <p className="text-muted-foreground mb-4">Your documents have been signed successfully. Klose LLC will be in touch shortly.</p>
        {(contract?.signed_pdf_url || contract?.pdf_url) && (
          <Button variant="outline" className="mb-4" onClick={async () => {
            const url = contract.signed_pdf_url || contract.pdf_url;
            try {
              const res = await fetch(url);
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = `Signed_Contract_${(contractData.property_address || 'Property').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            } catch { window.open(url, '_blank'); }
          }}>
            <FileText className="h-4 w-4 mr-2" /> Download Signed Contract
          </Button>
        )}
        <p className="text-xs text-muted-foreground">You may close this window.</p>
      </div>
    </div>
  );

  if (flowStep === 'error') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">Error</h2><p className="text-muted-foreground">{errorMsg || 'Something went wrong. Please try again or contact Klose LLC.'}</p></div></div>;

  const property = (contract?.lead as any)?.property;
  const propAddress = property?.address || contractData.property_address || '';
  const propCity = property?.city || contractData.property_city || '';
  const propState = property?.state || contractData.property_state || '';

  // ESIGN/UETA Consent Step
  if (flowStep === 'consent') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto p-4 space-y-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Electronic Signature Consent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-3 leading-relaxed">
                <p className="font-semibold text-foreground">Before signing, please read and agree to the following:</p>
                <p className="text-muted-foreground">
                  By checking the boxes below, you consent to the use of electronic signatures and records in connection with this real estate transaction, pursuant to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong className="text-foreground">ESIGN Act</strong> — Electronic Signatures in Global and National Commerce Act (15 U.S.C. §7001)</li>
                  <li><strong className="text-foreground">UETA</strong> — Alabama Uniform Electronic Transactions Act (Alabama Code §8-1A-1 et seq.)</li>
                </ul>
                <p className="text-muted-foreground">
                  Your electronic signature has the same legal effect, validity, and enforceability as a handwritten wet-ink signature.
                </p>
                <div className="rounded bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-yellow-700 dark:text-yellow-400 text-xs">
                  <strong>Paper Alternative:</strong> You have the right to receive paper copies. If you prefer to sign on paper, do not proceed — contact Klose LLC at <a href="mailto:info@goklose.com" className="underline">info@goklose.com</a>.
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox id="consent-esign" checked={agreeConsent} onCheckedChange={(v) => setAgreeConsent(v === true)} />
                  <Label htmlFor="consent-esign" className="text-sm leading-snug cursor-pointer">
                    I consent to the use of electronic signatures under the ESIGN Act (15 U.S.C. §7001) and Alabama UETA (§8-1A-1). I understand my electronic signature is legally binding.
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="consent-paper" checked={agreeEsign} onCheckedChange={(v) => setAgreeEsign(v === true)} />
                  <Label htmlFor="consent-paper" className="text-sm leading-snug cursor-pointer">
                    I have been informed of my right to receive paper copies and I voluntarily choose to proceed electronically.
                  </Label>
                </div>
              </div>

              <Button className="w-full" disabled={!agreeConsent || !agreeEsign} onClick={handleConsentAccept}>
                Continue to Sign Documents →
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Your consent will be recorded with your IP address, device info, and timestamp as required by law.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Seller Info Form (AB only)
  if (flowStep === 'seller_info') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto p-4 space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Purchase and Sale Agreement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Property: <strong>{propAddress}, {propCity}, {propState}</strong></p>
              <p className="text-xs text-muted-foreground mt-1">Step 1 of 3 — Please fill out your information, then review and sign each page.</p>
            </CardContent>
          </Card>
          <SellerInfoForm initialData={contractData} onComplete={handleSellerInfoComplete} />
        </div>
      </div>
    );
  }

  // Page-by-page signing wizard
  if (flowStep === 'signing') {
    const signerName = contract?.contract_type === 'DC'
      ? (contractData.buyer_name || '')
      : contract?.contract_type === 'BC'
      ? (contractData.assignee_name || '')
      : (contractData.seller_name || '');

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto p-4 space-y-4 mt-4">
          <SigningWizard
            pages={buildWizardPages()}
            signerName={signerName}
            onComplete={handleSigningComplete}
            onBack={() => contract?.contract_type === 'AB' ? setFlowStep('seller_info') : null}
          />
        </div>
      </div>
    );
  }

  // Final confirmation
  if (flowStep === 'confirming') {
    const totalSigs = Object.keys(pageSignatures).length;
    const signerName = contract?.contract_type === 'DC'
      ? contractData.buyer_name
      : contract?.contract_type === 'BC'
      ? contractData.assignee_name
      : contractData.seller_name;

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto p-4 space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Review & Confirm Submission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">{propAddress}, {propCity}, {propState}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Signer</p>
                <p className="font-medium">{signerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Signatures Collected</p>
                <p className="font-medium text-green-600">{totalSigs} page(s) signed</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pageSignatures).map(([pageNum, sig]) => (
                  <div key={pageNum} className="bg-white rounded border p-1.5">
                    <img src={sig} alt={`Page ${pageNum}`} className="h-10" />
                    <p className="text-[10px] text-center text-muted-foreground">Pg {pageNum}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox id="agree-binding" checked={agreeBinding} onCheckedChange={(v) => setAgreeBinding(v === true)} />
                  <Label htmlFor="agree-binding" className="text-sm leading-tight cursor-pointer">I agree that my electronic signature is legally binding</Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="agree-read" checked={agreeRead} onCheckedChange={(v) => setAgreeRead(v === true)} />
                  <Label htmlFor="agree-read" className="text-sm leading-tight cursor-pointer">I have read and understand all documents</Label>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setFlowStep('signing'); setPageSignatures({}); }}>Go Back</Button>
                <Button className="flex-1" disabled={!agreeBinding || !agreeRead || submitting} onClick={handleSubmit}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating signed PDF...</> : `Submit ${totalSigs} Signature(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
