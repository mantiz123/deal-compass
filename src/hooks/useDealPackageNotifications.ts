import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface DealPackagePayload {
  id: string;
  lead_id: string;
  buyer_id: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  response: string | null;
}

export function useDealPackageNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const previousStatesRef = useRef<Map<string, { opened_at: string | null; clicked_at: string | null }>>(new Map());

  useEffect(() => {
    console.log('Setting up deal package realtime subscription...');

    const channel = supabase
      .channel('deal-package-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deal_packages',
        },
        async (payload) => {
          console.log('Deal package update received:', payload);
          
          const newData = payload.new as DealPackagePayload;
          const oldData = payload.old as Partial<DealPackagePayload>;
          
          // Check if opened_at was just set (was null, now has value)
          if (!oldData.opened_at && newData.opened_at) {
            // Fetch buyer name for notification
            const { data: buyer } = await supabase
              .from('buyers')
              .select('contact_name, company_name')
              .eq('id', newData.buyer_id)
              .maybeSingle();

            const { data: lead } = await supabase
              .from('leads')
              .select('properties:property_id(address)')
              .eq('id', newData.lead_id)
              .maybeSingle();

            const buyerName = buyer?.company_name || buyer?.contact_name || 'Un comprador';
            const propertyAddress = (lead?.properties as any)?.address || 'una propiedad';

            toast({
              title: '📬 Deal Package Abierto',
              description: `${buyerName} abrió el deal package de ${propertyAddress}`,
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['buyer-deals'] });
            queryClient.invalidateQueries({ queryKey: ['deal-packages'] });
          }

          // Check if clicked_at was just set (was null, now has value)
          if (!oldData.clicked_at && newData.clicked_at) {
            const { data: buyer } = await supabase
              .from('buyers')
              .select('contact_name, company_name')
              .eq('id', newData.buyer_id)
              .maybeSingle();

            const { data: lead } = await supabase
              .from('leads')
              .select('properties:property_id(address)')
              .eq('id', newData.lead_id)
              .maybeSingle();

            const buyerName = buyer?.company_name || buyer?.contact_name || 'Un comprador';
            const propertyAddress = (lead?.properties as any)?.address || 'una propiedad';

            toast({
              title: '🔥 Click en Deal Package',
              description: `${buyerName} hizo click en el deal de ${propertyAddress}`,
              variant: 'default',
            });

            queryClient.invalidateQueries({ queryKey: ['buyer-deals'] });
            queryClient.invalidateQueries({ queryKey: ['deal-packages'] });
          }

          // Check for response updates
          if (!oldData.response && newData.response) {
            const { data: buyer } = await supabase
              .from('buyers')
              .select('contact_name, company_name')
              .eq('id', newData.buyer_id)
              .maybeSingle();

            const buyerName = buyer?.company_name || buyer?.contact_name || 'Un comprador';

            if (newData.response === 'accepted') {
              toast({
                title: '✅ Deal Aceptado',
                description: `${buyerName} aceptó el deal package`,
              });
            } else if (newData.response === 'rejected') {
              toast({
                title: '❌ Deal Rechazado',
                description: `${buyerName} rechazó el deal package`,
                variant: 'destructive',
              });
            }

            queryClient.invalidateQueries({ queryKey: ['buyer-deals'] });
            queryClient.invalidateQueries({ queryKey: ['deal-packages'] });
            queryClient.invalidateQueries({ queryKey: ['buyers'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('Deal package subscription status:', status);
      });

    return () => {
      console.log('Cleaning up deal package subscription...');
      supabase.removeChannel(channel);
    };
  }, [toast, queryClient]);
}
