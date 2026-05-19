import { useState, useCallback, useEffect, useRef } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mic, PhoneOff, AlertTriangle, Loader2, Bot, User, ShieldAlert, PhoneCall, GraduationCap } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import {
  useCreateTrainingSession,
  useTrainingStats,
  parseTrainingResult,
  analyzeTrainingCallWithAI,
  deepAnalyzeTraining,
  type TrainingDifficulty,
  type DeepAnalysisResult,
} from '@/hooks/useTrainingSessions';
import { TrainingResultsPanel } from './TrainingResultsPanel';
import { SkillBreakdown } from './SkillBreakdown';

interface VoiceAgentSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select training mode when sheet opens (e.g. from "Practicar este lead" button) */
  defaultTrainingMode?: boolean;
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

function VoiceAgentSheetInner({ lead, open, onOpenChange, defaultTrainingMode }: VoiceAgentSheetProps) {
  const { toast } = useToast();
  const [personality, setPersonality] = useState<Personality>('sarah');
  const [trainingMode, setTrainingMode] = useState(defaultTrainingMode ?? false);
  const [difficulty, setDifficulty] = useState<TrainingDifficulty>('medium');
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [negotiationCtx, setNegotiationCtx] = useState<{ mao: number; min_offer: number; arv: number } | null>(null);
  const [trainingResult, setTrainingResult] = useState<ReturnType<typeof parseTrainingResult> | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisResult | null>(null);
  const [isAnalyzingDeep, setIsAnalyzingDeep] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createTrainingSession = useCreateTrainingSession();
  const { data: trainingStats } = useTrainingStats();

  // Refs for persistence
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const callStartRef = useRef<number | null>(null);
  const personalityRef = useRef<Personality>('sarah');
  const trainingModeRef = useRef<boolean>(false);
  const difficultyRef = useRef<TrainingDifficulty>('medium');
  const escalationsRef = useRef<{ approvals: number; rejections: number; dnc: boolean }>({ approvals: 0, rejections: 0, dnc: false });
  const leadRef = useRef<Lead | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { personalityRef.current = personality; }, [personality]);
  useEffect(() => { trainingModeRef.current = trainingMode; }, [trainingMode]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
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

  const persistTrainingSession = useCallback(async () => {
    const entries = transcriptRef.current;
    if (entries.length === 0 || !callStartRef.current) return;

    const durationSec = Math.round((Date.now() - callStartRef.current) / 1000);
    const fullText = entries.map((e) => `[${e.role}] ${e.text}`).join('\n');

    // 1. Try parsing the [TRAINING_RESULT] tag first
    let result = parseTrainingResult(fullText);
    let usedFallback = false;

    // 2. If no tag (raw_tag is null) AND we have enough conversation, fall back to AI analysis
    if (!result.raw_tag && entries.length >= 4) {
      toast({
        title: '🧠 Analizando con IA...',
        description: 'El simulador no devolvió score, usando Gemini para evaluar',
      });
      const aiResult = await analyzeTrainingCallWithAI(fullText);
      if (aiResult) {
        result = { ...aiResult, raw_tag: null };
        usedFallback = true;
      }
    }

    setTrainingResult(result);

    // ElevenLabs conversation ID was captured on connect
    const elevenLabsConvId = conversationIdRef.current;
    const currentDifficulty = difficultyRef.current;

    // 3. Run deep skill analysis in parallel (non-blocking for the basic save)
    let deep: DeepAnalysisResult | null = null;
    if (entries.length >= 4) {
      setIsAnalyzingDeep(true);
      const currentLead = leadRef.current;
      const leadCtx = currentLead?.property ? {
        mao: currentLead.property.mao ? Number(currentLead.property.mao) : undefined,
        arv: currentLead.property.arv ? Number(currentLead.property.arv) : undefined,
        distress: [
          currentLead.property.is_foreclosure && 'PRE-FORECLOSURE',
          (currentLead.property as any)?.is_vacant && 'VACANT',
          (currentLead.property as any)?.tax_delinquent && 'TAX-DELINQUENT',
        ].filter(Boolean).join(', ') || undefined,
      } : undefined;
      try {
        deep = await deepAnalyzeTraining(fullText, result.persona, currentDifficulty, leadCtx);
        if (deep) setDeepAnalysis(deep);
      } catch (e) {
        console.error('Deep analysis error:', e);
      } finally {
        setIsAnalyzingDeep(false);
      }
    }

    try {
      await createTrainingSession.mutateAsync({
        persona: result.persona,
        outcome: result.outcome,
        agent_score: deep?.overall_score ?? result.agent_score,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        final_offer: result.final_offer,
        would_close: result.would_close,
        duration_seconds: durationSec,
        transcript: entries,
        elevenlabs_conversation_id: elevenLabsConvId,
        raw_result_tag: result.raw_tag,
        difficulty: currentDifficulty,
        skill_scores: deep?.skill_scores ?? null,
        coaching_summary: deep?.coaching_summary ?? null,
      });

      const finalScore = deep?.overall_score ?? result.agent_score;
      if (finalScore !== null && finalScore !== undefined) {
        toast({
          title: `🎓 Score: ${finalScore}/100${usedFallback ? ' (IA)' : ''}`,
          description: result.would_close ? '¡Cerraste el deal!' : 'Sigue practicando',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Sin score válido',
          description: 'No se pudo evaluar la sesión. Conversación demasiado corta o error de IA.',
        });
      }
    } catch (err: any) {
      console.error('Failed to persist training session:', err);
    }
  }, [createTrainingSession, toast]);

  const conversation = useConversation({
    onConnect: () => {
      callStartRef.current = Date.now();
      escalationsRef.current = { approvals: 0, rejections: 0, dnc: false };
      conversationIdRef.current = null;
      setTrainingResult(null);
      setDeepAnalysis(null);
      // Try to capture conversation ID right after connect
      setTimeout(() => {
        try {
          conversationIdRef.current = (conversation as any)?.getId?.() || null;
        } catch {
          // ignore
        }
      }, 500);
      toast({
        title: trainingModeRef.current ? '🎓 Entrenamiento iniciado' : '🎙️ Llamada iniciada',
        description: trainingModeRef.current
          ? 'Practica con un seller simulado'
          : 'El agente está hablando con el lead',
      });
    },
    onDisconnect: () => {
      toast({ title: 'Llamada finalizada' });
      if (trainingModeRef.current) {
        void persistTrainingSession();
      } else {
        void persistCallToTimeline();
      }
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
        // Skip DB update in training mode
        if (trainingModeRef.current) {
          return 'Training mode: DNC noted but not persisted.';
        }
        const currentLead = leadRef.current;
        const propertyId = (currentLead as any)?.property?.id ?? (currentLead as any)?.property_id;
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

  // Reset state when sheet closes; sync defaultTrainingMode on open
  useEffect(() => {
    if (!open) {
      setTranscript([]);
      setPendingApproval(null);
      setNegotiationCtx(null);
      setTrainingResult(null);
      setDeepAnalysis(null);
      setIsAnalyzingDeep(false);
    } else if (defaultTrainingMode !== undefined) {
      setTrainingMode(defaultTrainingMode);
    }
  }, [open, defaultTrainingMode]);

  const startCall = useCallback(async () => {
    // In training mode lead is optional
    if (!trainingMode && !lead) return;
    setIsStarting(true);
    setTrainingResult(null);
    setDeepAnalysis(null);

    const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> =>
      Promise.race([promise, new Promise<never>((_, r) => setTimeout(() => r(new Error(timeoutMsg)), ms))]);

    try {
      // 1. Microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error('Micrófono denegado. Permite el acceso al micrófono en tu navegador y vuelve a intentar.');
      }

      // 2. Fetch ElevenLabs token from edge function (20s timeout)
      const invokeBody = trainingMode
        ? { mode: 'training', difficulty, ...(lead ? { practice_lead_id: lead.id } : {}) }
        : { mode: 'live', lead_id: lead!.id, personality };

      const { data, error } = await withTimeout(
        supabase.functions.invoke('elevenlabs-conversation-token', { body: invokeBody }),
        20000,
        'La función de voz tardó demasiado (>20s). Verifica que esté desplegada en Supabase.'
      );

      if (error) {
        const errMsg = String(error?.message || error);
        if (errMsg.includes('404') || errMsg.toLowerCase().includes('not found')) {
          throw new Error('Función no desplegada. Ejecuta: supabase functions deploy elevenlabs-conversation-token');
        }
        if (errMsg.includes('401') || errMsg.toLowerCase().includes('auth')) {
          throw new Error('Error de autenticación al llamar la función. Cierra sesión y vuelve a entrar.');
        }
        throw new Error(errMsg);
      }

      if (!data?.token) {
        const serverErr = data?.error || '';
        if (serverErr.includes('ELEVENLABS_API_KEY') || serverErr.includes('not configured')) {
          throw new Error('ElevenLabs API Key no configurada en Supabase. Contacta al administrador.');
        }
        throw new Error(serverErr || 'No se recibió token de ElevenLabs. Revisa los logs de la función.');
      }

      if (!trainingMode) {
        setNegotiationCtx(data.negotiation);
      }

      const baseConfig: any = { conversationToken: data.token };
      if (data.dynamic_variables) baseConfig.dynamicVariables = data.dynamic_variables;
      if (data.overrides) baseConfig.overrides = data.overrides;

      // 3. Connect — try WebRTC (15s timeout) then fall back to WebSocket (20s timeout)
      try {
        await withTimeout(
          conversation.startSession({ ...baseConfig, connectionType: 'webrtc' }),
          15000,
          'Tiempo de espera WebRTC agotado (15s). Cambiando a WebSocket...'
        );
      } catch (webrtcErr: any) {
        const msg = String(webrtcErr?.message || webrtcErr || '');
        const shouldFallback =
          msg.includes('1006') ||
          msg.toLowerCase().includes('webrtc') ||
          msg.toLowerCase().includes('livekit') ||
          msg.toLowerCase().includes('transport') ||
          msg.toLowerCase().includes('connect') ||
          msg.toLowerCase().includes('tiempo de espera webrtc');

        if (!shouldFallback) throw webrtcErr;

        console.warn('[VoiceAgent] WebRTC failed, retrying with WebSocket:', msg);
        toast({ title: 'Reintentando vía WebSocket…', description: 'WebRTC no disponible, cambiando de transporte' });
        await withTimeout(
          conversation.startSession({ ...baseConfig, connectionType: 'websocket' }),
          20000,
          'Tiempo de espera WebSocket agotado (20s). Verifica tu conexión a internet.'
        );
      }
    } catch (err: any) {
      console.error('[VoiceAgent] startCall failed:', err);
      const msg = err?.message || String(err) || 'Error desconocido';
      let title = 'No se pudo iniciar la llamada';

      if (msg.toLowerCase().includes('micrófono')) {
        title = 'Micrófono denegado';
      } else if (msg.toLowerCase().includes('no desplegada') || msg.toLowerCase().includes('deploy')) {
        title = 'Función no desplegada';
      } else if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('elevenlabs')) {
        title = 'Servicio no configurado';
      } else if (msg.toLowerCase().includes('autenticación')) {
        title = 'Error de autenticación';
      } else if (msg.toLowerCase().includes('webrtc') || msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('tiempo de espera')) {
        title = 'Error de conexión';
      } else if (msg.toLowerCase().includes('tardó demasiado') || msg.toLowerCase().includes('>20s')) {
        title = 'Tiempo agotado';
      }

      toast({ variant: 'destructive', title, description: msg });
    } finally {
      setIsStarting(false);
    }
  }, [lead, personality, trainingMode, difficulty, conversation, toast]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const approveOffer = () => {
    if (!pendingApproval) return;
    escalationsRef.current.approvals += 1;
    conversation.sendContextualUpdate(
      `HUMAN APPROVED: You may offer up to $${pendingApproval.proposed_offer.toLocaleString()}. Proceed with the negotiation.`
    );
    toast({ title: '✅ Aprobado', description: `Agente puede ofrecer $${pendingApproval.proposed_offer.toLocaleString()}` });
    setPendingApproval(null);
  };

  const rejectOffer = () => {
    if (!pendingApproval) return;
    escalationsRef.current.rejections += 1;
    conversation.sendContextualUpdate(
      `HUMAN REJECTED: Do NOT exceed $${negotiationCtx?.mao.toLocaleString() || 'MAO'}. Tell the seller you need to think about it and offer a callback.`
    );
    toast({ title: '❌ Rechazado', description: 'El agente mantendrá el MAO' });
    setPendingApproval(null);
  };

  const isConnected = conversation.status === 'connected';
  const property = (lead as any)?.property;
  const canStartCall = trainingMode || !!lead;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {trainingMode ? (
              <><GraduationCap className="h-5 w-5 text-primary" />Modo Entrenamiento</>
            ) : (
              <><PhoneCall className="h-5 w-5 text-primary" />AI Voice Agent — Llamada en Vivo</>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Training Mode Toggle */}
          {!isConnected && (
            <Card variant="glass" className={`p-3 transition-colors ${trainingMode ? 'border-primary bg-primary/5' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <Label htmlFor="training-toggle" className="font-medium cursor-pointer flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    🎓 Modo Entrenamiento
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {trainingMode
                      ? 'Hablarás con un SELLER SIMULADO. Sin riesgo. Random persona.'
                      : 'Practica antes de llamar leads reales — sin contactar nadie real'}
                  </p>
                  {trainingMode && trainingStats && trainingStats.totalCalls > 0 && (
                    <div className="flex gap-3 mt-2 text-xs">
                      <span><strong>{trainingStats.totalCalls}</strong> sesiones</span>
                      <span>Promedio: <strong>{trainingStats.avgScore}</strong>/100</span>
                      <span>Cierre: <strong>{trainingStats.closeRate}%</strong></span>
                    </div>
                  )}
                </div>
                <Switch
                  id="training-toggle"
                  checked={trainingMode}
                  onCheckedChange={setTrainingMode}
                />
              </div>
            </Card>
          )}

          {/* Difficulty selector (training mode, before call) */}
          {!isConnected && trainingMode && (
            <Card variant="glass" className="p-3">
              <Label className="text-sm font-medium mb-2 block">Dificultad</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as TrainingDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-2 rounded-md border text-xs font-medium capitalize transition-colors ${
                      difficulty === d
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {d === 'easy' && '😊 Fácil'}
                    {d === 'medium' && '😐 Medio'}
                    {d === 'hard' && '🔥 Difícil'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {difficulty === 'easy' && 'Seller cooperativo, pocas objeciones.'}
                {difficulty === 'medium' && 'Seller realista, objeciones estándar.'}
                {difficulty === 'hard' && 'Seller agresivo, múltiples objeciones, precio alto.'}
              </p>
            </Card>
          )}

          {/* Training Mode Banner (during call) */}
          {isConnected && trainingMode && (
            <Card className="p-3 border-2 border-primary bg-primary/10">
              <p className="font-semibold text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                🎓 ENTRENAMIENTO — No es un seller real
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                La persona se revelará al terminar la llamada
              </p>
            </Card>
          )}

          {/* Lead context (live mode only) */}
          {!trainingMode && lead && property && (
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

          {/* Personality selector (live mode only, before call) */}
          {!isConnected && !trainingMode && (
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

          {/* Negotiation range (live mode OR lead-practice training, during call) */}
          {isConnected && negotiationCtx && (trainingMode ? !!lead : true) && (
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
              <Button onClick={startCall} disabled={isStarting || !canStartCall} className="flex-1" size="lg">
                {isStarting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Conectando...</>
                ) : trainingMode ? (
                  <><GraduationCap className="h-4 w-4 mr-2" />Iniciar Entrenamiento</>
                ) : (
                  <><Mic className="h-4 w-4 mr-2" />Iniciar Llamada</>
                )}
              </Button>
            ) : (
              <Button onClick={endCall} variant="destructive" className="flex-1" size="lg">
                <PhoneOff className="h-4 w-4 mr-2" />Terminar {trainingMode ? 'Entrenamiento' : 'Llamada'}
              </Button>
            )}
          </div>

          {/* Status indicator */}
          {isConnected && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${conversation.isSpeaking ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              {conversation.isSpeaking
                ? (trainingMode ? 'Seller simulado hablando...' : 'Agente hablando...')
                : (trainingMode ? 'Esperando tu respuesta...' : 'Escuchando al seller...')}
            </div>
          )}

          {/* Training Results Panel (post-call) */}
          {trainingResult && !isConnected && (
            <TrainingResultsPanel
              persona={trainingResult.persona}
              outcome={trainingResult.outcome}
              agent_score={deepAnalysis?.overall_score ?? trainingResult.agent_score}
              strengths={trainingResult.strengths}
              weaknesses={trainingResult.weaknesses}
              final_offer={trainingResult.final_offer}
              would_close={trainingResult.would_close}
              avgScore={trainingStats?.avgScore}
            />
          )}

          {/* Deep Skill Analysis (post-call) */}
          {isAnalyzingDeep && !isConnected && (
            <Card variant="glass" className="p-3">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando skills con IA...
              </p>
            </Card>
          )}
          {deepAnalysis && !isConnected && (
            <SkillBreakdown
              skills={deepAnalysis.skill_scores}
              coachingSummary={deepAnalysis.coaching_summary}
            />
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
                          {entry.role === 'agent'
                            ? (trainingMode ? 'Seller (simulado)' : 'Agente')
                            : (trainingMode ? 'Tú (agente)' : 'Seller')}
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
            {trainingMode
              ? 'Modo entrenamiento — ningún seller real es contactado. Los resultados se guardan en tu historial de práctica.'
              : 'Prototipo web — el audio se reproduce en tu navegador. Twilio (llamadas reales al teléfono del seller) llegará en Fase 2.'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function VoiceAgentSheet(props: VoiceAgentSheetProps) {
  return (
    <ConversationProvider key={props.open ? 'open' : 'closed'}>
      <VoiceAgentSheetInner {...props} />
    </ConversationProvider>
  );
}
