import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertTriangle, FileText, Eraser, ChevronDown, ChevronUp } from 'lucide-react';
import ContractPageViewer from '@/components/contracts/ContractPageViewer';
import kloseLogo from '@/assets/klose-logo.png';

type PageState = 'loading' | 'expired' | 'already_signed' | 'signing' | 'confirming' | 'success' | 'error';

export default function ContractSign() {
  const { token } = useParams<{ token: string }>();
  const sigRef = useRef<SignatureCanvas | null>(null);
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [contract, setContract] = useState<any>(null);
  const [signerName, setSignerName] = useState('');
  const [agreeBinding, setAgreeBinding] = useState(false);
  const [agreeRead, setAgreeRead] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showContract, setShowContract] = useState(true);

  useEffect(() => {
    if (!token) { setPageState('error'); return; }
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, lead:leads(id, property:properties(address, city, state, county, owner_name))')
        .eq('signing_token', token)
        .single();

      if (error || !data) { setPageState('expired'); return; }
      if (data.status === 'signed' || data.status === 'completed') { setPageState('already_signed'); return; }

      const created = new Date(data.created_at);
      const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) { setPageState('expired'); return; }

      setContract(data);
      const property = (data.lead as any)?.property;
      setSignerName(property?.owner_name || '');

      if (!data.viewed_at) {
        let ip = '';
        try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch {}
        await supabase.from('contracts').update({ viewed_at: new Date().toISOString(), ip_address: ip, status: 'viewed' as any }).eq('id', data.id);
      }
      setPageState('signing');
    } catch { setPageState('error'); }
  };

  const handleClearSignature = () => { sigRef.current?.clear(); setSignatureData(null); };

  const handleSaveSignature = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setSignatureData(sigRef.current.toDataURL('image/png'));
      setPageState('confirming');
    }
  };

  const handleSubmit = async () => {
    if (!contract || !signatureData || !signerName) return;
    setSubmitting(true);
    try {
      let ip = '';
      try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch {}

      const { error: sigError } = await supabase.from('contract_signatures').insert({
        contract_id: contract.id, signer_name: signerName, signer_email: contract.seller_email,
        signature_image: signatureData, ip_address: ip, user_agent: navigator.userAgent,
      });
      if (sigError) throw sigError;

      await supabase.from('contracts').update({ status: 'signed' as any, signed_at: new Date().toISOString(), ip_address: ip }).eq('id', contract.id);
      setPageState('success');
    } catch (err: any) { setErrorMsg(err.message); setPageState('error'); } finally { setSubmitting(false); }
  };

  const Header = () => (
    <div className="bg-[#0a0a14] border-b border-border/50 p-4 flex items-center justify-center gap-3 sticky top-0 z-10">
      <img src={kloseLogo} alt="Klose LLC" className="h-8 w-8" />
      <span className="text-lg font-bold text-white">KLOSE LLC</span>
    </div>
  );

  // Status screens
  if (pageState === 'loading') return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  if (pageState === 'expired') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Link Expired</h2><p className="text-muted-foreground">This signing link has expired or is no longer valid. Please contact Klose LLC for a new link.</p></div></div>;
  if (pageState === 'already_signed') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Already Signed</h2><p className="text-muted-foreground">This document has already been signed. Thank you!</p></div></div>;
  if (pageState === 'success') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">✅ Thank You!</h2><p className="text-muted-foreground mb-4">Your documents have been signed successfully. Klose LLC will be in touch shortly.</p><p className="text-xs text-muted-foreground">You may close this window.</p></div></div>;
  if (pageState === 'error') return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto mt-20 text-center p-6"><AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Error</h2><p className="text-muted-foreground">{errorMsg || 'Something went wrong. Please try again or contact Klose LLC.'}</p></div></div>;

  const property = (contract?.lead as any)?.property;
  const contractData = (contract?.contract_data as Record<string, string>) || {};

  // Confirmation screen
  if (pageState === 'confirming') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto p-4 space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Review & Confirm</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">{property?.address}, {property?.city}, {property?.state}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Signer</p>
                <p className="font-medium">{signerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Signature</p>
                <div className="bg-white rounded-lg p-2 inline-block">
                  <img src={signatureData!} alt="Signature" className="h-20" />
                </div>
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
                <Button variant="outline" className="flex-1" onClick={() => { setPageState('signing'); setSignatureData(null); }}>Go Back</Button>
                <Button className="flex-1" disabled={!agreeBinding || !agreeRead || submitting} onClick={handleSubmit}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : '✅ Submit Signatures'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Signing screen with inline contract viewer
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto p-4 space-y-6 mt-4">
        {/* Contract info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {contract?.contract_type === 'AB' ? 'Purchase and Sale Agreement' : contract?.contract_type === 'BC' ? 'Assignment Agreement' : 'Amendment to Purchase and Sale'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-medium">{property?.address}</p>
              <p className="text-sm text-muted-foreground">{property?.city}, {property?.state}</p>
            </div>
          </CardContent>
        </Card>

        {/* Inline Contract Document Viewer */}
        <div>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between mb-3 text-base font-semibold"
            onClick={() => setShowContract(!showContract)}
          >
            <span>📄 Contract Documents ({contract?.contract_type === 'AB' ? '11 pages' : contract?.contract_type === 'BC' ? '6 pages' : '2 pages'})</span>
            {showContract ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>

          {showContract && (
            <ContractPageViewer
              contractType={contract?.contract_type}
              data={contractData}
            />
          )}
        </div>

        {/* Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign Below</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Full Legal Name</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Enter your full legal name" />
            </div>
            <div>
              <Label className="mb-2 block">Draw Your Signature</Label>
              <div className="border-2 border-dashed border-border rounded-lg bg-white overflow-hidden touch-none">
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{ className: 'w-full h-[200px]', style: { width: '100%', height: '200px' } }}
                  penColor="#000000"
                  backgroundColor="#ffffff"
                />
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={handleClearSignature}>
                <Eraser className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
            <Button className="w-full" size="lg" onClick={handleSaveSignature} disabled={!signerName.trim()}>
              Continue to Review →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
