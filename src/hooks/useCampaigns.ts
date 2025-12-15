import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type LeadStatus = 'captacion' | 'contacto' | 'bajo_contrato' | 'cesion' | 'cerrado';

export interface DripCampaign {
  id: string;
  name: string;
  description: string | null;
  trigger_status: LeadStatus;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sequences?: CampaignSequence[];
  enrollments_count?: number;
}

export interface CampaignSequence {
  id: string;
  campaign_id: string;
  sequence_order: number;
  channel: 'email' | 'sms';
  delay_days: number;
  delay_hours: number;
  subject: string | null;
  content: string;
  created_at: string;
}

export interface CampaignEnrollment {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_sequence: number;
  status: 'active' | 'paused' | 'completed' | 'unsubscribed';
  enrolled_at: string;
  last_sent_at: string | null;
  next_send_at: string | null;
  completed_at: string | null;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drip_campaigns')
        .select(`
          *,
          sequences:campaign_sequences(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get enrollment counts
      const campaignsWithCounts = await Promise.all(
        (data || []).map(async (campaign) => {
          const { count } = await supabase
            .from('campaign_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);
          
          return {
            ...campaign,
            enrollments_count: count || 0,
          };
        })
      );

      return campaignsWithCounts as DripCampaign[];
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drip_campaigns')
        .select(`
          *,
          sequences:campaign_sequences(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as DripCampaign;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      trigger_status: LeadStatus;
      sequences: Omit<CampaignSequence, 'id' | 'campaign_id' | 'created_at'>[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('drip_campaigns')
        .insert({
          name: data.name,
          description: data.description || null,
          trigger_status: data.trigger_status,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create sequences
      if (data.sequences.length > 0) {
        const sequencesWithCampaignId = data.sequences.map((seq, index) => ({
          ...seq,
          campaign_id: campaign.id,
          sequence_order: index + 1,
        }));

        const { error: seqError } = await supabase
          .from('campaign_sequences')
          .insert(sequencesWithCampaignId);

        if (seqError) throw seqError;
      }

      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaña creada',
        description: 'La campaña de drip marketing se ha creado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la campaña',
        variant: 'destructive',
      });
      console.error('Error creating campaign:', error);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, description, is_active }: { 
      id: string; 
      name?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: campaign, error } = await supabase
        .from('drip_campaigns')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaña actualizada',
        description: 'Los cambios se han guardado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la campaña',
        variant: 'destructive',
      });
      console.error('Error updating campaign:', error);
    },
  });
}

export function useToggleCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('drip_campaigns')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: data.is_active ? 'Campaña activada' : 'Campaña pausada',
        description: data.is_active 
          ? 'La campaña comenzará a enviar mensajes' 
          : 'La campaña ha sido pausada',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la campaña',
        variant: 'destructive',
      });
      console.error('Error toggling campaign:', error);
    },
  });
}

export function useCampaignEnrollments(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-enrollments', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_enrollments')
        .select(`
          *,
          lead:leads(*, property:properties(*))
        `)
        .eq('campaign_id', campaignId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

export function useCampaignStats() {
  return useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const { data: campaigns } = await supabase
        .from('drip_campaigns')
        .select('id, is_active');

      const { count: totalEnrollments } = await supabase
        .from('campaign_enrollments')
        .select('id', { count: 'exact', head: true });

      const { count: activeEnrollments } = await supabase
        .from('campaign_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: messagesSent } = await supabase
        .from('campaign_message_logs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent');

      return {
        totalCampaigns: campaigns?.length || 0,
        activeCampaigns: campaigns?.filter(c => c.is_active).length || 0,
        totalEnrollments: totalEnrollments || 0,
        activeEnrollments: activeEnrollments || 0,
        messagesSent: messagesSent || 0,
      };
    },
  });
}
