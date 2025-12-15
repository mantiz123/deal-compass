import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface DealPackageWithTracking {
  id: string;
  lead_id: string;
  buyer_id: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  response: string | null;
  buyer: {
    id: string;
    contact_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    tier: string;
  };
  lead: {
    id: string;
    piw_score: number | null;
    status: string;
    property: {
      address: string;
      city: string;
      state: string;
      zip_code: string;
    } | null;
  };
}

export function useDealPackageTracking(options?: { leadId?: string; buyerId?: string }) {
  return useQuery({
    queryKey: ['deal-package-tracking', options?.leadId, options?.buyerId],
    queryFn: async (): Promise<DealPackageWithTracking[]> => {
      let query = supabase
        .from('deal_packages')
        .select(`
          *,
          buyer:buyers(id, contact_name, company_name, email, phone, tier),
          lead:leads(id, piw_score, status, property:properties(address, city, state, zip_code))
        `)
        .order('sent_at', { ascending: false });

      if (options?.leadId) {
        query = query.eq('lead_id', options.leadId);
      }
      if (options?.buyerId) {
        query = query.eq('buyer_id', options.buyerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DealPackageWithTracking[];
    },
  });
}

export function useDealPackageStats() {
  return useQuery({
    queryKey: ['deal-package-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_packages')
        .select('*');

      if (error) throw error;

      const total = data.length;
      const opened = data.filter(d => d.opened_at).length;
      const clicked = data.filter(d => d.clicked_at).length;
      const responded = data.filter(d => d.response).length;

      return {
        total,
        opened,
        clicked,
        responded,
        openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      };
    },
  });
}

// Real-time subscription hook
export function useRealtimeDealPackages(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('deal-packages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deal_packages',
        },
        (payload) => {
          console.log('Deal package update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}

// Generate tracking URLs
export function generateTrackingUrls(packageId: string) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${baseUrl}/functions/v1/track-deal-package`;

  return {
    openPixel: `${functionUrl}?id=${packageId}&action=open`,
    clickUrl: (redirectTo: string) => 
      `${functionUrl}?id=${packageId}&action=click&redirect=${encodeURIComponent(redirectTo)}`,
  };
}
