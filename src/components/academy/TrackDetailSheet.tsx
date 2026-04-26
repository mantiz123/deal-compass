import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
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
                <SheetTitle className="text-left">{track.name}</SheetTitle>
                <Badge variant="outline" className="text-xs mt-1">
                  {trackProgress.completed} / {trackProgress.total} lecciones
                </Badge>
              </div>
            </div>
            {track.description && (
              <p className="text-sm text-muted-foreground text-left">{track.description}</p>
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
