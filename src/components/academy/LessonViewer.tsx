import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, Sparkles, BookOpen, Target } from 'lucide-react';
import { useLesson, useLessonQuiz, useStartLesson } from '@/hooks/useAcademy';
import { QuizRunner } from './QuizRunner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LessonViewerProps {
  lessonId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function LessonViewer({ lessonId, open, onOpenChange, onCompleted }: LessonViewerProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const { data: lesson } = useLesson(lessonId ?? undefined);
  const { data: quiz } = useLessonQuiz(lessonId ?? undefined);
  const startMutation = useStartLesson();

  useEffect(() => {
    if (lessonId && open) {
      startMutation.mutate(lessonId);
      setShowQuiz(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, open]);

  if (!lesson) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Lección {lesson.lesson_order}
            </Badge>
            {lesson.estimated_minutes && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {lesson.estimated_minutes} min
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {lesson.xp_reward} XP
            </Badge>
          </div>
          <SheetTitle className="text-2xl text-left">{lesson.title}</SheetTitle>
          {lesson.summary && (
            <p className="text-sm text-muted-foreground text-left">{lesson.summary}</p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
            {!showQuiz ? (
              <>
                <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-blockquote:border-primary prose-blockquote:text-foreground">
                  <ReactMarkdown>{lesson.content_markdown}</ReactMarkdown>
                </article>

                <Separator className="my-8" />

                {quiz && quiz.length > 0 ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-bold text-foreground">Quiz: {quiz.length} preguntas</h3>
                        <p className="text-sm text-muted-foreground">
                          Necesitas <strong>≥80%</strong> para desbloquear la siguiente lección.
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setShowQuiz(true)} className="w-full">
                      Empezar Quiz
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center">
                    Esta lección no tiene quiz. Continúa al siguiente módulo.
                  </p>
                )}
              </>
            ) : (
              <QuizRunner
                lessonId={lesson.id}
                xpReward={lesson.xp_reward}
                questions={quiz ?? []}
                onPassed={() => {
                  onCompleted?.();
                }}
                onBackToLesson={() => setShowQuiz(false)}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
