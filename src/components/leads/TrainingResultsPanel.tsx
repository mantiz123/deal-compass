import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, TrendingDown, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import { PERSONA_LABELS, type TrainingPersona } from '@/hooks/useTrainingSessions';

interface TrainingResultsPanelProps {
  persona: TrainingPersona;
  outcome: string | null;
  agent_score: number | null;
  strengths: string[];
  weaknesses: string[];
  final_offer: number | null;
  would_close: boolean | null;
  /** User's average score across past sessions (for comparison) */
  avgScore?: number;
}

function getScoreColor(score: number) {
  if (score >= 85) return 'text-success';
  if (score >= 70) return 'text-primary';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function getScoreLabel(score: number) {
  if (score >= 90) return '🏆 Excepcional';
  if (score >= 80) return '⭐ Muy bueno';
  if (score >= 65) return '👍 Bueno';
  if (score >= 50) return '⚠️ Regular';
  return '❌ Necesita práctica';
}

export function TrainingResultsPanel({
  persona,
  outcome,
  agent_score,
  strengths,
  weaknesses,
  final_offer,
  would_close,
  avgScore,
}: TrainingResultsPanelProps) {
  const personaInfo = PERSONA_LABELS[persona];
  const score = agent_score ?? 0;
  const scoreDelta = avgScore !== undefined && agent_score !== null ? agent_score - avgScore : null;

  return (
    <Card className="p-5 border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Resultado del Entrenamiento</h3>
      </div>

      {/* Persona revelada */}
      <Card variant="glass" className="p-3 mb-4">
        <p className="text-xs text-muted-foreground mb-1">PERSONA QUE ENFRENTASTE</p>
        <p className="font-semibold text-sm">{personaInfo.emoji} {personaInfo.name}</p>
      </Card>

      {/* Score Gauge */}
      {agent_score !== null ? (
        <div className="mb-5">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">TU PUNTAJE</p>
              <p className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</p>
              <p className="text-sm font-medium mt-1">{getScoreLabel(score)}</p>
            </div>
            {scoreDelta !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">vs. Promedio</p>
                <div className={`flex items-center gap-1 font-semibold ${scoreDelta >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {scoreDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta} pts
                </div>
                <p className="text-xs text-muted-foreground">avg: {avgScore}</p>
              </div>
            )}
          </div>
          <Progress value={score} className="h-3" />
        </div>
      ) : (
        <Card className="p-3 mb-4 border-warning bg-warning/5">
          <p className="text-sm text-muted-foreground">
            ⚠️ El simulador no devolvió un score válido. Revisa el transcript para confirmar que el agente terminó la llamada correctamente.
          </p>
        </Card>
      )}

      {/* Outcome + Cerraría */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {outcome && (
          <Card variant="glass" className="p-2.5">
            <p className="text-xs text-muted-foreground">RESULTADO</p>
            <p className="text-sm font-medium capitalize">{outcome.replace(/_/g, ' ')}</p>
          </Card>
        )}
        {would_close !== null && (
          <Card variant="glass" className="p-2.5">
            <p className="text-xs text-muted-foreground">¿CERRARÍA?</p>
            <Badge variant={would_close ? 'default' : 'destructive'} className="mt-1">
              {would_close ? '✅ Sí cerraría' : '❌ No cerraría'}
            </Badge>
          </Card>
        )}
      </div>

      {final_offer !== null && (
        <Card variant="glass" className="p-2.5 mb-4">
          <p className="text-xs text-muted-foreground">OFERTA FINAL NEGOCIADA</p>
          <p className="text-lg font-bold text-success">${final_offer.toLocaleString()}</p>
        </Card>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-4 w-4 text-success" />
            <p className="text-xs font-semibold text-success">FORTALEZAS</p>
          </div>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span className="capitalize">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="h-4 w-4 text-warning" />
            <p className="text-xs font-semibold text-warning">A MEJORAR</p>
          </div>
          <ul className="space-y-1">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <XCircle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <span className="capitalize">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
