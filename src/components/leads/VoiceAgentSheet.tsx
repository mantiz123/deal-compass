import { useState, useCallback, useEffect, useRef } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, PhoneOff, AlertTriangle, Loader2, Bot, User, ShieldAlert, PhoneCall } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface VoiceAgentSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Personality = 'sarah' | 'mike' | 'discovery';

interface TranscriptEntry {
  role: 'agent' | 'user';
  text: string;
  ts: number;
}

interface PendingApproval {
  proposed_offer: number;
  seller_reason: string;
  ts: number;
}

const PERSONALITY_INFO: Record<Personality, { label: string; desc: string; emoji: string }> = {
  sarah: { label: 'Sarah — Empática', desc: 'Cálida, construye rapport, ideal para sellers nerviosos', emoji: '🤗' },
  mike: { label: 'Mike — Directo', desc: 'Cierre rápido, ideal para K-Score alto', emoji: '⚡' },
  discovery: { label: 'Alex — Discovery', desc: 'Solo pregunta, no ofrece. Para qualify inicial', emoji: '🔍' },
};

function VoiceAgentSheetInner({ lead, open, onOpenChange }: VoiceAgentSheetProps) {
  const { toast } = useToast();
  const [personality, setPersonality] = useState<Personality>('sarah');
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [negotiationCtx, setNegotiationCtx] = useState<{ mao: number; min_offer: number; arv: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs for persistence (avoid stale closures in onDisconnect)
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const callStartRef = useRef<number | null>(null);
  const personalityRef = useRef<Personality>('sarah');
  const escalationsRef = useRef<{ approvals: number; rejections: number; dnc: boolean }>({ approvals: 0, rejections: 0, dnc: false });
  const leadRef = useRef<Lead | null>(null);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { personalityRef.current = personality; }, [personality]);
  useEffect(() => { leadRef.current = lead; }, [lead]);

  const persistCallToTimeline = useCallback(async () => {
    const currentLead = leadRef.current;
    const entries = transcriptRef.current;
    if (!currentLead || entries.length === 0 || !callStartRef.current) return;

    const durationSec = Math.round((Date.now() - callStartRef.current) / 1000);
    const personalityLabel = PERSONALITY_INFO[personalityRef.current].label;
    const esc = escalationsRef.current;

    const transcriptText = entries
      .map((e) => `[${e.role === 'agent' ? 'AGENTE' : 'SELLER'}] ${e.text}`)
      .join('\n\n');

    const escalationSummary: string[] = [];
    if (esc.approvals > 0) escalationSummary.push(`✅ ${esc.approvals} aprobación(es) humana(s)`);
    if (esc.rejections > 0) escalationSummary.push(`❌ ${esc.rejections} rechazo(s) humano(s)`);
    if (esc.dnc) escalationSummary.push(`🚫 LEAD MARCADO COMO DNC`);

    const header = [
      `🤖 LLAMADA AI VOICE AGENT`,
      `Personalidad: ${personalityLabel}`,
      `Duración: ${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
      `Mensajes: ${entries.length}`,
      escalationSummary.length > 0 ? `Escalations: ${escalationSummary.join(' · ')}` : null,
    ].filter(Boolean).join('\n');

    const fullContent = `${header}\n\n--- TRANSCRIPT ---\n\n${transcriptText}`;

    const sentiment = esc.dnc ? 'negative' : esc.approvals > 0 ? 'positive' : 'neutral';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('interactions').insert({
        lead_id: currentLead.id,
        interaction_type: 'ai_call',
        direction: 'outbound',
        content: fullContent,
        sentiment,
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      // Update last_contact_at on the lead
      await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', currentLead.id);

      toast({ title: '💾 Conversación guardada', description: 'Transcript añadido al timeline del lead' });
    } catch (err: any) {
      console.error('Failed to persist transcript:', err);
      toast({ variant: 'destructive', title: 'No se pudo guardar el transcript', description: err.message });
    }
  }, [toast]);

  const conversation = useConversation({
    onConnect: () => {
      callStartRef.current = Date.now();
      escalationsRef.current = { approvals: 0, rejections: 0, dnc: false };
      toast({ title: '🎙️ Llamada iniciada', description: 'El agente está hablando con el lead' });
    },
    onDisconnect: () => {
      toast({ title: 'Llamada finalizada' });
      // Persist transcript to lead timeline
      void persistCallToTimeline();
    },
    onError: (err) => {
      console.error('ElevenLabs error:', err);
      toast({ variant: 'destructive', title: 'Error de conexión', description: String(err) });
    },
    onMessage: (msg: any) => {
      if (msg?.source === 'user' && msg?.message) {
        setTranscript((t) => [...t, { role: 'user', text: msg.message, ts: Date.now() }]);
      } else if (msg?.source === 'ai' && msg?.message) {
        setTranscript((t) => [...t, { role: 'agent', text: msg.message, ts: Date.now() }]);
      }
    },
    clientTools: {
      request_approval: (params: { proposed_offer: number; seller_reason: string }) => {
        setPendingApproval({ ...params, ts: Date.now() });
        toast({
          variant: 'destructive',
          title: '⚠️ Aprobación requerida',
          description: `El agente quiere ofrecer $${params.proposed_offer.toLocaleString()}`,
        });
        return 'Approval requested. Waiting for human decision. Stall the seller politely.';
      },
      mark_dnc: async (params: { reason: string }) => {
        escalationsRef.current.dnc = true;
        toast({
          variant: 'destructive',
          title: '🚫 Lead marcado como DNC',
          description: params.reason,
        });
        // Persist DNC flag to property
        const currentLead = leadRef.current;
        const propertyId = (currentLead as any)?.properties?.id ?? (currentLead as any)?.property_id;
        if (propertyId) {
          try {
            await supabase
              .from('properties')
              .update({ do_not_mail: true, notes: `[DNC via AI call] ${params.reason}` })
              .eq('id', propertyId);
          } catch (e) {
            console.error('Failed to mark DNC:', e);
          }
        }
        return 'Lead marked as Do Not Call. Ending conversation politely.';
      },
    },
  });

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setTranscript([]);
      setPendingApproval(null);
      setNegotiationCtx(null);
    }
  }, [open]);

  const startCall = useCallback(async () => {
    if (!lead) return;
    setIsStarting(true);
    try {
      // Mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token + context from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token', {
        body: { lead_id: lead.id, personality },
      });

      if (error || !data?.token) {
        throw new Error(error?.message || 'No token received');
      }

      setNegotiationCtx(data.negotiation);

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
        dynamicVariables: data.dynamic_variables,
        overrides: data.overrides,
      } as any);
    } catch (err: any) {
      console.error('Failed to start:', err);
      toast({ variant: 'destructive', title: 'No se pudo iniciar', description: err.message });
    } finally {
      setIsStarting(false);
    }
  }, [lead, personality, conversation, toast]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const approveOffer = () => {
    if (!pendingApproval) return;
    conversation.sendContextualUpdate(
      `HUMAN APPROVED: You may offer up to $${pendingApproval.proposed_offer.toLocaleString()}. Proceed with the negotiation.`
    );
    toast({ title: '✅ Aprobado', description: `Agente puede ofrecer $${pendingApproval.proposed_offer.toLocaleString()}` });
    setPendingApproval(null);
  };

  const rejectOffer = () => {
    if (!pendingApproval) return;
    conversation.sendContextualUpdate(
      `HUMAN REJECTED: Do NOT exceed $${negotiationCtx?.mao.toLocaleString() || 'MAO'}. Tell the seller you need to think about it and offer a callback.`
    );
    toast({ title: '❌ Rechazado', description: 'El agente mantendrá el MAO' });
    setPendingApproval(null);
  };

  const isConnected = conversation.status === 'connected';
  const property = (lead as any)?.properties;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            AI Voice Agent — Llamada en Vivo
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Lead context */}
          {lead && property && (
            <Card variant="glass" className="p-3 text-sm">
              <p className="font-semibold">{property.owner_name || 'Owner'}</p>
              <p className="text-muted-foreground">{property.address}, {property.city}, {property.state}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">K-Score: {lead.piw_score || 0}</Badge>
                {property.is_foreclosure && <Badge variant="destructive">FORECLOSURE</Badge>}
                {property.is_vacant && <Badge variant="warning">VACANT</Badge>}
              </div>
            </Card>
          )}

          {/* Personality selector (only before call) */}
          {!isConnected && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Personalidad del agente</Label>
              <RadioGroup value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                {(Object.keys(PERSONALITY_INFO) as Personality[]).map((key) => (
                  <Card
                    key={key}
                    variant="glass"
                    className={`p-3 cursor-pointer transition-colors ${personality === key ? 'border-primary' : ''}`}
                    onClick={() => setPersonality(key)}
                  >
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <Label htmlFor={key} className="cursor-pointer flex-1">
                        <div className="font-medium">
                          {PERSONALITY_INFO[key].emoji} {PERSONALITY_INFO[key].label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {PERSONALITY_INFO[key].desc}
                        </div>
                      </Label>
                    </div>
                  </Card>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Negotiation range (during call) */}
          {isConnected && negotiationCtx && (
            <Card variant="glass" className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">RANGO AUTORIZADO</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">MIN</p>
                  <p className="font-bold">${negotiationCtx.min_offer.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAO</p>
                  <p className="font-bold text-success">${negotiationCtx.mao.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ARV</p>
                  <p className="font-bold">${negotiationCtx.arv.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Approval prompt */}
          {pendingApproval && (
            <Card className="p-4 border-destructive bg-destructive/5">
              <div className="flex items-start gap-2 mb-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Aprobación requerida</p>
                  <p className="text-sm">El agente quiere ofrecer <strong>${pendingApproval.proposed_offer.toLocaleString()}</strong></p>
                  <p className="text-xs text-muted-foreground mt-1 italic">"{pendingApproval.seller_reason}"</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={approveOffer} className="flex-1">Aprobar</Button>
                <Button size="sm" variant="outline" onClick={rejectOffer} className="flex-1">Rechazar</Button>
              </div>
            </Card>
          )}

          {/* Call controls */}
          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={startCall} disabled={isStarting || !lead} className="flex-1" size="lg">
                {isStarting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Conectando...</>
                ) : (
                  <><Mic className="h-4 w-4 mr-2" />Iniciar Llamada</>
                )}
              </Button>
            ) : (
              <Button onClick={endCall} variant="destructive" className="flex-1" size="lg">
                <PhoneOff className="h-4 w-4 mr-2" />Terminar Llamada
              </Button>
            )}
          </div>

          {/* Status indicator */}
          {isConnected && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${conversation.isSpeaking ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              {conversation.isSpeaking ? 'Agente hablando...' : 'Escuchando al seller...'}
            </div>
          )}

          <Separator />

          {/* Transcript */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Transcripción en vivo</Label>
            <ScrollArea className="h-72 rounded-lg border bg-muted/30 p-3" ref={scrollRef as any}>
              {transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  La conversación aparecerá aquí en tiempo real
                </p>
              ) : (
                <div className="space-y-3">
                  {transcript.map((entry, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      {entry.role === 'agent' ? (
                        <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {entry.role === 'agent' ? 'Agente' : 'Seller'}
                        </p>
                        <p>{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            Prototipo web — el audio se reproduce en tu navegador. Twilio (llamadas reales al teléfono del seller) llegará en Fase 2.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function VoiceAgentSheet(props: VoiceAgentSheetProps) {
  return (
    <ConversationProvider>
      <VoiceAgentSheetInner {...props} />
    </ConversationProvider>
  );
}
