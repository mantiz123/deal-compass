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

interface Props {
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

interface NodeData {
  stage: KCFYStage;
  status: 'done' | 'current' | 'pending' | 'dead';
  event?: KCFYStatusEvent;
  durationFromPrev?: string;
}

function buildNodes(events: KCFYStatusEvent[]): NodeData[] {
  const latestByStage = new Map<KCFYStage, KCFYStatusEvent>();
  for (const e of events) latestByStage.set(e.stage, e);

  const deadEvent = latestByStage.get('dead');
  const reachedStages = KCFY_STAGE_ORDER.filter((s) => latestByStage.has(s));
  const lastReached = reachedStages[reachedStages.length - 1];

  return KCFY_STAGE_ORDER.map((stage, idx) => {
    const event = latestByStage.get(stage);
    let status: NodeData['status'] = 'pending';
    if (event) {
      status = stage === lastReached && !deadEvent && stage !== 'closed' ? 'current' : 'done';
      if (stage === 'closed') status = 'done';
    }
    if (deadEvent && !event) status = 'dead';

    let durationFromPrev: string | undefined;
    if (event && idx > 0) {
      const prevReached = reachedStages.filter((s) => KCFY_STAGE_ORDER.indexOf(s) < idx).pop();
      if (prevReached) {
        const prevEvent = latestByStage.get(prevReached)!;
        const diff = new Date(event.created_at).getTime() - new Date(prevEvent.created_at).getTime();
        if (diff > 60_000) {
          durationFromPrev = formatDistanceStrict(
            new Date(event.created_at),
            new Date(prevEvent.created_at),
            { locale: es },
          );
        }
      }
    }

    return { stage, status, event, durationFromPrev };
  });
}

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function KCFYHorizontalTimeline({ kcfyRequestId, className }: Props) {
  const { data: events, isLoading } = useKCFYStatusEvents(kcfyRequestId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const all = events || [];
  const nodes = buildNodes(all);
  const deadEvent = all.find((e) => e.stage === 'dead');

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto pb-2">
        <ol className="flex items-start gap-0 min-w-max px-2">
          {nodes.map((node, idx) => {
            const Icon = STAGE_ICONS[node.stage];
            const meta = KCFY_STAGE_META[node.stage];
            const isDone = node.status === 'done';
            const isCurrent = node.status === 'current';
            const isDead = node.status === 'dead';
            const isLast = idx === nodes.length - 1;

            return (
              <li
                key={node.stage}
                className="relative flex flex-col items-center text-center animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms`, minWidth: 140 }}
              >
                {/* Connector line to next node */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute top-6 left-1/2 h-0.5 w-full',
                      nodes[idx + 1].status === 'done' || nodes[idx + 1].status === 'current'
                        ? 'bg-primary'
                        : isDead
                        ? 'bg-muted'
                        : 'bg-border',
                    )}
                    aria-hidden
                  />
                )}

                {/* Duration pill on the connector */}
                {!isLast && nodes[idx + 1].durationFromPrev && (
                  <span className="absolute top-3 left-[75%] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-background border border-border text-muted-foreground z-10">
                    {nodes[idx + 1].durationFromPrev}
                  </span>
                )}

                {/* Node circle */}
                <div
                  className={cn(
                    'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
                    isDone && 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20',
                    isCurrent &&
                      'border-primary bg-background text-primary ring-4 ring-primary/15 animate-pulse',
                    !isDone && !isCurrent && !isDead && 'border-border bg-background text-muted-foreground/60',
                    isDead && 'border-muted bg-muted/30 text-muted-foreground/40',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Label */}
                <div className="mt-2 px-1 max-w-[140px]">
                  <p
                    className={cn(
                      'text-xs font-semibold leading-tight',
                      isDone && 'text-foreground',
                      isCurrent && 'text-primary',
                      !isDone && !isCurrent && 'text-muted-foreground',
                    )}
                  >
                    {meta.label}
                  </p>
                  {isCurrent && (
                    <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      En curso
                    </span>
                  )}
                  {node.event && (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                      {format(new Date(node.event.created_at), "d MMM · HH:mm", { locale: es })}
                    </p>
                  )}
                  {node.event?.creator_name && (
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center">
                        {initials(node.event.creator_name)}
                      </div>
                      <span className="text-[10px] text-foreground/70 truncate max-w-[80px]">
                        {node.event.creator_name.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Dead state banner */}
      {deadEvent && (
        <div className="mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-3">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-destructive">Deal muerto</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(new Date(deadEvent.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
              {deadEvent.creator_name && <> · {deadEvent.creator_name}</>}
            </p>
            {deadEvent.note && (
              <p className="text-xs italic text-foreground/80 mt-1">"{deadEvent.note}"</p>
            )}
          </div>
        </div>
      )}

      {/* Latest note (current stage) */}
      {!deadEvent &&
        (() => {
          const current = nodes.filter((n) => n.event).pop();
          if (!current?.event?.note) return null;
          return (
            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
                Última actualización · {KCFY_STAGE_META[current.stage].label}
              </p>
              <p className="text-xs italic text-foreground/85">"{current.event.note}"</p>
            </div>
          );
        })()}
    </div>
  );
}
