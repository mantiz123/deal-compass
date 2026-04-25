import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, MapPin, Sparkles, Trophy, Flame } from 'lucide-react';
import { TrackCard } from '@/components/academy/TrackCard';
import { TrackDetailSheet } from '@/components/academy/TrackDetailSheet';
import { StateCard } from '@/components/academy/StateCard';
import { StatePackSheet } from '@/components/academy/StatePackSheet';
import {
  useAcademyTracks,
  useAcademyStates,
  useUserProgress,
  useUserSpecializations,
  useUserWaitlist,
  useActivateState,
  useJoinWaitlist,
  useTrackLessons,
  calculateTrackProgress,
} from '@/hooks/useAcademy';

export default function Academy() {
  const { data: tracks = [], isLoading: tracksLoading } = useAcademyTracks();
  const { data: states = [], isLoading: statesLoading } = useAcademyStates();
  const { data: progress = [] } = useUserProgress();
  const { data: specializations = [] } = useUserSpecializations();
  const { data: waitlist = [] } = useUserWaitlist();
  const activateMutation = useActivateState();
  const waitlistMutation = useJoinWaitlist();

  const [selectedTrack, setSelectedTrack] = useState<typeof tracks[0] | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<typeof states[0] | null>(null);
  const [stateOpen, setStateOpen] = useState(false);

  // Foundations track (level_order = 1)
  const foundationsTrack = tracks.find((t) => t.slug === 'foundations');
  const { data: foundationsLessons = [] } = useTrackLessons(foundationsTrack?.id);
  const foundationsProgress = calculateTrackProgress(foundationsLessons, progress);
  const foundationsComplete =
    foundationsProgress.total > 0 && foundationsProgress.completed === foundationsProgress.total;

  // Total XP across all completed lessons
  const totalXP = useMemo(
    () => progress.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.xp_earned ?? 0), 0),
    [progress]
  );

  const completedLessons = progress.filter((p) => p.status === 'completed').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              Academy
            </h1>
            <p className="text-muted-foreground mt-1">
              Conviértete en un wholesaler profesional. Aprende, especialízate y cierra.
            </p>
          </div>

          {/* XP stats */}
          <div className="flex gap-3">
            <Card className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">XP total</p>
                  <p className="text-lg font-bold text-foreground">{totalXP.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Lecciones</p>
                  <p className="text-lg font-bold text-foreground">{completedLessons}</p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Estados activos</p>
                  <p className="text-lg font-bold text-foreground">{specializations.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="tracks">
              <GraduationCap className="h-4 w-4 mr-2" />
              Tracks
            </TabsTrigger>
            <TabsTrigger value="states">
              <MapPin className="h-4 w-4 mr-2" />
              Estados
            </TabsTrigger>
          </TabsList>

          {/* TRACKS TAB */}
          <TabsContent value="tracks" className="space-y-4 mt-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Tu camino de aprendizaje</h2>
              <p className="text-sm text-muted-foreground">
                Completa Foundations primero para desbloquear Closer y elegir tu primer estado.
              </p>
            </div>

            {tracksLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track) => {
                  const isLocked =
                    track.level_order > 1 &&
                    !(
                      foundationsComplete ||
                      track.slug === 'foundations'
                    );
                  return (
                    <TrackCardWrapper
                      key={track.id}
                      track={track}
                      progress={progress}
                      isLocked={isLocked}
                      lockReason={isLocked ? 'Completa Foundations primero' : undefined}
                      onOpen={() => {
                        setSelectedTrack(track);
                        setTrackOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* STATES TAB */}
          <TabsContent value="states" className="space-y-4 mt-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Especialízate por estado</h2>
              <p className="text-sm text-muted-foreground">
                Cada estado tiene su marco legal, contratos y disclosures específicas. Activa tu
                primer estado al terminar Foundations.
              </p>
            </div>

            {!foundationsComplete && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        Completa Foundations para activar Alabama
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Te falta {foundationsProgress.total - foundationsProgress.completed} lección(es)
                        ({foundationsProgress.percent}% completado).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {statesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {states.map((state) => {
                  const activated = specializations.some((s) => s.state_id === state.id);
                  const onWaitlist = waitlist.some((w) => w.state_id === state.id);
                  return (
                    <StateCard
                      key={state.id}
                      state={state}
                      isActivated={activated}
                      isOnWaitlist={onWaitlist}
                      foundationsComplete={foundationsComplete}
                      onActivate={() =>
                        activateMutation.mutate({ stateId: state.id, source: 'free' })
                      }
                      onJoinWaitlist={() => waitlistMutation.mutate(state.id)}
                      onOpenPack={() => {
                        setSelectedState(state);
                        setStateOpen(true);
                      }}
                      isPending={activateMutation.isPending || waitlistMutation.isPending}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <TrackDetailSheet track={selectedTrack} open={trackOpen} onOpenChange={setTrackOpen} />
        <StatePackSheet state={selectedState} open={stateOpen} onOpenChange={setStateOpen} />
      </div>
    </Layout>
  );
}

// Wrapper to compute progress per track
function TrackCardWrapper({
  track,
  progress,
  isLocked,
  lockReason,
  onOpen,
}: {
  track: any;
  progress: { lesson_id: string; status: string }[];
  isLocked: boolean;
  lockReason?: string;
  onOpen: () => void;
}) {
  const { data: lessons = [] } = useTrackLessons(track.id);
  const trackProgress = calculateTrackProgress(lessons, progress);
  return (
    <TrackCard
      track={track}
      progress={trackProgress}
      isLocked={isLocked}
      lockReason={lockReason}
      onOpen={onOpen}
    />
  );
}
