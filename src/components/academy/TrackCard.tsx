import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, Lock, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
    level_order: number;
  };
  progress: { completed: number; total: number; percent: number };
  isLocked: boolean;
  lockReason?: string;
  onOpen: () => void;
}

export function TrackCard({ track, progress, isLocked, lockReason, onOpen }: TrackCardProps) {
  const isComplete = progress.total > 0 && progress.completed === progress.total;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
        isComplete && 'border-success/50 bg-success/5',
        isLocked && 'opacity-60'
      )}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: track.color ?? 'hsl(var(--primary))' }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${track.color ?? '#3b82f6'}20` }}
            >
              <GraduationCap
                className="h-6 w-6"
                style={{ color: track.color ?? 'hsl(var(--primary))' }}
              />
            </div>
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                Nivel {track.level_order}
              </Badge>
              <h3 className="text-lg font-bold text-foreground">{track.name}</h3>
            </div>
          </div>
          {isComplete && <CheckCircle2 className="h-5 w-5 text-success" />}
          {isLocked && <Lock className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {track.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{track.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progress.completed} / {progress.total} lecciones
            </span>
            <span className="font-semibold text-foreground">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>

        {isLocked ? (
          <p className="text-xs text-muted-foreground italic">{lockReason}</p>
        ) : (
          <Button onClick={onOpen} variant="default" className="w-full">
            {progress.completed === 0 ? 'Empezar' : isComplete ? 'Revisar' : 'Continuar'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
