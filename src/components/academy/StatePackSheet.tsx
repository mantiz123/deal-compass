import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayCircle, Clock, Sparkles, MapPin } from 'lucide-react';
import { useStatePackLessons } from '@/hooks/useAcademy';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StatePackSheetProps {
  state: {
    id: string;
    code: string;
    name: string;
    flag_emoji: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Hook to load state pack lesson by id (different table)
function useStatePackLessonById(id: string | undefined) {
  return useQuery({
    queryKey: ['state-pack-lesson', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('academy_state_packs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function StatePackSheet({ state, open, onOpenChange }: StatePackSheetProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const { data: lessons = [] } = useStatePackLessons(state?.id);

  if (!state) return null;

  const sectionLabels: Record<string, string> = {
    legal: '⚖️ Marco Legal',
    contracts: '📄 Contratos',
    disclosures: '📋 Disclosures',
    timing: '⏱️ Timing & Cierre',
    special_cases: '🔥 Casos Especiales',
  };

  // Group by section
  const grouped = lessons.reduce((acc: Record<string, typeof lessons>, l) => {
    if (!acc[l.pack_section]) acc[l.pack_section] = [];
    acc[l.pack_section].push(l);
    return acc;
  }, {});

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{state.flag_emoji ?? '📍'}</div>
              <div>
                <SheetTitle className="text-left flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  State Pack: {state.name}
                </SheetTitle>
                <Badge variant="outline" className="text-xs mt-1 font-mono">
                  {state.code}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Especialización legal, contratos y operativa específica de {state.name}.
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-6">
              {Object.entries(grouped).map(([section, sectionLessons]) => (
                <div key={section} className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    {sectionLabels[section] ?? section}
                  </h3>
                  {sectionLessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setLessonOpen(true);
                      }}
                      className="w-full text-left rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-secondary/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <PlayCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground">{lesson.title}</h4>
                          {lesson.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {lesson.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
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
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <StatePackLessonViewer
        lessonId={selectedLessonId}
        open={lessonOpen}
        onOpenChange={setLessonOpen}
      />
    </>
  );
}

// Inline viewer for state pack lessons (no quizzes for now in state packs)
function StatePackLessonViewer({
  lessonId,
  open,
  onOpenChange,
}: {
  lessonId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: lesson } = useStatePackLessonById(lessonId ?? undefined);
  if (!lesson) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              State Pack · {lesson.pack_section}
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
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
            <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-blockquote:border-primary prose-blockquote:text-foreground">
              <ReactMarkdown>{lesson.content_markdown}</ReactMarkdown>
            </article>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
