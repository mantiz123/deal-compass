import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, differenceInHours } from 'date-fns';

export type CriticalActionType = 'call_hot_lead' | 'chase_contract' | 'reactivate_buyer';

export interface CriticalAction {
  id: string;
  type: CriticalActionType;
  priority: number; // 0-100, higher = more urgent
  title: string;
  subtitle: string;
  reason: string;
  // Context for CTAs
  leadId?: string;
  contractId?: string;
  buyerId?: string;
  phone?: string | null;
  email?: string | null;
  signingToken?: string | null;
  contractType?: string;
  piwScore?: number | null;
  daysIdle?: number;
  // Raw entity for opening detail sheets
  entity?: any;
}

/**
 * Aggregates the most important next actions across the platform.
 * Combines: hot leads cooling off + unsigned contracts + premium buyers going stale.
 */
export function useCriticalActions(limit: number = 5) {
  return useQuery({
    queryKey: ['critical-actions', limit],
    queryFn: async (): Promise<CriticalAction[]> => {
      const actions: CriticalAction[] = [];

      // ---- 1. HOT LEADS COOLING OFF (K-Score >= 65, no contact recent) ----
      const { data: hotLeads } = await supabase
        .from('leads')
        .select('*, property:properties(*)')
        .is('archived_at', null)
        .gte('piw_score', 65)
        .order('piw_score', { ascending: false, nullsFirst: false })
        .limit(15);

      (hotLeads || []).forEach((lead: any) => {
        const piw = lead.piw_score || 0;
        const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at) : null;
        const created = new Date(lead.created_at);
        const referenceDate = lastContact || created;
        const daysIdle = differenceInDays(new Date(), referenceDate);

        // Only flag if cooling: no contact OR >2 days since last contact
        if (lastContact && daysIdle < 2) return;

        const phone =
          lead.property?.owner_phone ||
          lead.property?.phone_2 ||
          lead.property?.phone_3 ||
          null;

        // Priority formula: K-Score weight (60%) + recency penalty (40%)
        const recencyScore = Math.min(daysIdle * 8, 40);
        const priority = Math.round(piw * 0.6 + recencyScore);

        const reason = !lastContact
          ? `Lead K-${piw} sin contactar (${daysIdle}d desde captura)`
          : `Lead K-${piw} se está enfriando — último contacto hace ${daysIdle}d`;

        actions.push({
          id: `lead-${lead.id}`,
          type: 'call_hot_lead',
          priority,
          title: lead.property?.address || 'Sin dirección',
          subtitle: `${lead.property?.city || ''}, ${lead.property?.state || ''} • ${lead.property?.owner_name || 'Sin owner'}`,
          reason,
          leadId: lead.id,
          phone,
          piwScore: piw,
          daysIdle,
          entity: lead,
        });
      });

      // ---- 2. CONTRACTS SENT BUT UNSIGNED ----
      const { data: pendingContracts } = await supabase
        .from('contracts')
        .select('*, lead:leads(*, property:properties(*))')
        .in('status', ['sent', 'viewed'])
        .order('sent_at', { ascending: true, nullsFirst: false })
        .limit(15);

      (pendingContracts || []).forEach((contract: any) => {
        if (!contract.sent_at) return;
        const sentAt = new Date(contract.sent_at);
        const hoursSinceSent = differenceInHours(new Date(), sentAt);
        const daysSinceSent = Math.floor(hoursSinceSent / 24);

        // Skip if sent <12h ago — give it time
        if (hoursSinceSent < 12) return;

        // Priority: viewed (more engaged) > sent. Older = more urgent.
        const basePriority = contract.status === 'viewed' ? 70 : 55;
        const recencyBoost = Math.min(daysSinceSent * 5, 30);
        const priority = Math.min(basePriority + recencyBoost, 100);

        const property = contract.lead?.property;
        const statusLabel = contract.status === 'viewed' ? 'visto pero no firmado' : 'enviado sin abrir';
        const reason = `Contrato ${contract.contract_type} ${statusLabel} hace ${daysSinceSent}d — recordar firma`;

        actions.push({
          id: `contract-${contract.id}`,
          type: 'chase_contract',
          priority,
          title: property?.address || 'Contrato sin dirección',
          subtitle: `${contract.contract_type} • ${contract.seller_email || contract.seller_phone || 'Sin contacto seller'}`,
          reason,
          leadId: contract.lead_id,
          contractId: contract.id,
          contractType: contract.contract_type,
          email: contract.seller_email,
          phone: contract.seller_phone,
          signingToken: contract.signing_token,
          daysIdle: daysSinceSent,
          entity: contract,
        });
      });

      // ---- 3. PREMIUM BUYERS GOING STALE ----
      const { data: premiumBuyers } = await supabase
        .from('buyers')
        .select('*')
        .eq('is_active', true)
        .in('tier', ['platinum', 'gold'])
        .limit(20);

      // For each premium buyer, check last deal package sent
      if (premiumBuyers && premiumBuyers.length > 0) {
        const buyerIds = premiumBuyers.map(b => b.id);
        const { data: recentPackages } = await supabase
          .from('deal_packages')
          .select('buyer_id, sent_at')
          .in('buyer_id', buyerIds)
          .order('sent_at', { ascending: false });

        const lastPackageMap = new Map<string, Date>();
        (recentPackages || []).forEach((pkg: any) => {
          if (!lastPackageMap.has(pkg.buyer_id)) {
            lastPackageMap.set(pkg.buyer_id, new Date(pkg.sent_at));
          }
        });

        premiumBuyers.forEach((buyer: any) => {
          const lastPackage = lastPackageMap.get(buyer.id);
          const daysSince = lastPackage
            ? differenceInDays(new Date(), lastPackage)
            : 999;

          // Only flag if >14 days since last deal package
          if (daysSince < 14) return;

          // Priority: tier weight + staleness
          const tierWeight = buyer.tier === 'platinum' ? 65 : 50;
          const stalenessBoost = Math.min((daysSince - 14) * 2, 30);
          const priority = Math.min(tierWeight + stalenessBoost, 100);

          const reason = lastPackage
            ? `Buyer ${buyer.tier.toUpperCase()} sin deal package hace ${daysSince}d — reactivar`
            : `Buyer ${buyer.tier.toUpperCase()} nunca recibió un deal package`;

          actions.push({
            id: `buyer-${buyer.id}`,
            type: 'reactivate_buyer',
            priority,
            title: buyer.contact_name,
            subtitle: `${buyer.company_name || 'Sin empresa'} • Tier ${buyer.tier}`,
            reason,
            buyerId: buyer.id,
            phone: buyer.phone,
            email: buyer.email,
            daysIdle: daysSince === 999 ? undefined : daysSince,
            entity: buyer,
          });
        });
      }

      // Sort by priority descending and take top N
      return actions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, limit);
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
}
