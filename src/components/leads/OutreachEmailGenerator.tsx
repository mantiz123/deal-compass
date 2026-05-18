import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useICAGuard } from '@/hooks/useICAGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Sparkles, Copy, Check, Loader2, Send, DollarSign, Info, Zap, AlertTriangle, ShieldOff, PhoneOff, Lock, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/hooks/useLeads';
import { useDNCCheck } from '@/hooks/useDNCCheck';

const DUPLICATE_WARNING_DAYS = 7;

interface PreviousSend {
  recipient_email: string;
  subject: string;
  sent_at: string;
}

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
  const [bccEmail, setBccEmail] = useState('sergio@goklose.com');
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
  const dncStatus = useDNCCheck(property);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allPropertyEmails = useMemo(() => {
    return [
      property?.owner_email,
      property?.owner_email_2,
      property?.owner_email_3,
      property?.owner_email_4,
    ].filter((e): e is string => !!e && emailRe.test(e));
  }, [property?.owner_email, property?.owner_email_2, property?.owner_email_3, property?.owner_email_4]);

  // Active recipients: override if user typed one, else all detected property emails
  const activeRecipients = useMemo(() => {
    const override = recipientEmail.trim();
    if (override && emailRe.test(override)) return [override];
    return allPropertyEmails;
  }, [recipientEmail, allPropertyEmails]);

  // Quality gate: leads already in contract or closed don't need seller outreach
  const BLOCKED_STATUSES = ['bajo_contrato', 'cesion', 'cerrado'] as const;
  const isStatusBlocked = BLOCKED_STATUSES.includes(lead.status as typeof BLOCKED_STATUSES[number]);
  const statusBlockReason: Record<string, string> = {
    bajo_contrato: 'Este lead ya está Bajo Contrato — el seller ya firmó.',
    cesion: 'Este lead está en fase de Cesión — no se necesita outreach al seller.',
    cerrado: 'Este deal está Cerrado — outreach innecesario.',
  };

  const isAnyHardBlocked = dncStatus.isHardBlocked || isStatusBlocked;
  const PIW_WARNING_THRESHOLD = 30;

  // Anti-duplicate: previous sends to this lead in last N days
  const [previousSends, setPreviousSends] = useState<PreviousSend[]>([]);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const since = new Date(Date.now() - DUPLICATE_WARNING_DAYS * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('outreach_email_log')
      .select('recipient_email, subject, sent_at')
      .eq('lead_id', lead.id)
      .eq('status', 'sent')
      .gte('sent_at', since)
      .order('sent_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!cancelled && data) setPreviousSends(data as PreviousSend[]);
      });
    return () => { cancelled = true; };
  }, [lead.id]);

  const matchingPrevious = (() => {
    if (activeRecipients.length === 0) return null;
    const targets = activeRecipients.map(e => e.toLowerCase());
    return previousSends.find(p => targets.includes(p.recipient_email.toLowerCase())) || null;
  })();

  const handleGenerate = async () => {
    if (!requireICA("enviar outreach a sellers")) return;
    if (isAnyHardBlocked) {
      const reason = dncStatus.isHardBlocked
        ? (dncStatus.reason ?? 'Este lead está en lista Do Not Contact.')
        : (statusBlockReason[lead.status] ?? 'Estado del lead no permite outreach.');
      toast({ title: 'Outreach bloqueado', description: reason, variant: 'destructive' });
      return;
    }
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
      // Don't auto-fill override — multi-email chips show all detected addresses
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

  const performSend = async () => {
    const targets = activeRecipients;
    if (targets.length === 0) {
      toast({ title: 'Sin destinatarios', description: 'Este lead no tiene email registrado.', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    let sent = 0;
    let failed = 0;
    let remaining: number | null = null;

    for (const emailAddr of targets) {
      try {
        const { data, error } = await supabase.functions.invoke('send-outreach-email', {
          body: {
            leadId: lead.id,
            to: emailAddr,
            subject: subjectLine,
            bodyText: generatedEmail,
            bcc: bccEmail.trim() || undefined,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        sent++;
        if ((data as any)?.remainingToday !== undefined) remaining = (data as any).remainingToday;
      } catch (err: any) {
        console.error('Send error to', emailAddr, err);
        failed++;
      }
    }

    if (sent > 0) {
      toast({
        title: `✅ ${sent} email${sent > 1 ? 's' : ''} enviado${sent > 1 ? 's' : ''}`,
        description: `Destinatarios: ${targets.slice(0, sent).join(', ')}${remaining !== null ? ` · Restantes hoy: ${remaining}` : ''}`,
      });
      setPreviousSends(prev => [
        ...targets.slice(0, sent).map(e => ({ recipient_email: e, subject: subjectLine, sent_at: new Date().toISOString() })),
        ...prev,
      ]);
    }
    if (failed > 0) {
      toast({
        title: `${failed} email${failed > 1 ? 's' : ''} fallaron`,
        description: 'Revisa el log de errores o intenta de nuevo.',
        variant: 'destructive',
      });
    }
    setIsSending(false);
  };

  const handleSend = async () => {
    if (!requireICA("enviar outreach a sellers")) return;
    if (isAnyHardBlocked) {
      const reason = dncStatus.isHardBlocked
        ? (dncStatus.reason ?? 'Este lead está en lista Do Not Contact.')
        : (statusBlockReason[lead.status] ?? 'Estado del lead no permite outreach.');
      toast({ title: 'Envío bloqueado', description: reason, variant: 'destructive' });
      return;
    }
    if (activeRecipients.length === 0) {
      toast({ title: 'Falta destinatario', description: 'Ingresa el email del seller o agrégalo a la propiedad.', variant: 'destructive' });
      return;
    }
    if (!subjectLine.trim() || !generatedEmail.trim()) {
      toast({ title: 'Email vacío', description: 'Genera el contenido primero.', variant: 'destructive' });
      return;
    }
    if (matchingPrevious) {
      setConfirmDuplicate(true);
      return;
    }
    await performSend();
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

      {/* ── Status block (bajo_contrato / cesion / cerrado) ── */}
      {isStatusBlocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Outreach no necesario</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {statusBlockReason[lead.status]}
          </AlertDescription>
        </Alert>
      )}

      {/* ── DNC hard block ── */}
      {!isStatusBlocked && dncStatus.isHardBlocked && (
        <Alert variant="destructive">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Outreach bloqueado — DNC</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {dncStatus.reason}. No se puede generar ni enviar email a este lead.
            Para desbloquear, edita la propiedad y desmarca "Do Not Contact" / "Litigator".
          </AlertDescription>
        </Alert>
      )}

      {/* ── Low PIW warning (soft) ── */}
      {!isAnyHardBlocked && lead.piw_score != null && lead.piw_score < PIW_WARNING_THRESHOLD && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <TrendingDown className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700">K-Score bajo ({lead.piw_score})</AlertTitle>
          <AlertDescription className="text-xs mt-1 text-yellow-700">
            Este lead tiene un score de probabilidad bajo. Considera priorizar leads con score mayor a {PIW_WARNING_THRESHOLD} antes de usar tu cuota diaria de emails.
          </AlertDescription>
        </Alert>
      )}

      {/* ── DNC phone warning (soft) ── */}
      {!isStatusBlocked && !dncStatus.isHardBlocked && dncStatus.hasDncPhones && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <PhoneOff className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600">Teléfonos en lista DNC</AlertTitle>
          <AlertDescription className="text-xs mt-1 text-orange-700">
            {dncStatus.dncPhones.join(', ')} — SMS bloqueado para estos números.
            El email todavía puede enviarse.
          </AlertDescription>
        </Alert>
      )}

      {matchingPrevious && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ya contactaste a este seller</AlertTitle>
          <AlertDescription className="text-xs space-y-1 mt-1">
            <div>
              Email enviado a <strong>{matchingPrevious.recipient_email}</strong> hace{' '}
              <strong>{formatDistanceToNow(new Date(matchingPrevious.sent_at))}</strong>.
            </div>
            <div className="opacity-80">Subject anterior: "{matchingPrevious.subject}"</div>
            <div className="opacity-80">Te pediremos confirmación al enviar de nuevo.</div>
          </AlertDescription>
        </Alert>
      )}

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
          disabled={isGenerating || isAnyHardBlocked || (templateType === 'foreclosure_offer' && !offerAmount)}
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

          {/* Send via Resend */}
          <div className="space-y-3 border-t pt-3">
            {/* Detected emails */}
            {allPropertyEmails.length > 0 && (
              <div className="rounded-md bg-muted/40 border p-2.5 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {allPropertyEmails.length > 1
                    ? `${allPropertyEmails.length} emails detectados — se enviará a todos`
                    : 'Destinatario detectado'}
                </p>
                {allPropertyEmails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {i === 0 ? 'Principal' : `Email ${i + 1}`}
                    </Badge>
                    <span className="font-mono">{email}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1">
                  Override (enviar solo a este)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Si dejas este campo vacío, se enviará a todos los emails detectados arriba. Si escribes aquí, solo se envía a esta dirección.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Dejar vacío = todos los emails"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  BCC (tu Gmail)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Recibirás una copia oculta en tu inbox para tener registro del envío.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="email"
                  value={bccEmail}
                  onChange={(e) => setBccEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={isSending || !generatedEmail || !subjectLine || isAnyHardBlocked}
              className="w-full"
              variant="default"
            >
              {isSending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" />
                  Enviar a {activeRecipients.length > 1 ? `${activeRecipients.length} emails` : 'destinatario'} (límite 50/día)
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Envío vía Resend desde <code>sergio@goklose.com</code>. Recibes copia oculta. Reply-to apunta a ti.
            </p>
          </div>
        </Card>
      )}

      <AlertDialog open={confirmDuplicate} onOpenChange={setConfirmDuplicate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              ¿Reenviar email a este seller?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {matchingPrevious && (
                  <>
                    <div>
                      Ya enviaste un email a <strong>{matchingPrevious.recipient_email}</strong> hace{' '}
                      <strong>{formatDistanceToNow(new Date(matchingPrevious.sent_at))}</strong>.
                    </div>
                    <div className="rounded-md border bg-muted/50 p-2 text-xs">
                      <div className="text-muted-foreground">Subject anterior:</div>
                      <div className="font-medium">"{matchingPrevious.subject}"</div>
                    </div>
                  </>
                )}
                <div className="text-muted-foreground">
                  Reenviar muy seguido puede afectar la deliverability y verse como spam.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmDuplicate(false);
                await performSend();
              }}
            >
              Sí, enviar de nuevo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
