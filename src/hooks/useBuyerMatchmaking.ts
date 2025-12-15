import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { Lead } from './useLeads';

export type Buyer = Tables<'buyers'>;
export type DealPackage = Tables<'deal_packages'>;

interface MatchedBuyer extends Buyer {
  matchScore: number;
  matchReasons: string[];
}

// Algoritmo de matchmaking que pondera criterios del comprador con las características del lead
function calculateBuyerMatchScore(buyer: Buyer, lead: Lead): { score: number; reasons: string[] } {
  const property = lead.property;
  if (!property) return { score: 0, reasons: ['Sin datos de propiedad'] };

  let score = 0;
  const reasons: string[] = [];
  const maxScore = 100;

  // 1. ZIP Code Match (30 puntos)
  if (buyer.preferred_zip_codes && buyer.preferred_zip_codes.length > 0) {
    if (buyer.preferred_zip_codes.includes(property.zip_code)) {
      score += 30;
      reasons.push(`✓ ZIP ${property.zip_code} en zona preferida`);
    } else {
      reasons.push(`✗ ZIP ${property.zip_code} fuera de zona`);
    }
  } else {
    score += 15; // Sin preferencia = neutral
    reasons.push('○ Sin preferencia de zona');
  }

  // 2. Property Type Match (20 puntos)
  if (buyer.preferred_property_types && buyer.preferred_property_types.length > 0) {
    if (buyer.preferred_property_types.includes(property.property_type)) {
      score += 20;
      reasons.push(`✓ Tipo ${property.property_type} preferido`);
    } else {
      reasons.push(`✗ Tipo ${property.property_type} no preferido`);
    }
  } else {
    score += 10;
    reasons.push('○ Sin preferencia de tipo');
  }

  // 3. ARV Range Match (25 puntos)
  if (property.arv) {
    const arv = Number(property.arv);
    const minArv = buyer.min_arv ? Number(buyer.min_arv) : 0;
    const maxArv = buyer.max_arv ? Number(buyer.max_arv) : Infinity;

    if (arv >= minArv && arv <= maxArv) {
      score += 25;
      reasons.push(`✓ ARV $${arv.toLocaleString()} dentro del rango`);
    } else if (arv < minArv) {
      // Partial score if close
      const diff = (minArv - arv) / minArv;
      if (diff < 0.2) {
        score += 10;
        reasons.push(`◐ ARV ligeramente bajo del mínimo`);
      } else {
        reasons.push(`✗ ARV $${arv.toLocaleString()} muy bajo`);
      }
    } else {
      const diff = (arv - maxArv) / maxArv;
      if (diff < 0.2) {
        score += 10;
        reasons.push(`◐ ARV ligeramente sobre el máximo`);
      } else {
        reasons.push(`✗ ARV $${arv.toLocaleString()} muy alto`);
      }
    }
  } else {
    score += 5;
    reasons.push('○ Sin ARV calculado');
  }

  // 4. Buyer Performance (15 puntos) - basado en historial
  if (buyer.deals_closed && buyer.deals_closed > 0) {
    const closedBonus = Math.min(buyer.deals_closed * 1.5, 15);
    score += closedBonus;
    reasons.push(`✓ ${buyer.deals_closed} deals cerrados previamente`);
  }

  // 5. Buyer Tier Bonus (10 puntos)
  const tierBonus: Record<string, number> = {
    platinum: 10,
    gold: 7,
    silver: 4,
    bronze: 2,
  };
  score += tierBonus[buyer.tier] || 0;

  // 6. Repair Level Consideration (ajuste)
  if (buyer.max_repair_level && property.repair_cost) {
    const repairCost = Number(property.repair_cost);
    const repairLevel = buyer.max_repair_level.toLowerCase();
    
    if (repairLevel === 'light' && repairCost > 30000) {
      score -= 10;
      reasons.push(`✗ Reparaciones ($${repairCost.toLocaleString()}) exceden nivel light`);
    } else if (repairLevel === 'medium' && repairCost > 60000) {
      score -= 5;
      reasons.push(`◐ Reparaciones altas para nivel medium`);
    } else {
      reasons.push(`✓ Nivel de reparación compatible`);
    }
  }

  // Normalizar score
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return { score: finalScore, reasons };
}

export function useBuyerMatchmaking(lead: Lead | null) {
  return useQuery({
    queryKey: ['buyer-matchmaking', lead?.id],
    queryFn: async (): Promise<MatchedBuyer[]> => {
      if (!lead) return [];

      const { data: buyers, error } = await supabase
        .from('buyers')
        .select('*')
        .eq('is_active', true)
        .order('tier', { ascending: true });

      if (error) throw error;
      if (!buyers) return [];

      // Calcular match score para cada comprador
      const matchedBuyers = buyers.map(buyer => {
        const { score, reasons } = calculateBuyerMatchScore(buyer, lead);
        return {
          ...buyer,
          matchScore: score,
          matchReasons: reasons,
        };
      });

      // Ordenar por match score descendente y tomar los top 10
      return matchedBuyers
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);
    },
    enabled: !!lead?.id,
  });
}

export function useSendDealPackage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      leadId,
      buyerIds,
      channels,
    }: {
      leadId: string;
      buyerIds: string[];
      channels: ('email' | 'sms' | 'whatsapp')[];
    }) => {
      // Crear registros de deal_packages para tracking
      const packages: TablesInsert<'deal_packages'>[] = buyerIds.map(buyerId => ({
        lead_id: leadId,
        buyer_id: buyerId,
      }));

      const { data, error } = await supabase
        .from('deal_packages')
        .insert(packages)
        .select();

      if (error) throw error;

      // TODO: Cuando se configuren las APIs, llamar a edge function para enviar mensajes
      // Por ahora solo registramos el intento
      console.log('Deal packages created:', data);
      console.log('Channels selected:', channels);

      return { packages: data, channelsConfigured: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-packages'] });
      
      if (!result.channelsConfigured) {
        toast({
          title: 'Deal Packages Registrados',
          description: `Se registraron ${result.packages.length} paquetes. Configura las APIs de comunicación para enviar automáticamente.`,
        });
      } else {
        toast({
          title: 'Deal Packages Enviados',
          description: `Se enviaron ${result.packages.length} paquetes a los compradores seleccionados.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudieron crear los deal packages',
        variant: 'destructive',
      });
      console.error('Error sending deal packages:', error);
    },
  });
}

export function useDealPackages(leadId?: string) {
  return useQuery({
    queryKey: ['deal-packages', leadId],
    queryFn: async () => {
      let query = supabase
        .from('deal_packages')
        .select(`
          *,
          buyer:buyers(*)
        `)
        .order('sent_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !leadId || !!leadId,
  });
}

export function useBuyerStats() {
  return useQuery({
    queryKey: ['buyer-stats'],
    queryFn: async () => {
      const { data: buyers, error } = await supabase
        .from('buyers')
        .select('*');

      if (error) throw error;
      if (!buyers) return null;

      const totalBuyers = buyers.length;
      const activeBuyers = buyers.filter(b => b.is_active).length;
      const avgCloseTime = buyers.reduce((sum, b) => sum + (b.avg_close_time_days || 0), 0) / (buyers.filter(b => b.avg_close_time_days).length || 1);
      const totalVolume = buyers.reduce((sum, b) => sum + Number(b.total_volume || 0), 0);
      const totalDeals = buyers.reduce((sum, b) => sum + (b.deals_closed || 0), 0);

      return {
        totalBuyers,
        activeBuyers,
        avgCloseTime: Math.round(avgCloseTime),
        totalVolume,
        totalDeals,
      };
    },
  });
}
