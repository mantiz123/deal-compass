import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, MapPin, Sparkles, Trophy, Flame, Award, Loader2 } from 'lucide-react';
import { TrackCard } from '@/components/academy/TrackCard';
import { TrackDetailSheet } from '@/components/academy/TrackDetailSheet';
import { StateCard } from '@/components/academy/StateCard';
import { StatePackSheet } from '@/components/academy/StatePackSheet';
import { CertificatesTab } from '@/components/academy/CertificatesTab';
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
import {
  useTrackPurchases,
  useStartAcademyCheckout,
  useRefreshPurchasesAfterCheckout,
  ACADEMY_PRICING,
  type AcademyProductKey,
  type PaidTrackSlug,
} from '@/hooks/useTrackPurchases';

export default function Academy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tracks = [], isLoading: tracksLoading } = useAcademyTracks();
  const { data: states = [], isLoading: statesLoading } = useAcademyStates();
  const { data: progress = [] } = useUserProgress();
  const { data: specializations = [] } = useUserSpecializations();
  const { data: waitlist = [] } = useUserWaitlist();
  const activateMutation = useActivateState();
  const waitlistMutation = useJoinWaitlist();

  const { hasAccess, ownsBundle } = useTrackPurchases();
  const startCheckout = useStartAcademyCheckout();
  const refreshPurchases = useRefreshPurchasesAfterCheckout();

  const [selectedTrack, setSelectedTrack] = useState<typeof tracks[0] | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<typeof states[0] | null>(null);
  const [stateOpen, setStateOpen] = useState(false);

  // Manejar retorno de Stripe Checkout
  useEffect(() => {
    const purchase = searchParams.get('purchase');
    if (purchase === 'success') {
      toast.success('¡Compra completada! Tu acceso ya está activo.');
      refreshPurchases();
      searchParams.delete('purchase');
      searchParams.delete('product');
      setSearchParams(searchParams, { replace: true });
    } else if (purchase === 'canceled') {
      toast.info('Pago cancelado. Puedes reintentar cuando quieras.');
      searchParams.delete('purchase');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('purchase')]);

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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              Academy
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="tracks">
              <GraduationCap className="h-4 w-4 mr-2" />
              Tracks
            </TabsTrigger>
            <TabsTrigger value="states">
              <MapPin className="h-4 w-4 mr-2" />
              Estados
            </TabsTrigger>
            <TabsTrigger value="certificates">
              <Award className="h-4 w-4 mr-2" />
              Certificados
            </TabsTrigger>
          </TabsList>

          {/* TRACKS TAB */}
          <TabsContent value="tracks" className="space-y-4 mt-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Tu camino de aprendizaje</h2>
              <p className="text-sm text-muted-foreground">
                Foundations es gratis. Closer, Scaler y Creative Finance se desbloquean por compra individual o con el bundle.
              </p>
            </div>

            {/* Bundle banner — solo si no lo tiene completo aún */}
            {!ownsBundle && (
              <Card className="border-primary/40 bg-gradient-to-r from-primary/5 to-amber-500/5">
                <CardContent className="pt-6 pb-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-foreground">Bundle Creative — los 3 tracks avanzados</p>
                          <Badge variant="outline" className="text-xs border-primary/40 text-primary">Ahorra $294</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Closer + Scaler + Creative Finance. Acceso mientras dure tu suscripción a la plataforma.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground line-through">$1,791</p>
                        <p className="text-2xl font-bold text-foreground">$1,497</p>
                      </div>
                      <Button
                        onClick={() => startCheckout.mutate('bundle_creative')}
                        disabled={startCheckout.isPending}
                      >
                        {startCheckout.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando...</>
                        ) : (
                          'Obtener bundle'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {tracksLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track) => {
                  const isPaid = (['closer', 'scaler', 'creative_finance'] as PaidTrackSlug[]).includes(track.slug as PaidTrackSlug);
                  const userHasAccess = hasAccess(track.slug);
                  const foundationsGate = track.level_order > 1 && track.slug !== 'foundations' && !foundationsComplete;

                  // Bloqueado por paywall si: es de pago, no lo tiene, y ya pasó el gate de Foundations
                  const lockedByPaywall = isPaid && !userHasAccess && !foundationsGate;
                  const isLocked = foundationsGate || lockedByPaywall;

                  const productKey = isPaid ? (track.slug as AcademyProductKey) : null;
                  const pricing = productKey ? ACADEMY_PRICING[productKey] : null;

                  return (
                    <TrackCardWrapper
                      key={track.id}
                      track={track}
                      progress={progress}
                      isLocked={isLocked}
                      lockReason={
                        foundationsGate
                          ? 'Completa Foundations primero'
                          : lockedByPaywall
                            ? 'Compra requerida para acceder'
                            : undefined
                      }
                      onOpen={() => {
                        setSelectedTrack(track);
                        setTrackOpen(true);
                      }}
                      paywall={
                        lockedByPaywall && pricing && productKey
                          ? {
                              priceCents: pricing.priceCents,
                              isPurchasing: startCheckout.isPending && startCheckout.variables === productKey,
                              onPurchase: () => startCheckout.mutate(productKey),
                            }
                          : undefined
                      }
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

          {/* CERTIFICATES TAB */}
          <TabsContent value="certificates">
            <CertificatesTab />
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
  paywall,
}: {
  track: any;
  progress: { lesson_id: string; status: string }[];
  isLocked: boolean;
  lockReason?: string;
  onOpen: () => void;
  paywall?: {
    priceCents: number;
    onPurchase: () => void;
    isPurchasing?: boolean;
  };
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
      paywall={paywall}
    />
  );
}
