import { useState, useEffect, useMemo } from 'react';
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
import { SubToCalculator } from '@/components/tools/SubToCalculator';

/** Splits markdown content into segments separated by tool embed markers like ::tool[subto-calculator]:: */
function parseLessonContent(markdown: string): Array<
  { type: 'markdown'; content: string } | { type: 'tool'; toolId: string }
> {
  const TOOL_REGEX = /^::tool\[([\w-]+)\]::\s*$/gm;
  const segments: Array<
    { type: 'markdown'; content: string } | { type: 'tool'; toolId: string }
  > = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOOL_REGEX.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'markdown', content: markdown.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'tool', toolId: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < markdown.length) {
    segments.push({ type: 'markdown', content: markdown.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: 'markdown', content: markdown }];
}

function ToolEmbed({ toolId }: { toolId: string }) {
  if (toolId === 'subto-calculator') {
    return (
      <div className="my-6 not-prose">
        <SubToCalculator compact />
      </div>
    );
  }
  return (
    <div className="my-4 p-3 rounded border border-dashed border-border text-xs text-muted-foreground">
      Herramienta no reconocida: <code>{toolId}</code>
    </div>
  );
}

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

  const segments = useMemo(
    () => parseLessonContent(lesson?.content_markdown ?? ''),
    [lesson?.content_markdown]
  );

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
                <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-blockquote:border-primary prose-blockquote:text-foreground prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden prose-thead:bg-muted prose-th:text-foreground prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:border-b prose-th:border-border prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border/50 prose-td:text-muted-foreground prose-tr:hover:bg-muted/30 prose-hr:border-border">
                  {segments.map((seg, idx) =>
                    seg.type === 'markdown' ? (
                      <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>
                        {seg.content}
                      </ReactMarkdown>
                    ) : (
                      <ToolEmbed key={idx} toolId={seg.toolId} />
                    )
                  )}
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
