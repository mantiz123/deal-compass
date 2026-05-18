import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Mail, Send, AlertTriangle, CheckCircle2, XCircle,
  Loader2, ShieldOff, Lock, Inbox, BarChart3, RefreshCw,
} from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface BulkOutreachSheetProps {
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
}

type SendStatus =
  | 'pending'
  | 'generating'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped_no_email'
  | 'skipped_dnc'
  | 'skipped_status'
  | 'skipped_limit';

interface LeadResult {
  lead: Lead;
  status: SendStatus;
  emails: string[];
  reason?: string;
  sentCount?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED_STATUSES = ['bajo_contrato', 'cesion', 'cerrado'];
const HOURLY_CAP = 50;

function getPropertyEmails(lead: Lead): string[] {
  const p = lead.property as any;
  return [p?.owner_email, p?.owner_email_2, p?.owner_email_3, p?.owner_email_4]
    .filter((e): e is string => !!e && EMAIL_RE.test(e));
}

function classifyLead(lead: Lead): Pick<LeadResult, 'status' | 'emails' | 'reason'> {
  const p = lead.property as any;
  if (BLOCKED_STATUSES.includes(lead.status)) {
    return { status: 'skipped_status', emails: [], reason: 'Estado bloqueado (contrato/cesión/cerrado)' };
  }
  if (p?.do_not_mail || p?.is_litigator) {
    return { status: 'skipped_dnc', emails: [], reason: p?.is_litigator ? 'Litigante' : 'Do Not Mail' };
  }
  const emails = getPropertyEmails(lead);
  if (emails.length === 0) {
    return { status: 'skipped_no_email', emails: [], reason: 'Sin email registrado' };
  }
  return { status: 'pending', emails };
}

const statusConfig: Record<SendStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pendiente',     color: 'text-muted-foreground', icon: <Mail className="h-3.5 w-3.5" /> },
  generating:       { label: 'Generando…',    color: 'text-blue-500',         icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  sending:          { label: 'Enviando…',     color: 'text-primary',          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  sent:             { label: 'Enviado',        color: 'text-success',          icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  failed:           { label: 'Fallido',        color: 'text-destructive',      icon: <XCircle className="h-3.5 w-3.5" /> },
  skipped_no_email: { label: 'Sin email',     color: 'text-muted-foreground', icon: <Inbox className="h-3.5 w-3.5" /> },
  skipped_dnc:      { label: 'DNC',           color: 'text-destructive',      icon: <ShieldOff className="h-3.5 w-3.5" /> },
  skipped_status:   { label: 'Bloqueado',     color: 'text-warning',          icon: <Lock className="h-3.5 w-3.5" /> },
  skipped_limit:    { label: 'Límite',        color: 'text-orange-500',       icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export function BulkOutreachSheet({ selectedIds, open, onOpenChange, onClear }: BulkOutreachSheetProps) {
  const { toast } = useToast();
  const [results, setResults] = useState<LeadResult[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [templateType, setTemplateType] = useState('initial_outreach');

  const loadLeads = useCallback(async () => {
    if (!open || selectedIds.length === 0) return;
    setIsLoadingLeads(true);
    setIsDone(false);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, property:properties(*)')
        .in('id', selectedIds);
      if (error) throw error;
      const leads = (data || []) as Lead[];
      setResults(leads.map(lead => ({ lead, ...classifyLead(lead) })));
    } catch (err: any) {
      toast({ title: 'Error cargando leads', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoadingLeads(false);
    }
  }, [open, selectedIds, toast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const updateResult = (leadId: string, patch: Partial<LeadResult>) => {
    setResults(prev => prev.map(r => r.lead.id === leadId ? { ...r, ...patch } : r));
  };

  const runBulkSend = async () => {
    const eligible = results.filter(r => r.status === 'pending');
    if (eligible.length === 0) return;

    setIsRunning(true);
    let sentThisRun = 0;
    let hitLimit = false;

    for (let i = 0; i < eligible.length; i++) {
      if (hitLimit) {
        updateResult(eligible[i].lead.id, { status: 'skipped_limit', reason: 'Límite 50/hora alcanzado' });
        continue;
      }

      const item = eligible[i];
      updateResult(item.lead.id, { status: 'generating' });

      try {
        // Generate email
        const { data: genData, error: genError } = await supabase.functions.invoke('generate-outreach-email', {
          body: { leadId: item.lead.id, templateType },
        });
        if (genError) throw new Error(genError.message);
        if (genData?.error) throw new Error(genData.error);

        updateResult(item.lead.id, { status: 'sending' });

        // Send to each email of this lead
        let sentForLead = 0;
        for (const emailAddr of item.emails) {
          if (sentThisRun >= HOURLY_CAP) {
            hitLimit = true;
            break;
          }

          const { data: sendData, error: sendError } = await supabase.functions.invoke('send-outreach-email', {
            body: {
              leadId: item.lead.id,
              to: emailAddr,
              subject: genData.subject,
              bodyText: genData.email,
              bcc: 'sergio@goklose.com',
            },
          });

          if (sendError) {
            if (sendError.message?.toLowerCase().includes('daily limit')) {
              hitLimit = true;
              break;
            }
            console.warn('Send error to', emailAddr, sendError);
            continue;
          }
          if (sendData?.error) {
            if (String(sendData.error).toLowerCase().includes('daily limit')) {
              hitLimit = true;
              break;
            }
            console.warn('Send error to', emailAddr, sendData.error);
            continue;
          }

          sentForLead++;
          sentThisRun++;
        }

        if (hitLimit && sentForLead === 0) {
          updateResult(item.lead.id, { status: 'skipped_limit', reason: 'Límite diario/horario alcanzado' });
        } else {
          updateResult(item.lead.id, { status: 'sent', sentCount: sentForLead });
        }
      } catch (err: any) {
        const isLimit = err.message?.toLowerCase().includes('daily limit') || err.message?.includes('429');
        if (isLimit) {
          hitLimit = true;
          updateResult(item.lead.id, { status: 'skipped_limit', reason: 'Límite diario alcanzado' });
        } else {
          updateResult(item.lead.id, { status: 'failed', reason: err.message?.slice(0, 80) });
        }
      }

      // Brief pause between leads to avoid Resend rate limits
      if (i < eligible.length - 1 && !hitLimit) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setIsRunning(false);
    setIsDone(true);

    if (hitLimit) {
      toast({
        title: 'Límite alcanzado',
        description: 'Se alcanzó el límite de 50 emails/hora. Los restantes fueron omitidos.',
        variant: 'destructive',
      });
    }
  };

  const eligible = results.filter(r => r.status === 'pending').length;
  const totalEmails = results.filter(r => r.status === 'pending').reduce((acc, r) => acc + r.emails.length, 0);
  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => ['skipped_no_email', 'skipped_dnc', 'skipped_status', 'skipped_limit'].includes(r.status)).length;
  const inProgress = results.filter(r => r.status === 'generating' || r.status === 'sending').length;

  const progress = results.length > 0
    ? Math.round(((sent + failed + skipped) / results.length) * 100)
    : 0;

  const handleClose = () => {
    if (!isRunning) {
      onOpenChange(false);
      if (isDone) onClear();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Envío Masivo
            <Badge variant="outline">{selectedIds.length} leads</Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-4">
            {/* Template selector */}
            {!isRunning && !isDone && (
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de email</Label>
                <Select value={templateType} onValueChange={setTemplateType} disabled={isRunning}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_outreach">📩 Initial Outreach — Presentación + Disclosure</SelectItem>
                    <SelectItem value="foreclosure_offer">🏚️ Foreclosure Offer — Oferta directa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Summary */}
            {!isLoadingLeads && results.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-success/10 p-2">
                  <p className="text-xl font-bold text-success">{eligible}</p>
                  <p className="text-xs text-muted-foreground">Elegibles</p>
                  {eligible > 0 && <p className="text-[10px] text-muted-foreground">({totalEmails} emails)</p>}
                </div>
                <div className="rounded-lg bg-destructive/10 p-2">
                  <p className="text-xl font-bold text-destructive">{results.filter(r => r.status === 'skipped_dnc').length}</p>
                  <p className="text-xs text-muted-foreground">DNC</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-xl font-bold">{results.filter(r => r.status === 'skipped_no_email').length}</p>
                  <p className="text-xs text-muted-foreground">Sin email</p>
                </div>
              </div>
            )}

            {eligible >= HOURLY_CAP && !isRunning && !isDone && (
              <Alert className="border-orange-500/40 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-xs text-orange-700">
                  Tienes {eligible} leads elegibles pero el límite es {HOURLY_CAP} emails/hora.
                  Los primeros {HOURLY_CAP} se enviarán; el resto quedará pendiente.
                </AlertDescription>
              </Alert>
            )}

            {/* Progress (during send) */}
            {(isRunning || isDone) && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{sent} enviados · {failed} fallidos · {skipped} omitidos</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {inProgress > 0 && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Procesando…
                  </p>
                )}
              </div>
            )}

            {/* Final report */}
            {isDone && (
              <div className="rounded-lg border p-3 space-y-1.5 bg-muted/30">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Reporte Final
                </p>
                <div className="text-xs space-y-0.5">
                  <p className="text-success">✅ Enviados: {sent}</p>
                  {failed > 0 && <p className="text-destructive">❌ Fallidos: {failed}</p>}
                  {results.filter(r => r.status === 'skipped_no_email').length > 0 && (
                    <p className="text-muted-foreground">📭 Sin email: {results.filter(r => r.status === 'skipped_no_email').length}</p>
                  )}
                  {results.filter(r => r.status === 'skipped_dnc').length > 0 && (
                    <p className="text-destructive">🚫 DNC: {results.filter(r => r.status === 'skipped_dnc').length}</p>
                  )}
                  {results.filter(r => r.status === 'skipped_limit').length > 0 && (
                    <p className="text-orange-600">⏸ Omitidos por límite: {results.filter(r => r.status === 'skipped_limit').length}</p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Lead list */}
            {isLoadingLeads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {results.map(item => {
                  const cfg = statusConfig[item.status];
                  const addr = item.lead.property?.address || 'Sin dirección';
                  const owner = item.lead.property?.owner_name || 'Desconocido';
                  return (
                    <div
                      key={item.lead.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className={cfg.color}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{addr}</p>
                        <p className="text-xs text-muted-foreground truncate">{owner}</p>
                        {item.emails.length > 1 && item.status === 'pending' && (
                          <p className="text-[10px] text-primary">{item.emails.length} emails</p>
                        )}
                        {item.reason && (
                          <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                        )}
                      </div>
                      <span className={`text-xs ${cfg.color} shrink-0`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t space-y-2">
          {!isDone ? (
            <Button
              className="w-full"
              disabled={isRunning || isLoadingLeads || eligible === 0}
              onClick={runBulkSend}
            >
              {isRunning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />
                  Iniciar Envío Masivo ({Math.min(eligible, HOURLY_CAP)} leads)
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cerrar
              </Button>
              <Button variant="outline" className="flex-1" onClick={loadLeads}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar fallidos
              </Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            Máx. {HOURLY_CAP} emails/hora · DNC respetado automáticamente · Envío vía Resend
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
