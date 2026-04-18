import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Target,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Send,
  ExternalLink,
  Flame,
  Users,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCriticalActions, type CriticalAction } from '@/hooks/useCriticalActions';
import { useMarkLeadContacted } from '@/hooks/useLeads';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';

const TYPE_META: Record<
  CriticalAction['type'],
  { icon: typeof Flame; label: string; color: string }
> = {
  call_hot_lead: {
    icon: Flame,
    label: 'HOT LEAD',
    color: 'border-warning/40 bg-warning/5 hover:bg-warning/10',
  },
  chase_contract: {
    icon: FileText,
    label: 'CONTRATO',
    color: 'border-primary/40 bg-primary/5 hover:bg-primary/10',
  },
  reactivate_buyer: {
    icon: Users,
    label: 'BUYER',
    color: 'border-accent/40 bg-accent/5 hover:bg-accent/10',
  },
};

function priorityBadgeClass(priority: number) {
  if (priority >= 85) return 'bg-destructive/20 text-destructive border-destructive/40';
  if (priority >= 70) return 'bg-warning/20 text-warning border-warning/40';
  return 'bg-primary/20 text-primary border-primary/40';
}

function priorityLabel(priority: number) {
  if (priority >= 85) return 'CRÍTICO';
  if (priority >= 70) return 'ALTO';
  return 'MEDIO';
}

export function CriticalActionsWidget() {
  const { data: actions, isLoading } = useCriticalActions(5);
  const [selectedAction, setSelectedAction] = useState<CriticalAction | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card variant="glow">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="glow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Próximas Acciones Críticas
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              Top {actions?.length || 0}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Acciones priorizadas por K-Score, urgencia de contratos y actividad de buyers
          </p>
        </CardHeader>
        <CardContent>
          {!actions || actions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 mx-auto text-success/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Todo bajo control — no hay acciones urgentes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Excelente trabajo. Cuando aparezcan oportunidades urgentes, las verás aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action, idx) => {
                const meta = TYPE_META[action.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-all hover:scale-[1.01]',
                      meta.color
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-background/60 border border-border flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {meta.label}
                          </Badge>
                          <Badge
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              priorityBadgeClass(action.priority)
                            )}
                          >
                            {priorityLabel(action.priority)} · {action.priority}
                          </Badge>
                          {action.piwScore != null && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              K-{action.piwScore}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm truncate">{action.title}</p>
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {action.subtitle}
                        </p>
                        <p className="text-xs text-foreground/80">{action.reason}</p>
                      </div>

                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAction && (
        <ActionModal
          action={selectedAction}
          open={!!selectedAction}
          onOpenChange={open => {
            if (!open) setSelectedAction(null);
          }}
          onOpenLead={leadId => {
            setSelectedAction(null);
            setOpenLeadId(leadId);
          }}
        />
      )}

      {openLeadId && (
        <LeadDetailSheet
          lead={{ id: openLeadId } as any}
          open={!!openLeadId}
          onOpenChange={open => !open && setOpenLeadId(null)}
        />
      )}
    </>
  );
}

// ============================================================================
// Action Modal — CTAs específicos por tipo de acción
// ============================================================================

function ActionModal({
  action,
  open,
  onOpenChange,
  onOpenLead,
}: {
  action: CriticalAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLead: (leadId: string) => void;
}) {
  const { toast } = useToast();
  const markContacted = useMarkLeadContacted();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado`, description: text });
  };

  const buildSigningUrl = (token: string) => {
    const baseUrl = window.location.hostname.includes('lovable.app')
      ? 'https://goklose.com'
      : window.location.origin;
    return `${baseUrl}/sign/${token}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Acción: {action.title}
          </DialogTitle>
          <DialogDescription>{action.reason}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* HOT LEAD ACTIONS */}
          {action.type === 'call_hot_lead' && (
            <>
              {action.phone ? (
                <Button
                  className="w-full justify-start"
                  asChild
                  onClick={() => action.leadId && markContacted.mutate(action.leadId)}
                >
                  <a href={`tel:${action.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Llamar ahora · {action.phone}
                  </a>
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground p-2 rounded bg-muted/40">
                  Sin teléfono — necesita skip-tracing
                </div>
              )}
              {action.phone && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`sms:${action.phone}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enviar SMS
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => action.leadId && onOpenLead(action.leadId)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir detalle del lead
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  if (action.leadId) {
                    markContacted.mutate(action.leadId);
                    onOpenChange(false);
                  }
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como contactado
              </Button>
            </>
          )}

          {/* CONTRACT ACTIONS */}
          {action.type === 'chase_contract' && (
            <>
              {action.signingToken && (
                <>
                  <Button
                    className="w-full justify-start"
                    onClick={() =>
                      copyToClipboard(buildSigningUrl(action.signingToken!), 'Link de firma')
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar link de firma
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href={buildSigningUrl(action.signingToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir link de firma
                    </a>
                  </Button>
                </>
              )}
              {action.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a
                    href={`mailto:${action.email}?subject=Recordatorio: Contrato ${action.contractType} pendiente de firma`}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email recordatorio · {action.email}
                  </a>
                </Button>
              )}
              {action.phone && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`sms:${action.phone}?body=Hola, te envié el contrato ${action.contractType} para tu firma. ¿Pudiste revisarlo?`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    SMS recordatorio · {action.phone}
                  </a>
                </Button>
              )}
              {action.leadId && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onOpenLead(action.leadId!)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir lead del contrato
                </Button>
              )}
            </>
          )}

          {/* BUYER ACTIONS */}
          {action.type === 'reactivate_buyer' && (
            <>
              {action.phone && (
                <Button className="w-full justify-start" asChild>
                  <a href={`tel:${action.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Llamar · {action.phone}
                  </a>
                </Button>
              )}
              {action.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a
                    href={`mailto:${action.email}?subject=Tengo un nuevo deal que te puede interesar`}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email · {action.email}
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/buyers">
                  <Send className="mr-2 h-4 w-4" />
                  Ir a Buyers para enviar deal package
                </a>
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
