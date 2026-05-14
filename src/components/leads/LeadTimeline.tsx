import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Interaction } from '@/hooks/useInteractions';

interface LeadTimelineProps {
  interactions: Interaction[];
  className?: string;
}

const interactionIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  note: FileText,
  offer: DollarSign,
  followup: Clock,
  meeting: User,
};

const sentimentColors: Record<string, string> = {
  positive: 'text-success border-success/30 bg-success/10',
  negative: 'text-destructive border-destructive/30 bg-destructive/10',
  neutral: 'text-muted-foreground border-border bg-secondary/50',
};

export function LeadTimeline({ interactions, className }: LeadTimelineProps) {
  if (!interactions.length) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No hay actividad registrada</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {interactions.map((interaction, index) => {
          const Icon = interactionIcons[interaction.interaction_type] || MessageSquare;
          const sentimentClass = sentimentColors[interaction.sentiment || 'neutral'];
          const isIncoming = interaction.direction === 'incoming';

          return (
            <div key={interaction.id} className="relative flex gap-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              {/* Icon */}
              <div className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2',
                sentimentClass
              )}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium capitalize">
                    {interaction.interaction_type}
                  </span>
                  {isIncoming ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      Entrante
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      Saliente
                    </span>
                  )}
                  {interaction.sentiment && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full capitalize',
                      interaction.sentiment === 'positive' && 'bg-success/20 text-success',
                      interaction.sentiment === 'negative' && 'bg-destructive/20 text-destructive',
                      interaction.sentiment === 'neutral' && 'bg-secondary text-secondary-foreground'
                    )}>
                      {interaction.sentiment === 'positive' ? 'Positivo' : 
                       interaction.sentiment === 'negative' ? 'Negativo' : 'Neutral'}
                    </span>
                  )}
                </div>

                {interaction.content && (() => {
                  if (interaction.interaction_type === 'email' && /^\[(SENT|FAILED)\]/.test(interaction.content)) {
                    const c = interaction.content;
                    const failed = c.startsWith('[FAILED]');
                    const get = (k: string) => {
                      const m = c.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
                      return m?.[1]?.trim();
                    };
                    const to = get('To');
                    const bcc = get('BCC');
                    const replyTo = get('Reply-To');
                    const subject = get('Subject');
                    const error = get('Error');
                    const bodyIdx = c.indexOf('\n\n');
                    const body = bodyIdx >= 0 ? c.slice(bodyIdx + 2) : '';
                    return (
                      <div className="space-y-2 mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            failed ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
                          )}>
                            {failed ? 'Envío fallido' : 'Email enviado'}
                          </span>
                          {to && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">To: {to}</span>}
                          {bcc && bcc !== '-' && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">BCC: {bcc}</span>}
                          {replyTo && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Reply-To: {replyTo}</span>}
                        </div>
                        {subject && <p className="text-sm font-medium">{subject}</p>}
                        {error && <p className="text-xs text-destructive">Error: {error}</p>}
                        {body && (
                          <details className="text-sm text-muted-foreground">
                            <summary className="cursor-pointer text-xs hover:text-foreground">Ver contenido del email</summary>
                            <p className="mt-2 whitespace-pre-wrap">{body}</p>
                          </details>
                        )}
                      </div>
                    );
                  }
                  return (
                    <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                      {interaction.content}
                    </p>
                  );
                })()}

                <p className="text-xs text-muted-foreground">
                  {format(new Date(interaction.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
