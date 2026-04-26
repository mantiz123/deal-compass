import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTrackLessons, useUserProgress, calculateTrackProgress } from '@/hooks/useAcademy';
import { LessonList } from './LessonList';
import { LessonViewer } from './LessonViewer';

interface TrackDetailSheetProps {
  track: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackDetailSheet({ track, open, onOpenChange }: TrackDetailSheetProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const { data: lessons = [] } = useTrackLessons(track?.id);
  const { data: progress = [] } = useUserProgress();
  const trackProgress = calculateTrackProgress(lessons, progress);

  if (!track) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-4 sm:px-6 pt-6 pb-4 border-b border-border space-y-3">
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
              <div className="flex-1">
                <SheetTitle className="text-left flex items-center gap-2">
                  {track.name}
                  {trackProgress.isComplete && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {trackProgress.completed} / {trackProgress.total} lecciones
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3 text-warning" />
                    {trackProgress.xpEarned.toLocaleString()} / {trackProgress.xpTotal.toLocaleString()} XP
                  </Badge>
                </div>
              </div>
            </div>
            {track.description ? (
              <SheetDescription className="text-sm text-muted-foreground text-left">{track.description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">Detalle del track {track.name}</SheetDescription>
            )}
            <Progress value={trackProgress.percent} className="h-2" />
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aún no hay lecciones publicadas en este track.
                </p>
              ) : (
                <LessonList
                  lessons={lessons}
                  progress={progress}
                  onSelect={(id) => {
                    setSelectedLessonId(id);
                    setLessonOpen(true);
                  }}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <LessonViewer
        lessonId={selectedLessonId}
        open={lessonOpen}
        onOpenChange={setLessonOpen}
      />
    </>
  );
}
