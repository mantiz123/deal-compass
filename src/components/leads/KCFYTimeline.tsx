import { format, formatDistanceStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Send,
  CheckCircle2,
  Phone,
  MessageSquare,
  FileSignature,
  Users,
  Trophy,
  XCircle,
  Circle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  KCFY_STAGE_META,
  KCFY_STAGE_ORDER,
  useKCFYStatusEvents,
  type KCFYStage,
  type KCFYStatusEvent,
} from '@/hooks/useKCFYStatusEvents';

interface KCFYTimelineProps {
  kcfyRequestId: string;
  className?: string;
}

const STAGE_ICONS: Record<KCFYStage, React.ElementType> = {
  submitted: Send,
  accepted: CheckCircle2,
  contacting_seller: Phone,
  negotiating: MessageSquare,
  under_contract: FileSignature,
  buyer_secured: Users,
  closed: Trophy,
  dead: XCircle,
};

interface StageRow {
  stage: KCFYStage;
  status: 'done' | 'current' | 'pending' | 'dead';
  event?: KCFYStatusEvent;
  durationFromPrev?: string;
}

function buildRows(events: KCFYStatusEvent[]): StageRow[] {
  // Latest event per stage
  const latestByStage = new Map<KCFYStage, KCFYStatusEvent>();
  for (const e of events) latestByStage.set(e.stage, e);

  // Si hay "dead", mostramos pipeline normal hasta donde llegó + evento dead aparte
  const deadEvent = latestByStage.get('dead');
  const reachedStages = KCFY_STAGE_ORDER.filter((s) => latestByStage.has(s));
  const lastReached = reachedStages[reachedStages.length - 1];

  const rows: StageRow[] = KCFY_STAGE_ORDER.map((stage, idx) => {
    const event = latestByStage.get(stage);
    let status: StageRow['status'] = 'pending';
    if (event) {
      status = stage === lastReached && !deadEvent && stage !== 'closed' ? 'current' : 'done';
      if (stage === 'closed') status = 'done';
    }

    // Duración desde la etapa anterior alcanzada
    let durationFromPrev: string | undefined;
    if (event && idx > 0) {
      const prevReached = reachedStages.filter((s) => KCFY_STAGE_ORDER.indexOf(s) < idx).pop();
      if (prevReached) {
        const prevEvent = latestByStage.get(prevReached)!;
        const diff = new Date(event.created_at).getTime() - new Date(prevEvent.created_at).getTime();
        if (diff > 60_000) {
          durationFromPrev = formatDistanceStrict(new Date(event.created_at), new Date(prevEvent.created_at), {
            locale: es,
          });
        }
      }
    }

    return { stage, status, event, durationFromPrev };
  });

  // Si está muerto, marcar etapas pendientes como "dead"
  if (deadEvent) {
    return rows.map((r) => (r.status === 'pending' ? { ...r, status: 'dead' as const } : r));
  }
  return rows;
}

export function KCFYTimeline({ kcfyRequestId, className }: KCFYTimelineProps) {
  const { data: events, isLoading } = useKCFYStatusEvents(kcfyRequestId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allEvents = events || [];
  const rows = buildRows(allEvents);
  const deadEvent = allEvents.find((e) => e.stage === 'dead');

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" aria-hidden />

      <ol className="space-y-5">
        {rows.map((row, idx) => {
          const Icon = STAGE_ICONS[row.stage];
          const meta = KCFY_STAGE_META[row.stage];
          const isDone = row.status === 'done';
          const isCurrent = row.status === 'current';
          const isDead = row.status === 'dead';

          return (
            <li key={row.stage} className="relative flex gap-4 animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isDone && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-background text-primary animate-pulse',
                  !isDone && !isCurrent && !isDead && 'border-border bg-background text-muted-foreground',
                  isDead && 'border-muted bg-muted/40 text-muted-foreground/60',
                )}
              >
                {isDone ? (
                  <Icon className="h-4 w-4" />
                ) : isCurrent ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      'font-medium text-sm',
                      isDone && 'text-foreground',
                      isCurrent && 'text-primary',
                      !isDone && !isCurrent && 'text-muted-foreground',
                    )}
                  >
                    {meta.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      En curso
                    </span>
                  )}
                  {row.durationFromPrev && isDone && (
                    <span className="text-xs text-muted-foreground">· {row.durationFromPrev}</span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>

                {row.event && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(row.event.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                      {row.event.creator_name && (
                        <> · <span className="text-foreground/70">{row.event.creator_name}</span></>
                      )}
                    </p>
                    {row.event.note && (
                      <p className="text-xs italic text-foreground/80 bg-muted/40 rounded px-2 py-1 mt-1">
                        "{row.event.note}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}

        {/* Dead state como fila final */}
        {deadEvent && (
          <li className="relative flex gap-4">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 text-destructive">
              <XCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm text-destructive">Deal muerto</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(deadEvent.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                {deadEvent.creator_name && <> · <span className="text-foreground/70">{deadEvent.creator_name}</span></>}
              </p>
              {deadEvent.note && (
                <p className="text-xs italic text-foreground/80 bg-destructive/5 border border-destructive/20 rounded px-2 py-1 mt-1">
                  "{deadEvent.note}"
                </p>
              )}
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
