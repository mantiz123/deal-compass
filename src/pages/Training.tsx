import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GraduationCap,
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  Bot,
  User,
  PhoneCall,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  useTrainingSessions,
  useTrainingStats,
  PERSONA_LABELS,
  type TrainingSession,
} from '@/hooks/useTrainingSessions';
import { TrainingResultsPanel } from '@/components/leads/TrainingResultsPanel';
import { SkillBreakdown } from '@/components/leads/SkillBreakdown';
import { TrainingAudioPlayer } from '@/components/leads/TrainingAudioPlayer';
import { VoiceAgentSheet } from '@/components/leads/VoiceAgentSheet';
import { AgentDemoGenerator } from '@/components/leads/AgentDemoGenerator';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreBadgeVariant(score: number | null): 'default' | 'destructive' | 'secondary' | 'warning' {
  if (score === null) return 'secondary';
  if (score >= 80) return 'default';
  if (score >= 60) return 'warning';
  return 'destructive';
}

export default function Training() {
  const { data: sessions, isLoading } = useTrainingSessions();
  const { data: stats } = useTrainingStats();
  const [selected, setSelected] = useState<TrainingSession | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const totalCalls = stats?.totalCalls ?? 0;
  const avgScore = stats?.avgScore ?? 0;
  const closeRate = stats?.closeRate ?? 0;

  // Personas faced (count distribution)
  const personaCounts = (sessions || []).reduce<Record<string, number>>((acc, s) => {
    acc[s.persona] = (acc[s.persona] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Entrenamiento de Agentes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Practica negociaciones con sellers simulados. Sin riesgo, score automático con IA.
            </p>
          </div>
          <Button onClick={() => setVoiceOpen(true)} size="lg">
            <PhoneCall className="h-4 w-4 mr-2" />
            Nueva sesión de práctica
          </Button>
        </div>

        {/* Audición de Agentes (Demo Generator) */}
        <AgentDemoGenerator />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">SESIONES TOTALES</p>
                <p className="text-3xl font-bold mt-1">{totalCalls}</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">SCORE PROMEDIO</p>
                <p className="text-3xl font-bold mt-1">{avgScore}<span className="text-base text-muted-foreground">/100</span></p>
              </div>
              <TrendingUp className="h-8 w-8 text-success opacity-50" />
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">TASA DE CIERRE</p>
                <p className="text-3xl font-bold mt-1">{closeRate}%</p>
              </div>
              <Trophy className="h-8 w-8 text-warning opacity-50" />
            </div>
          </Card>
        </div>

        {/* Personas faced */}
        {Object.keys(personaCounts).length > 0 && (
          <Card variant="glass" className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Personas enfrentadas
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(personaCounts).map(([persona, count]) => {
                const info = PERSONA_LABELS[persona as keyof typeof PERSONA_LABELS] || PERSONA_LABELS.UNKNOWN;
                return (
                  <Badge key={persona} variant="secondary" className="text-xs">
                    {info.emoji} {info.name.split('(')[0].trim()} · {count}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        {/* Sessions Table */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold">Historial de sesiones</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Últimas 50 prácticas</p>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Aún no tienes sesiones de práctica</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Inicia tu primera sesión para empezar a entrenar
              </p>
              <Button onClick={() => setVoiceOpen(true)}>
                <PhoneCall className="h-4 w-4 mr-2" />
                Empezar a practicar
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => {
                const personaInfo = PERSONA_LABELS[session.persona as keyof typeof PERSONA_LABELS] || PERSONA_LABELS.UNKNOWN;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelected(session)}
                    className="w-full p-4 hover:bg-muted/50 transition-colors text-left flex items-center gap-4"
                  >
                    <div className="text-2xl shrink-0">{personaInfo.emoji}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {personaInfo.name.split('(')[0].trim()}
                        </p>
                        {session.would_close === true && (
                          <Badge variant="default" className="text-xs">✅ Cerró</Badge>
                        )}
                        {session.would_close === false && (
                          <Badge variant="destructive" className="text-xs">❌ No cerró</Badge>
                        )}
                        {!session.raw_result_tag && session.agent_score !== null && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Sparkles className="h-3 w-3" /> IA
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.created_at)}
                        </span>
                        <span>{formatDuration(session.duration_seconds)}</span>
                        {session.outcome && (
                          <span className="capitalize truncate">{session.outcome.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {session.agent_score !== null ? (
                        <Badge variant={getScoreBadgeVariant(session.agent_score)} className="text-base px-3 py-1">
                          {session.agent_score}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" /> Sin score
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Session Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Detalle de sesión
            </SheetTitle>
            {selected && (
              <SheetDescription>
                {formatDate(selected.created_at)} · {formatDuration(selected.duration_seconds)}
              </SheetDescription>
            )}
          </SheetHeader>

          {selected && (
            <div className="space-y-4 mt-4">
              <TrainingResultsPanel
                persona={selected.persona as any}
                outcome={selected.outcome}
                agent_score={selected.agent_score}
                strengths={selected.strengths}
                weaknesses={selected.weaknesses}
                final_offer={selected.final_offer}
                would_close={selected.would_close}
                avgScore={avgScore}
              />

              {selected.skill_scores && (
                <SkillBreakdown
                  skills={selected.skill_scores}
                  coachingSummary={selected.coaching_summary}
                />
              )}

              <TrainingAudioPlayer conversationId={selected.elevenlabs_conversation_id} />

              <Card>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold">Transcripción</p>
                </div>
                <ScrollArea className="h-96 p-3">
                  {Array.isArray(selected.transcript) && selected.transcript.length > 0 ? (
                    <div className="space-y-3">
                      {(selected.transcript as any[]).map((entry, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          {entry.role === 'agent' ? (
                            <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          ) : (
                            <User className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {entry.role === 'agent' ? 'Seller (simulado)' : 'Tú (agente)'}
                            </p>
                            <p>{entry.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Transcripción no disponible
                    </p>
                  )}
                </ScrollArea>
              </Card>

              {selected.elevenlabs_conversation_id && (
                <p className="text-xs text-muted-foreground">
                  ElevenLabs ID: <code>{selected.elevenlabs_conversation_id}</code>
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Voice Agent Sheet for new training session (no lead = forces training mode) */}
      <VoiceAgentSheet lead={null} open={voiceOpen} onOpenChange={setVoiceOpen} />
    </Layout>
  );
}
