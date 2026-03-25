import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, TrendingUp, TrendingDown, Minus, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSellerConversations,
  SellerConversation,
  urgencyLabels,
  flexibilityLabels,
} from '@/hooks/useSellerConversations';

interface ConversationHistoryProps {
  leadId: string;
}

export function ConversationHistory({ leadId }: ConversationHistoryProps) {
  const { data: conversations, isLoading, error } = useSellerConversations(leadId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Error al cargar el historial de conversaciones
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Sin conversaciones registradas</p>
        <p className="text-sm">Registra tu primera conversación con el seller para ajustar el K-Score</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Phone className="h-5 w-5" />
        Historial de Conversaciones ({conversations.length})
      </h3>
      
      {conversations.map((conversation) => (
        <ConversationCard key={conversation.id} conversation={conversation} />
      ))}
    </div>
  );
}

function ConversationCard({ conversation }: { conversation: SellerConversation }) {
  const scoreChange = (conversation.ai_adjusted_score ?? 0) - (conversation.previous_piw_score ?? 0);
  
  const getScoreChangeIcon = () => {
    if (scoreChange > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (scoreChange < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'desperate': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'moderate': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'none': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return '';
    }
  };

  const getFlexibilityColor = (flexibility: string) => {
    switch (flexibility) {
      case 'very_flexible': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'somewhat_flexible': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'firm': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'unrealistic': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return '';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {format(new Date(conversation.conversation_date), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
          </CardTitle>
          {conversation.ai_adjusted_score !== null && conversation.previous_piw_score !== null && (
            <div className="flex items-center gap-2">
              {getScoreChangeIcon()}
              <span className="text-sm text-muted-foreground">
                {conversation.previous_piw_score} → <span className="font-bold text-foreground">{conversation.ai_adjusted_score}</span>
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                scoreChange >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={getUrgencyColor(conversation.urgency_level)}>
            {urgencyLabels[conversation.urgency_level]}
          </Badge>
          <Badge variant="outline" className={getFlexibilityColor(conversation.price_flexibility)}>
            {flexibilityLabels[conversation.price_flexibility]}
          </Badge>
        </div>

        {/* Main Pain */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Dolor Principal:</p>
          <p className="text-sm">{conversation.main_pain}</p>
        </div>

        {/* Key Objection */}
        {conversation.key_objection && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Objeción Clave:</p>
            <p className="text-sm">{conversation.key_objection}</p>
          </div>
        )}

        {/* Prices */}
        {(conversation.seller_asking_price || conversation.our_offer_discussed) && (
          <div className="flex gap-4 text-sm">
            {conversation.seller_asking_price && (
              <div>
                <span className="text-muted-foreground">Pide: </span>
                <span className="font-medium">${conversation.seller_asking_price.toLocaleString()}</span>
              </div>
            )}
            {conversation.our_offer_discussed && (
              <div>
                <span className="text-muted-foreground">Oferta: </span>
                <span className="font-medium">${conversation.our_offer_discussed.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* AI Reason */}
        {conversation.ai_adjustment_reason && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Análisis IA:</p>
            <p className="text-sm">{conversation.ai_adjustment_reason}</p>
          </div>
        )}

        {/* Notes */}
        {conversation.notes && (
          <div className="text-sm text-muted-foreground italic">
            "{conversation.notes}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
