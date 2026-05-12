import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useICAGuard } from '@/hooks/useICAGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Sparkles, Copy, Check, Loader2, Send, DollarSign, Info, Zap } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface OutreachEmailGeneratorProps {
  lead: Lead;
}

export function OutreachEmailGenerator({ lead }: OutreachEmailGeneratorProps) {
  const { toast } = useToast();
  const { requireICA } = useICAGuard();
  const { user } = useAuth();
  const [templateType, setTemplateType] = useState<string>('initial_outreach');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [subjectLine, setSubjectLine] = useState('');
  const [bccEmail, setBccEmail] = useState(user?.email || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  // Manual input fields
  const [offerAmount, setOfferAmount] = useState(lead.offer_amount?.toString() || '');
  const [assignmentFee, setAssignmentFee] = useState(lead.assignment_fee?.toString() || '');
  const [lowestSourcePrice, setLowestSourcePrice] = useState('');
  const [closingTimeline, setClosingTimeline] = useState('14-21 days');

  const property = lead.property;
  const isForeclosure = property?.is_foreclosure;

  const handleGenerate = async () => {
    if (!requireICA("enviar outreach a sellers")) return;
    setIsGenerating(true);
    setGeneratedEmail('');
    try {
      const manualData: Record<string, any> = {};
      if (offerAmount) manualData.offerAmount = Number(offerAmount);
      if (assignmentFee) manualData.assignmentFee = Number(assignmentFee);
      if (lowestSourcePrice) manualData.lowestSourcePrice = lowestSourcePrice;
      if (closingTimeline) manualData.closingTimeline = closingTimeline;

      const { data, error } = await supabase.functions.invoke('generate-outreach-email', {
        body: { leadId: lead.id, templateType, manualData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedEmail(data.email);
      setSubjectLine(data.subject);
      toast({
        title: 'Email generado',
        description: 'El email ha sido generado exitosamente. Cópialo para enviarlo.',
      });
    } catch (err: any) {
      console.error('Error generating email:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo generar el email',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, type: 'body' | 'subject') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'body') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      }
      toast({ title: type === 'body' ? 'Email copiado' : 'Asunto copiado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Generator
          <Badge variant="glow" className="text-xs">IA</Badge>
        </h3>
      </div>

      {/* Template Selection */}
      <Card variant="glass" className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium">Tipo de Email</Label>
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial_outreach">
                📩 Initial Outreach — Presentación + Disclosure
              </SelectItem>
              <SelectItem value="foreclosure_offer">
                🏚️ Foreclosure Offer — Oferta directa con números
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto-filled data preview */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
          <p className="font-medium text-sm mb-2">Datos del sistema (auto-llenados):</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">Owner:</span>
            <span className="font-medium">{property?.owner_name || '—'}</span>
            <span className="text-muted-foreground">Dirección:</span>
            <span className="font-medium">{property?.address || '—'}</span>
            <span className="text-muted-foreground">ARV:</span>
            <span className="font-medium">{property?.arv ? `$${property.arv.toLocaleString()}` : '—'}</span>
            <span className="text-muted-foreground">Mortgage:</span>
            <span className="font-medium">{property?.mortgage_balance ? `$${property.mortgage_balance.toLocaleString()}` : '—'}</span>
            {isForeclosure && (
              <>
                <span className="text-muted-foreground">Pre-FC:</span>
                <span className="font-medium text-destructive">
                  {property?.prefc_record_type || 'Yes'}
                  {property?.auction_date ? ` • Auction: ${property.auction_date}` : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Manual inputs */}
        {templateType === 'foreclosure_offer' && (
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Datos de la oferta
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Ingresa el monto de oferta y la IA calculará automáticamente el neto al vendedor.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Offer Amount ($) *</Label>
                <Input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="190000"
                />
              </div>
              <div>
                <Label className="text-xs">Assignment Fee ($)</Label>
                <Input
                  type="number"
                  value={assignmentFee}
                  onChange={(e) => setAssignmentFee(e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Lowest Source Price (Zillow/Redfin/CMA)</Label>
            <Input
              value={lowestSourcePrice}
              onChange={(e) => setLowestSourcePrice(e.target.value)}
              placeholder="$185,000"
            />
          </div>
          <div>
            <Label className="text-xs">Closing Timeline</Label>
            <Input
              value={closingTimeline}
              onChange={(e) => setClosingTimeline(e.target.value)}
              placeholder="14-21 days"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (templateType === 'foreclosure_offer' && !offerAmount)}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando email con IA...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generar Email
            </>
          )}
        </Button>
      </Card>

      {/* Generated Email Output */}
      {generatedEmail && (
        <Card variant="glass" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Send className="h-4 w-4" />
              Email Generado
            </h4>
            {property?.owner_email && (
              <a
                href={`mailto:${property.owner_email}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(generatedEmail)}`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                Abrir en cliente de correo
              </a>
            )}
          </div>

          {/* Subject line */}
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <div className="flex gap-2 mt-1">
              <Input value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} className="text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(subjectLine, 'subject')}
                className="shrink-0"
              >
                {copiedSubject ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Email body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Body</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(generatedEmail, 'body')}
                className="h-7 text-xs"
              >
                {copied ? (
                  <><Check className="h-3 w-3 mr-1 text-success" /> Copiado</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copiar Email</>
                )}
              </Button>
            </div>
            <Textarea
              value={generatedEmail}
              onChange={(e) => setGeneratedEmail(e.target.value)}
              className="min-h-[300px] text-sm font-mono"
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 Puedes editar el email antes de copiarlo. Cuando tengas API de Gmail o Resend, se enviará directamente.
          </p>
        </Card>
      )}
    </div>
  );
}
