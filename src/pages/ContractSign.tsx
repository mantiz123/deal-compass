import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { ABPage, getABSignablePages, getBCSignablePages, getAmendmentSignablePages, type KloseSignatureData } from '@/components/contracts/ContractPageViewer';
import SellerInfoForm from '@/components/contracts/SellerInfoForm';
import SigningWizard, { type SignablePage } from '@/components/contracts/SigningWizard';
import kloseLogo from '@/assets/klose-logo.png';

type FlowStep = 'loading' | 'expired' | 'already_signed' | 'seller_info' | 'signing' | 'confirming' | 'success' | 'error';

export default function ContractSign() {
  const { token } = useParams<{ token: string }>();

  const [flowStep, setFlowStep] = useState<FlowStep>('loading');
  const [contract, setContract] = useState<any>(null);
  const [contractData, setContractData] = useState<Record<string, string>>({});
  const [pageSignatures, setPageSignatures] = useState<Record<number, string>>({});
  const [kloseSignatures, setKloseSignatures] = useState<KloseSignatureData[]>([]);
  const [agreeBinding, setAgreeBinding] = useState(false);
  const [agreeRead, setAgreeRead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setFlowStep('error'); return; }
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, lead:leads(id, property:properties(address, city, state, county, owner_name, owner_phone, owner_email))')
        .eq('signing_token', token)
        .single();

      if (error || !data) { setFlowStep('expired'); return; }
      if (data.status === 'signed' || data.status === 'completed') { setFlowStep('already_signed'); return; }

      const created = new Date(data.created_at);
      const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) { setFlowStep('expired'); return; }

      setContract(data);
      setContractData((data.contract_data as Record<string, string>) || {});

      if (!data.viewed_at) {
        let ip = '';
        try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch {}
        await supabase.from('contracts').update({ viewed_at: new Date().toISOString(), ip_address: ip, status: 'viewed' as any }).eq('id', data.id);
      }

      // Fetch Klose rep signatures to display to seller
      const { data: existingSigs } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('contract_id', data.id)
        .like('user_agent', 'Klose Rep%');
      
      if (existingSigs && existingSigs.length > 0) {
        const parsed: KloseSignatureData[] = existingSigs.map(sig => {
          const pageMatch = sig.user_agent?.match(/Page (\d+)/);
          return {
            pageNum: pageMatch ? parseInt(pageMatch[1]) : 0,
            signerName: sig.signer_name,
            signatureImage: sig.signature_image || '',
            signedAt: sig.signed_at,
          };
        });
        setKloseSignatures(parsed);
      }

      // For AB contracts, go to seller info first; for BC/others, go straight to signing
      if (data.contract_type === 'AB') {
        setFlowStep('seller_info');
      } else {
        setFlowStep('signing');
      }
    } catch { setFlowStep('error'); }
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
      let ip = '';
      try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch {}

      const isBC = contract.contract_type === 'BC';
      const signerName = isBC
        ? (contractData.assignee_name || '')
        : (contractData.seller_name || '');

      // Insert all page signatures
      const sigInserts = Object.entries(pageSignatures).map(([pageNum, sig]) => ({
        contract_id: contract.id,
        signer_name: signerName,
        signer_email: contract.seller_email,
        signature_image: sig,
        ip_address: ip,
        user_agent: `${navigator.userAgent} | Page ${pageNum}`,
      }));

      const { error: sigError } = await supabase.from('contract_signatures').insert(sigInserts);
      if (sigError) throw sigError;

      // Update contract with seller form data merged
      await supabase.from('contracts').update({
        status: 'signed' as any,
        signed_at: new Date().toISOString(),
        ip_address: ip,
        contract_data: contractData as any,
      }).eq('id', contract.id);

      // Generate signed PDF synchronously so the download link works
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const pdfRes = await fetch(`${supabaseUrl}/functions/v1/generate-signed-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
          },
          body: JSON.stringify({ contractId: contract.id }),
        });
        if (pdfRes.ok) {
          const pdfData = await pdfRes.json();
          if (pdfData.signedPdfUrl) {
            setContract((prev: any) => ({ ...prev, signed_pdf_url: pdfData.signedPdfUrl }));
          }
        }
      } catch (e) {
        console.error('Signed PDF generation request failed:', e);
      }

      setFlowStep('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setFlowStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Build signable pages for the wizard — AB uses individual page renderer
  const buildWizardPages = (): SignablePage[] => {
    const type = contract?.contract_type;
    const pageInfos = type === 'AB' ? getABSignablePages() : type === 'BC' ? getBCSignablePages() : getAmendmentSignablePages();

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

  // Status screens
  if (flowStep === 'loading') return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  if (flowStep === 'expired') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Link Expired</h2><p className="text-muted-foreground">This signing link has expired or is no longer valid. Please contact Klose LLC for a new link.</p></div></div>;
  if (flowStep === 'already_signed') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Already Signed</h2><p className="text-muted-foreground">This document has already been signed. Thank you!</p></div></div>;

  if (flowStep === 'success') return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-md mx-auto mt-20 text-center p-6">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">✅ Thank You!</h2>
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
              const addr = (contractData.property_address || 'Property').replace(/[^a-zA-Z0-9]/g, '_');
              a.download = `Signed_Contract_${addr}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            } catch {
              window.open(url, '_blank');
            }
          }}>
            <FileText className="h-4 w-4 mr-2" /> Download Signed Contract
          </Button>
        )}
        <p className="text-xs text-muted-foreground">You may close this window.</p>
      </div>
    </div>
  );

  if (flowStep === 'error') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Error</h2><p className="text-muted-foreground">{errorMsg || 'Something went wrong. Please try again or contact Klose LLC.'}</p></div></div>;

  const property = (contract?.lead as any)?.property;
  // Fallback to contract_data when property join fails (anon user, no RLS on leads/properties)
  const propAddress = property?.address || contractData.property_address || '';
  const propCity = property?.city || contractData.property_city || '';
  const propState = property?.state || contractData.property_state || '';

  // Step 1: Seller Info Form (AB only)
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
              <p className="text-xs text-muted-foreground mt-1">Step 1 of 3 — Please fill out your information first, then review and sign each page.</p>
            </CardContent>
          </Card>
          <SellerInfoForm initialData={contractData} onComplete={handleSellerInfoComplete} />
        </div>
      </div>
    );
  }

  // Step 2: Page-by-page signing wizard
  if (flowStep === 'signing') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto p-4 space-y-4 mt-4">
          <SigningWizard
            pages={buildWizardPages()}
            signerName={contract?.contract_type === 'BC' ? (contractData.assignee_name || '') : (contractData.seller_name || '')}
            onComplete={handleSigningComplete}
            onBack={() => contract?.contract_type === 'AB' ? setFlowStep('seller_info') : null}
          />
        </div>
      </div>
    );
  }

  // Step 3: Final confirmation
  if (flowStep === 'confirming') {
    const totalSigs = Object.keys(pageSignatures).length;
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto p-4 space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">✅ Review & Confirm Submission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">{propAddress}, {propCity}, {propState}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Signer</p>
                <p className="font-medium">{contract?.contract_type === 'BC' ? contractData.assignee_name : contractData.seller_name}</p>
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
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating signed PDF...</> : `✅ Submit All ${totalSigs} Signatures`}
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
