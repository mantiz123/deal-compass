import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Heart,
  Search,
  Shield,
  DollarSign,
  Handshake,
  Sparkles,
} from 'lucide-react';
import type { SkillScores } from '@/hooks/useTrainingSessions';

interface SkillBreakdownProps {
  skills: SkillScores;
  coachingSummary?: string | null;
}

const SKILL_META: Record<keyof SkillScores, { label: string; icon: React.ElementType; weight: number }> = {
  rapport: { label: 'Rapport & empatía', icon: Heart, weight: 20 },
  discovery: { label: 'Discovery & dolor', icon: Search, weight: 20 },
  objection_handling: { label: 'Manejo de objeciones', icon: Shield, weight: 20 },
  pricing_discipline: { label: 'Disciplina de precio', icon: DollarSign, weight: 25 },
  closing: { label: 'Cierre & next-step', icon: Handshake, weight: 15 },
};

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-warning';
  return 'text-destructive';
}

export function SkillBreakdown({ skills, coachingSummary }: SkillBreakdownProps) {
  const skillKeys = Object.keys(SKILL_META) as Array<keyof SkillScores>;

  return (
    <Card className="p-5 border-2 border-accent/40 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-accent" />
        <h3 className="font-bold text-base">Análisis profundo por skill</h3>
      </div>

      <div className="space-y-3 mb-4">
        {skillKeys.map((key) => {
          const meta = SKILL_META[key];
          const score = skills[key] ?? 0;
          const Icon = meta.icon;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    · peso {meta.weight}%
                  </span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                  {score}/100
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          );
        })}
      </div>

      {coachingSummary && (
        <Card variant="glass" className="p-3 mt-4">
          <p className="text-xs font-semibold text-accent mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            COACHING ACCIONABLE
          </p>
          <p className="text-sm leading-relaxed">{coachingSummary}</p>
        </Card>
      )}
    </Card>
  );
}
