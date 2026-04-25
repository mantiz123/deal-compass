import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, PlayCircle, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  lesson_order: number;
  estimated_minutes: number | null;
  xp_reward: number;
}

interface LessonListProps {
  lessons: Lesson[];
  progress: { lesson_id: string; status: string }[];
  onSelect: (lessonId: string) => void;
}

export function LessonList({ lessons, progress, onSelect }: LessonListProps) {
  const isCompleted = (id: string) =>
    progress.some((p) => p.lesson_id === id && p.status === 'completed');

  const isUnlocked = (lessonOrder: number) => {
    if (lessonOrder === 1) return true;
    const prev = lessons.find((l) => l.lesson_order === lessonOrder - 1);
    if (!prev) return true;
    return isCompleted(prev.id);
  };

  return (
    <div className="space-y-2">
      {lessons.map((lesson) => {
        const completed = isCompleted(lesson.id);
        const unlocked = isUnlocked(lesson.lesson_order);
        return (
          <button
            key={lesson.id}
            onClick={() => unlocked && onSelect(lesson.id)}
            disabled={!unlocked}
            className={cn(
              'w-full text-left rounded-lg border border-border p-4 transition-all',
              unlocked && 'hover:border-primary/50 hover:bg-secondary/50 cursor-pointer',
              !unlocked && 'opacity-50 cursor-not-allowed',
              completed && 'border-success/30 bg-success/5'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : !unlocked ? (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <PlayCircle className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs font-mono">
                    {lesson.lesson_order}
                  </Badge>
                  <h4 className="font-medium text-foreground truncate">{lesson.title}</h4>
                </div>
                {lesson.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {lesson.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {lesson.estimated_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.estimated_minutes} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {lesson.xp_reward} XP
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
