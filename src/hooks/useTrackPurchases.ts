import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';

export type PaidTrackSlug = 'closer' | 'scaler' | 'creative_finance';
export type AcademyProductKey = PaidTrackSlug | 'bundle_creative';

export interface AcademyTrackPurchase {
  id: string;
  track_slug: PaidTrackSlug;
  source: 'individual' | 'bundle' | 'comp';
  amount_cents: number;
  currency: string;
  purchased_at: string;
  bundle_purchase_id: string | null;
}

export const ACADEMY_PRICING: Record<AcademyProductKey, {
  label: string;
  priceCents: number;
  tracks: PaidTrackSlug[];
  isBundle: boolean;
}> = {
  closer: { label: 'Closer Track', priceCents: 29700, tracks: ['closer'], isBundle: false },
  scaler: { label: 'Scaler Track', priceCents: 49700, tracks: ['scaler'], isBundle: false },
  creative_finance: { label: 'Creative Finance Track', priceCents: 99700, tracks: ['creative_finance'], isBundle: false },
  bundle_creative: { label: 'Bundle Creative (3 tracks)', priceCents: 149700, tracks: ['closer', 'scaler', 'creative_finance'], isBundle: true },
};

const PAID_TRACKS: PaidTrackSlug[] = ['closer', 'scaler', 'creative_finance'];

/**
 * Trae las compras del usuario y expone helpers de acceso.
 */
export function useTrackPurchases() {
  const query = useQuery({
    queryKey: ['academy-track-purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_track_purchases')
        .select('id, track_slug, source, amount_cents, currency, purchased_at, bundle_purchase_id')
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademyTrackPurchase[];
    },
  });

  const ownedSlugs = new Set((query.data ?? []).map((p) => p.track_slug));
  const ownsBundle = PAID_TRACKS.every((t) => ownedSlugs.has(t)) &&
    (query.data ?? []).some((p) => p.source === 'bundle');

  const hasAccess = (slug: string) => {
    if (slug === 'foundations') return true;
    return ownedSlugs.has(slug as PaidTrackSlug);
  };

  return {
    ...query,
    purchases: query.data ?? [],
    ownedSlugs,
    ownsBundle,
    hasAccess,
  };
}

/**
 * Inicia checkout de Stripe para un track o bundle.
 */
export function useStartAcademyCheckout() {
  return useMutation({
    mutationFn: async (productKey: AcademyProductKey) => {
      const { data, error } = await supabase.functions.invoke('create-academy-checkout', {
        body: { product_key: productKey, returnUrl: window.location.origin },
      });
      if (error) throw error;
      if (data?.already_owned) throw new Error('Ya tienes acceso a este contenido.');
      if (!data?.url) throw new Error('No se pudo crear la sesión de pago.');
      return data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e: Error) => {
      toast.error(e.message || 'No se pudo iniciar el pago');
    },
  });
}

/**
 * Hook para invalidar compras tras retorno exitoso de Stripe.
 */
export function useRefreshPurchasesAfterCheckout() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['academy-track-purchases'] });
  };
}
