import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle2, Sparkles, Clock, DollarSign, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type State = {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
  is_live: boolean;
  kcfy_available: boolean;
  unlock_method: string;
  unlock_price_cents: number | null;
  unlock_deals_required: number | null;
  description: string | null;
};

interface StateCardProps {
  state: State;
  isActivated: boolean;
  isOnWaitlist: boolean;
  foundationsComplete: boolean;
  onActivate: () => void;
  onJoinWaitlist: () => void;
  onOpenPack: () => void;
  isPending?: boolean;
}

export function StateCard({
  state,
  isActivated,
  isOnWaitlist,
  foundationsComplete,
  onActivate,
  onJoinWaitlist,
  onOpenPack,
  isPending,
}: StateCardProps) {
  const renderUnlockBadge = () => {
    switch (state.unlock_method) {
      case 'free':
        return (
          <Badge variant="outline" className="border-success text-success">
            <Sparkles className="h-3 w-3 mr-1" /> Gratis
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <DollarSign className="h-3 w-3 mr-1" />
            ${(state.unlock_price_cents! / 100).toFixed(0)} USD
          </Badge>
        );
      case 'deals_milestone':
        return (
          <Badge variant="outline" className="border-primary text-primary">
            <Trophy className="h-3 w-3 mr-1" />
            {state.unlock_deals_required} deal{state.unlock_deals_required! > 1 ? 's' : ''}
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderActionButton = () => {
    if (isActivated) {
      return (
        <Button onClick={onOpenPack} variant="default" className="w-full">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Abrir State Pack
        </Button>
      );
    }
    if (!state.is_live) {
      return (
        <Button
          onClick={onJoinWaitlist}
          variant="outline"
          className="w-full"
          disabled={isOnWaitlist || isPending}
        >
          <Clock className="h-4 w-4 mr-2" />
          {isOnWaitlist ? 'En lista de espera' : 'Únete a la waitlist'}
        </Button>
      );
    }
    if (state.unlock_method === 'free' && !foundationsComplete) {
      return (
        <Button variant="outline" className="w-full" disabled>
          <Lock className="h-4 w-4 mr-2" />
          Completa Foundations
        </Button>
      );
    }
    if (state.unlock_method === 'free') {
      return (
        <Button onClick={onActivate} variant="default" className="w-full" disabled={isPending}>
          <Sparkles className="h-4 w-4 mr-2" />
          Activar Alabama
        </Button>
      );
    }
    return (
      <Button variant="outline" className="w-full" disabled>
        <Lock className="h-4 w-4 mr-2" />
        Bloqueado
      </Button>
    );
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isActivated && 'border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
        !state.is_live && 'opacity-75'
      )}
    >
      {/* Status ribbon */}
      {!state.is_live && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-xs">
            Coming Soon
          </Badge>
        </div>
      )}
      {state.is_live && state.kcfy_available && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-success/20 text-success border-success/30 text-xs">
            KCFY Live
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="text-5xl">{state.flag_emoji ?? '📍'}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground">{state.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-mono">
                {state.code}
              </Badge>
              {renderUnlockBadge()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {state.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {state.description}
          </p>
        )}
        {renderActionButton()}
      </CardContent>
    </Card>
  );
}
