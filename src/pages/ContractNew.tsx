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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateContract, useUpdateContract, useContractsForLead } from '@/hooks/useContracts';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import {
  CONTRACT_TEMPLATES,
  getFieldsForType,
  autoFillFields,
} from '@/lib/contractTemplates';
import { ArrowLeft, CheckCircle, FileText, Loader2, Send, Save, Eye, PenTool, Copy, Link, EyeOff, Search, MapPin, TrendingUp } from 'lucide-react';
import SigningWizard, { type SignablePage } from '@/components/contracts/SigningWizard';
import {
  ABPage,
  getABKloseSignablePages,
  getBCKloseSignablePages,
  getAmendmentKloseSignablePages,
  getDCKloseSignablePages,
} from '@/components/contracts/ContractPageViewer';

type Step = 'search_lead' | 'select' | 'select_parent' | 'fill' | 'klose_sign' | 'send';

export default function ContractNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const leadId = searchParams.get('lead_id');
  const { data: profile } = useProfile();

  const [step, setStep] = useState<Step>(searchParams.get('lead_id') ? 'select' : 'search_lead');
  const [contractType, setContractType] = useState<'AB' | 'BC' | 'AMENDMENT' | 'DC' | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(!!searchParams.get('lead_id'));
  // Lead search state (step 0)
  const [leadSearch, setLeadSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [signingToken, setSigningToken] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [kloseSignatures, setKloseSignatures] = useState<Record<number, string>>({});
  const [kloseSignerName, setKloseSignerName] = useState('');
  const [, setSelectedParentContract] = useState<any>(null);

  const orgId = useCurrentOrgIdSafe();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  // Fetch existing contracts for this lead (for Amendment parent selection)
  const { data: existingContracts } = useContractsForLead(leadId || undefined);

  // Lead search
  useEffect(() => {
    if (leadSearch.trim().length < 2 || !orgId) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const s = leadSearch.trim();
        const { data } = await supabase
          .from('leads')
          .select('id, status, piw_score, property:properties!inner(address, city, state, zip_code, owner_name, mao, arv)')
          .eq('organization_id', orgId)
          .is('archived_at', null)
          .or(`address.ilike.%${s}%,owner_name.ilike.%${s}%,city.ilike.%${s}%,zip_code.ilike.%${s}%`, { referencedTable: 'properties' })
          .order('piw_score', { ascending: false, nullsFirst: false })
          .limit(20);
        setSearchResults(data || []);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [leadSearch, orgId]);
  const abContracts = useMemo(() => 
    (existingContracts || []).filter(c => c.contract_type === 'AB' && c.status !== 'draft'),
    [existingContracts]
  );

  const isBC = contractType === 'BC';
  const isDC = contractType === 'DC';
  const recipientLabel = (isBC || isDC) ? 'Buyer' : 'Seller';

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

  // Set default Klose signer name from profile
  useEffect(() => {
    if (profile?.full_name && !kloseSignerName) {
      setKloseSignerName(profile.full_name);
    }
  }, [profile]);

  const handleSelectLeadFromSearch = async (selectedLead: any) => {
    setLead(selectedLead);
    setStep('select');
  };

  const handleSelectType = (type: 'AB' | 'BC' | 'AMENDMENT' | 'DC') => {
    setContractType(type);
    setFormValues({});
    setSelectedParentContract(null);
    if (type === 'AMENDMENT' && abContracts.length > 0) {
      setStep('select_parent');
    } else {
      setStep('fill');
    }
  };

  const handleSelectParentContract = (contract: any) => {
    setSelectedParentContract(contract);
    const parentData = (contract.contract_data || {}) as Record<string, any>;
    // Auto-fill from the parent AB contract
    const prefill: Record<string, string> = {};
    if (parentData.seller_name) prefill.seller_name = parentData.seller_name;
    if (parentData.property_address) prefill.property_address = parentData.property_address;
    if (contract.created_at) {
      prefill.binding_agreement_date = new Date(contract.created_at).toISOString().split('T')[0];
    }
    if (parentData.sale_price) prefill.new_purchase_price = parentData.sale_price;
    // Also carry over seller contact info
    if (parentData.seller_email || contract.seller_email) prefill.seller_email = parentData.seller_email || contract.seller_email;
    if (parentData.seller_phone || contract.seller_phone) prefill.seller_phone = parentData.seller_phone || contract.seller_phone;
    setFormValues(prev => ({ ...prefill, ...prev, parent_contract_id: contract.id }));
    setStep('fill');
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  // Get the recipient email depending on contract type
  const getRecipientEmail = () => (isBC || isDC) ? formValues.buyer_email : formValues.seller_email;
  const getRecipientPhone = () => (isBC || isDC) ? formValues.buyer_phone : formValues.seller_phone;

  const handleGenerate = async () => {
    if (!contractType || !leadId) return;
    setGenerating(true);
    try {
      const recipientEmail = getRecipientEmail();
      const recipientPhone = getRecipientPhone();

      const result = await createContract.mutateAsync({
        lead_id: leadId,
        contract_type: contractType,
        contract_data: formValues,
        seller_email: recipientEmail,
        seller_phone: recipientPhone,
      });

      setCreatedContractId(result.id);
      setSigningToken(result.signing_token);

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

      setStep('klose_sign');
      toast({ title: 'Contrato Creado', description: `Ahora firma como representante de Klose LLC antes de enviar al ${recipientLabel.toLowerCase()}.` });
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
      const repName = kloseSignerName || profile?.full_name || 'Klose LLC Representative';

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

      toast({ title: 'Firmado', description: `${Object.keys(signatures).length} firma(s) de Klose LLC registradas.` });
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
        : contractType === 'DC'
          ? getDCKloseSignablePages()
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
    const email = getRecipientEmail();
    if (!createdContractId || !email) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contract-email', {
        body: { contractId: createdContractId },
      });
      if (error) throw error;
      toast({ title: 'Enviado', description: `El email con el enlace de firma ha sido enviado al ${recipientLabel.toLowerCase()}.` });
      navigate('/contracts');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (createdContractId) {
      try {
        await updateContract.mutateAsync({
          id: createdContractId,
          status: 'draft' as any,
          seller_email: getRecipientEmail() || null,
          seller_phone: getRecipientPhone() || null,
          contract_data: formValues as any,
        });
      } catch (e) {
        console.error('Error saving draft:', e);
      }
    }
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

  const progressSteps: Step[] = ['search_lead', 'select', 'fill', 'klose_sign', 'send'];
  const currentStepIdx = step === 'select_parent' ? 1 : progressSteps.indexOf(step);
  const displayedSteps = leadId ? progressSteps.slice(1) : progressSteps; // hide search_lead when leadId in URL

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
          {displayedSteps.map((s, i) => {
            const displayIdx = displayedSteps.indexOf(s);
            const activeIdx = leadId ? currentStepIdx - 1 : currentStepIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  progressSteps[currentStepIdx] === s || (step === 'select_parent' && s === 'select') ? 'bg-primary text-primary-foreground' :
                  activeIdx > displayIdx ? 'bg-green-500/20 text-green-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {activeIdx > displayIdx ? '✓' : displayIdx + 1}
                </div>
                {displayIdx < displayedSteps.length - 1 && <div className="w-10 h-0.5 bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Step 0: Lead Search (when no lead_id in URL) */}
        {step === 'search_lead' && (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Seleccionar Lead
                </CardTitle>
                <CardDescription>
                  Busca el lead por dirección o nombre del propietario para pre-llenar los datos del contrato automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Ej: 648 27th St, John Smith, Birmingham..."
                    className="pl-9"
                    autoFocus
                  />
                </div>

                {searching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                  </div>
                )}

                {!searching && leadSearch.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No se encontraron leads con esos términos.
                  </p>
                )}

                <ScrollArea className="max-h-[420px]">
                  <div className="space-y-2">
                    {searchResults.map((result) => {
                      const prop = result.property as any;
                      const piw = result.piw_score ?? 0;
                      const piwColor = piw >= 70 ? 'text-success' : piw >= 40 ? 'text-warning' : 'text-destructive';
                      const dotColor = piw >= 70 ? 'bg-green-500' : piw >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                      return (
                        <Card
                          key={result.id}
                          variant="interactive"
                          className="cursor-pointer hover:border-primary/60 transition-colors"
                          onClick={() => handleSelectLeadFromSearch(result)}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <p className="font-medium text-sm truncate">
                                    {prop?.address || '—'}, {prop?.city}{prop?.zip_code ? ` ${prop.zip_code}` : ''}, {prop?.state}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 ml-5">
                                  <span className="text-xs text-muted-foreground">{prop?.owner_name || 'Sin nombre'}</span>
                                  {prop?.mao > 0 && (
                                    <span className="text-xs text-muted-foreground">MAO: <span className="text-foreground font-medium">${Number(prop.mao).toLocaleString()}</span></span>
                                  )}
                                  {prop?.arv > 0 && (
                                    <span className="text-xs text-muted-foreground">ARV: ${Number(prop.arv).toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs capitalize">{result.status?.replace(/_/g, ' ')}</Badge>
                                <div className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full shrink-0 ${piw > 0 ? dotColor : 'bg-muted'}`} />
                                  <div className="flex items-center gap-0.5">
                                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                    <span className={`text-xs font-bold ${piw > 0 ? piwColor : 'text-muted-foreground'}`}>
                                      {piw > 0 ? piw : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>

                {leadSearch.trim().length < 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Escribe al menos 2 caracteres — busca por dirección, ciudad, ZIP o nombre del propietario.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Step 1b: Select Parent AB Contract (for Amendments) */}
        {step === 'select_parent' && (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔄 Seleccionar Contrato AB a Modificar
                </CardTitle>
                <CardDescription>
                  El Amendment modifica un contrato AB existente. Selecciona cuál contrato deseas enmendar para pre-llenar los datos automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {abContracts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="font-medium">No hay contratos AB firmados para este lead</p>
                    <p className="text-sm mt-1">Puedes crear un Amendment sin contrato padre, pero deberás llenar todos los campos manualmente.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setStep('fill')}>
                      Continuar sin contrato padre
                    </Button>
                  </div>
                ) : (
                  abContracts.map((c) => {
                    const cd = (c.contract_data || {}) as Record<string, any>;
                    return (
                      <Card
                        key={c.id}
                        variant="interactive"
                        className="cursor-pointer hover:border-primary/50"
                        onClick={() => handleSelectParentContract(c)}
                      >
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{cd.property_address || 'Sin dirección'}</p>
                            <p className="text-xs text-muted-foreground">
                              Seller: {cd.seller_name || '—'} · Precio: ${cd.sale_price ? Number(cd.sale_price).toLocaleString() : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Creado: {new Date(c.created_at).toLocaleDateString('es')}
                            </p>
                          </div>
                          <Badge variant={c.status === 'signed' ? 'default' : 'outline'} className="text-xs">
                            {c.status === 'signed' ? '✅ Firmado' : c.status === 'sent' ? '📤 Enviado' : c.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => { setStep('select'); setContractType(null); }}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
            </Button>
          </div>
        )}

        {step === 'fill' && contractType && (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {CONTRACT_TEMPLATES.find(t => t.type === contractType)?.name}
                </CardTitle>
                {isBC && (
                  <CardDescription className="text-purple-400">
                    Este contrato se envía al Buyer/Assignee para que firme. Klose actúa como Assignor.
                  </CardDescription>
                )}
                {isDC && (
                  <CardDescription className="text-teal-400">
                    Double Close: dos cierres simultáneos el mismo día. A→B: Seller vende a Klose (precio CONFIDENCIAL). B→C: Klose vende al End Buyer. El documento se envía al End Buyer para firmar.
                  </CardDescription>
                )}
                {contractType === 'AMENDMENT' && (
                  <CardDescription className="text-amber-400">
                    El Amendment modifica precio, fecha de cierre o terminos de un contrato AB existente. Se envía al Seller para contrafirmar.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <Label className="flex items-center gap-2 mb-1">
                        {field.label}
                        {field.source === 'auto' && formValues[field.key] && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                            Auto
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
              <Button variant="outline" onClick={() => { 
                if (contractType === 'AMENDMENT' && abContracts.length > 0) {
                  setStep('select_parent');
                } else {
                  setStep('select'); setContractType(null);
                }
              }}>
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
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <PenTool className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Firma del {isBC ? 'Assignor' : 'Representante'} de Klose LLC
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ingresa el nombre completo del firmante y firma en cada bloque.
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Nombre completo del firmante</Label>
                  <Input
                    value={kloseSignerName}
                    onChange={(e) => setKloseSignerName(e.target.value)}
                    placeholder="Ej: Sergio Mantilla, Luz Paula Rojas"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <SigningWizard
              pages={buildKloseWizardPages()}
              signerName={kloseSignerName || 'Klose LLC Representative'}
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
                  Contrato Firmado por Klose — Listo para Enviar al {recipientLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-sm text-green-400 font-medium">
                    {Object.keys(kloseSignatures).length} firma(s) de Klose LLC registradas. El {recipientLabel.toLowerCase()} recibirá el contrato para contrafirmar.
                  </p>
                </div>

                {/* PDF Preview & Signing Link */}
                <div className="flex flex-wrap gap-2">
                  {pdfUrl && (
                    <>
                      <Button variant="outline" onClick={() => setShowPdfPreview(prev => !prev)}>
                        {showPdfPreview ? <><EyeOff className="h-4 w-4 mr-2" /> Ocultar PDF</> : <><Eye className="h-4 w-4 mr-2" /> Vista Previa del PDF</>}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        const a = document.createElement('a');
                        a.href = pdfUrl;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.click();
                      }}>
                        <FileText className="h-4 w-4 mr-2" /> Abrir PDF en nueva pestaña
                      </Button>
                    </>
                  )}
                  {signingToken && (
                    <Button variant="outline" onClick={() => {
                      const signingUrl = `${window.location.origin}/sign/${signingToken}`;
                      navigator.clipboard.writeText(signingUrl);
                      toast({ title: 'Link copiado', description: 'El enlace de firma ha sido copiado al portapapeles.' });
                    }}>
                      <Copy className="h-4 w-4 mr-2" /> Copiar Link de Firma
                    </Button>
                  )}
                </div>

                {/* Inline PDF Preview */}
                {showPdfPreview && pdfUrl && (
                  <div className="border border-border rounded-lg overflow-hidden bg-white">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[600px]"
                      title="Vista previa del contrato"
                    />
                  </div>
                )}

                {/* Signing Link Display */}
                {signingToken && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Link className="h-3 w-3" /> Enlace de firma para el {recipientLabel.toLowerCase()}
                    </p>
                    <p className="text-xs text-foreground font-mono break-all select-all">
                      {window.location.origin}/sign/{signingToken}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div>
                    <Label>Email del {recipientLabel}</Label>
                    <Input
                      type="email"
                      value={(isBC || isDC) ? (formValues.buyer_email || '') : (formValues.seller_email || '')}
                      onChange={(e) => handleFieldChange((isBC || isDC) ? 'buyer_email' : 'seller_email', e.target.value)}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Teléfono del {recipientLabel}</Label>
                    <Input
                      type="tel"
                      value={(isBC || isDC) ? (formValues.buyer_phone || '') : (formValues.seller_phone || '')}
                      onChange={(e) => handleFieldChange((isBC || isDC) ? 'buyer_phone' : 'seller_phone', e.target.value)}
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
                disabled={sending || !getRecipientEmail()}
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Enviar al {recipientLabel}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
