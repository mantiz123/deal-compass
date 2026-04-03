import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { useProfile } from '@/hooks/useProfile';
import {
  CONTRACT_TEMPLATES,
  getFieldsForType,
  autoFillFields,
} from '@/lib/contractTemplates';
import { ArrowLeft, CheckCircle, FileText, Loader2, Send, Save, Eye, PenTool } from 'lucide-react';
import SigningWizard, { type SignablePage } from '@/components/contracts/SigningWizard';
import {
  ABPage,
  getABKloseSignablePages,
  getBCKloseSignablePages,
  getAmendmentKloseSignablePages,
} from '@/components/contracts/ContractPageViewer';

type Step = 'select' | 'fill' | 'klose_sign' | 'send';

export default function ContractNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const leadId = searchParams.get('lead_id');
  const { data: profile } = useProfile();

  const [step, setStep] = useState<Step>('select');
  const [contractType, setContractType] = useState<'AB' | 'BC' | 'AMENDMENT' | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [kloseSignatures, setKloseSignatures] = useState<Record<number, string>>({});

  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  // Load lead data
  useEffect(() => {
    if (!leadId) { setLoading(false); return; }
    const fetchLead = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, property:properties(*)')
        .eq('id', leadId)
        .single();
      if (!error && data) setLead(data as any);
      setLoading(false);
    };
    fetchLead();
  }, [leadId]);

  const fields = useMemo(() => contractType ? getFieldsForType(contractType) : [], [contractType]);

  // Auto-fill when contract type is selected
  useEffect(() => {
    if (contractType && lead) {
      const autoValues = autoFillFields(fields, lead);
      setFormValues(prev => ({ ...autoValues, ...prev }));
    }
  }, [contractType, lead, fields]);

  const handleSelectType = (type: 'AB' | 'BC' | 'AMENDMENT') => {
    setContractType(type);
    setFormValues({});
    setStep('fill');
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!contractType || !leadId) return;
    setGenerating(true);
    try {
      // Create contract in DB
      const result = await createContract.mutateAsync({
        lead_id: leadId,
        contract_type: contractType,
        contract_data: formValues,
        seller_email: formValues.seller_email,
        seller_phone: formValues.seller_phone,
      });

      setCreatedContractId(result.id);

      // Generate PDF via edge function
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-contract-pdf', {
        body: {
          contractId: result.id,
          contractType: contractType,
          contractData: formValues,
          leadId,
        },
      });

      if (pdfError) throw pdfError;

      if (pdfData?.pdfUrl) {
        setPdfUrl(pdfData.pdfUrl);
        await updateContract.mutateAsync({
          id: result.id,
          pdf_url: pdfData.pdfUrl,
        });
      }

      // Go to Klose signing step
      setStep('klose_sign');
      toast({ title: 'Contrato Creado', description: 'Ahora firma como representante de Klose LLC antes de enviar al seller.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleKloseSignComplete = async (signatures: Record<number, string>) => {
    setKloseSignatures(signatures);

    if (!createdContractId) return;

    try {
      const repName = profile?.full_name || 'Klose LLC Representative';

      // Store Klose rep signatures
      const sigInserts = Object.entries(signatures).map(([pageNum, sig]) => ({
        contract_id: createdContractId,
        signer_name: repName,
        signer_email: 'contracts@klosellc.com',
        signature_image: sig,
        ip_address: '',
        user_agent: `Klose Rep | Page ${pageNum}`,
      }));

      const { error: sigError } = await supabase.from('contract_signatures').insert(sigInserts);
      if (sigError) throw sigError;

      toast({ title: '✅ Firmado', description: `${Object.keys(signatures).length} firma(s) de Klose LLC registradas.` });
      setStep('send');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const buildKloseWizardPages = (): SignablePage[] => {
    if (!contractType) return [];
    const pageInfos = contractType === 'AB'
      ? getABKloseSignablePages()
      : contractType === 'BC'
        ? getBCKloseSignablePages()
        : getAmendmentKloseSignablePages();

    return pageInfos.map(info => ({
      pageNum: info.pageNum,
      title: info.title,
      requiresSignature: info.requiresSignature,
      signatureLabel: info.signatureLabel,
      content: <ABPage pageNum={info.pageNum} d={formValues} mode="signing" contractType={contractType} />,
    }));
  };

  const handleSendEmail = async () => {
    if (!createdContractId || !formValues.seller_email) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contract-email', {
        body: { contractId: createdContractId },
      });
      if (error) throw error;
      toast({ title: '📧 Enviado', description: 'El email con el enlace de firma ha sido enviado.' });
      navigate('/contracts');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = () => {
    toast({ title: 'Guardado', description: 'Contrato guardado como borrador.' });
    navigate('/contracts');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const stepOrder: Step[] = ['select', 'fill', 'klose_sign', 'send'];
  const currentStepIdx = stepOrder.indexOf(step);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Generar Contrato</h1>
            {lead && (
              <p className="text-muted-foreground">
                {(lead as any).property?.address}, {(lead as any).property?.city}
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {(['select', 'fill', 'klose_sign', 'send'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                currentStepIdx > i ? 'bg-green-500/20 text-green-400' :
                'bg-muted text-muted-foreground'
              }`}>
                {currentStepIdx > i ? '✓' : i + 1}
              </div>
              {i < 3 && <div className="w-12 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Type */}
        {step === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CONTRACT_TEMPLATES.map((template) => (
              <Card
                key={template.type}
                variant="interactive"
                className="cursor-pointer hover:border-primary/50"
                onClick={() => handleSelectType(template.type)}
              >
                <CardHeader>
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Fill Fields */}
        {step === 'fill' && contractType && (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {CONTRACT_TEMPLATES.find(t => t.type === contractType)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <Label className="flex items-center gap-2 mb-1">
                        {field.label}
                        {field.source === 'auto' && formValues[field.key] && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                            ✓ Auto
                          </Badge>
                        )}
                        {field.source === 'manual' && !formValues[field.key] && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                            Manual
                          </Badge>
                        )}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={formValues[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.label}
                          rows={3}
                        />
                      ) : field.type === 'select' && field.options ? (
                        <Select
                          value={formValues[field.key] || ''}
                          onValueChange={(v) => handleFieldChange(field.key, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Seleccionar ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          value={formValues[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep('select'); setContractType(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  <><PenTool className="h-4 w-4 mr-2" /> Generar y Firmar como Klose</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Klose Representative Signing */}
        {step === 'klose_sign' && contractType && (
          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <PenTool className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Firma del Representante de Klose LLC</p>
                    <p className="text-sm text-muted-foreground">
                      Firmando como: <strong>{profile?.full_name || 'Representante Klose'}</strong> — Revisa cada página y firma en los bloques correspondientes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SigningWizard
              pages={buildKloseWizardPages()}
              signerName={profile?.full_name || 'Klose LLC Representative'}
              onComplete={handleKloseSignComplete}
              onBack={() => setStep('fill')}
            />
          </div>
        )}

        {/* Step 4: Send */}
        {step === 'send' && (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Contrato Firmado por Klose — Listo para Enviar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-sm text-green-400 font-medium">
                    ✅ {Object.keys(kloseSignatures).length} firma(s) de Klose LLC registradas. El seller recibirá el contrato para contrafirmar.
                  </p>
                </div>

                {pdfUrl && (
                  <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank')}>
                    <Eye className="h-4 w-4 mr-2" /> Vista Previa del PDF
                  </Button>
                )}

                <Separator />

                <div className="space-y-3">
                  <div>
                    <Label>Email del Vendedor</Label>
                    <Input
                      type="email"
                      value={formValues.seller_email || ''}
                      onChange={(e) => handleFieldChange('seller_email', e.target.value)}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Teléfono del Vendedor</Label>
                    <Input
                      type="tel"
                      value={formValues.seller_phone || ''}
                      onChange={(e) => handleFieldChange('seller_phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-2" /> Guardar como Borrador
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sending || !formValues.seller_email}
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> 📧 Enviar al Seller</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}