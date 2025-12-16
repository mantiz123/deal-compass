import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SellerUrgencyLevel = 'desperate' | 'high' | 'moderate' | 'low' | 'none';
export type PriceFlexibility = 'very_flexible' | 'somewhat_flexible' | 'firm' | 'unrealistic';

export interface SellerConversation {
  id: string;
  lead_id: string;
  conversation_date: string;
  urgency_level: SellerUrgencyLevel;
  main_pain: string;
  key_objection: string | null;
  price_flexibility: PriceFlexibility;
  seller_asking_price: number | null;
  our_offer_discussed: number | null;
  notes: string | null;
  ai_adjusted_score: number | null;
  ai_adjustment_reason: string | null;
  previous_piw_score: number | null;
  created_by: string | null;
  created_at: string;
}

export interface LogConversationInput {
  leadId: string;
  urgencyLevel: SellerUrgencyLevel;
  mainPain: string;
  keyObjection?: string;
  priceFlexibility: PriceFlexibility;
  sellerAskingPrice?: number;
  ourOfferDiscussed?: number;
  notes?: string;
  currentPiwScore: number;
}

export interface AdjustmentResult {
  success: boolean;
  previousScore: number;
  adjustedScore: number;
  adjustment: number;
  reason: string;
  dealProbability: 'ALTA' | 'MEDIA' | 'BAJA';
  recommendedAction: string;
  conversationId: string;
}

// Fetch conversations for a lead
export function useSellerConversations(leadId: string | undefined) {
  return useQuery({
    queryKey: ['seller-conversations', leadId],
    queryFn: async (): Promise<SellerConversation[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('seller_conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('conversation_date', { ascending: false });

      if (error) throw error;
      return data as SellerConversation[];
    },
    enabled: !!leadId,
  });
}

// Log a new conversation and get AI-adjusted score
export function useLogConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LogConversationInput): Promise<AdjustmentResult> => {
      const { data, error } = await supabase.functions.invoke('adjust-piw-score-conversation', {
        body: input,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as AdjustmentResult;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-conversations', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      const scoreChange = data.adjustment >= 0 ? `+${data.adjustment}` : `${data.adjustment}`;
      toast.success(
        `PIW-Score ajustado: ${data.previousScore} → ${data.adjustedScore} (${scoreChange})`,
        { description: data.reason }
      );
    },
    onError: (error) => {
      console.error('Error logging conversation:', error);
      toast.error('Error al registrar la conversación', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    },
  });
}

// Get latest conversation for a lead
export function useLatestConversation(leadId: string | undefined) {
  return useQuery({
    queryKey: ['seller-conversations', leadId, 'latest'],
    queryFn: async (): Promise<SellerConversation | null> => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('seller_conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('conversation_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SellerConversation | null;
    },
    enabled: !!leadId,
  });
}

// Labels for display
export const urgencyLabels: Record<SellerUrgencyLevel, string> = {
  desperate: '🔥 Desesperado',
  high: '⚡ Alta',
  moderate: '📊 Moderada',
  low: '📉 Baja',
  none: '❄️ Ninguna',
};

export const flexibilityLabels: Record<PriceFlexibility, string> = {
  very_flexible: '✅ Muy Flexible',
  somewhat_flexible: '🟡 Algo Flexible',
  firm: '🟠 Firme',
  unrealistic: '🔴 Irreal',
};
