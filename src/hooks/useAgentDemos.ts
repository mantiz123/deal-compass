import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type AgentPersona = 'sarah' | 'mike' | 'alex_discovery';
export type SellerPersona = 'motivated' | 'hostile' | 'undecided' | 'foreclosure' | 'absentee';
export type DemoStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface DemoTurn {
  speaker: 'agent' | 'seller';
  text: string;
}

export interface AgentDemo {
  id: string;
  agent_persona: AgentPersona;
  seller_persona: SellerPersona;
  language: 'en' | 'es';
  scenario_summary: string | null;
  transcript: DemoTurn[];
  audio_url: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  status: DemoStatus;
  error_message: string | null;
  created_at: string;
}

export const AGENT_LABELS: Record<AgentPersona, string> = {
  sarah: 'Sarah · Empática',
  mike: 'Mike · Directa',
  alex_discovery: 'Alex · Discovery',
};

export const SELLER_LABELS: Record<SellerPersona, string> = {
  motivated: 'Vendedor Motivado',
  hostile: 'Vendedor Hostil',
  undecided: 'Vendedor Indeciso',
  foreclosure: 'Pre-Foreclosure',
  absentee: 'Absentee Owner',
};

export function useAgentDemos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['agent-demos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_demos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AgentDemo[];
    },
    enabled: !!user,
  });
}

export function useGenerateAgentDemo() {
  const queryClient = useQueryClient();
  const orgId = useCurrentOrgIdSafe();
  return useMutation({
    mutationFn: async (params: {
      agent_persona: AgentPersona;
      seller_persona: SellerPersona;
      language: 'en' | 'es';
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-agent-demo', {
        body: { ...params, organization_id: orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-demos'] });
      toast.success('🎙️ Demo generado correctamente');
    },
    onError: (err: Error) => {
      toast.error(`Error generando demo: ${err.message}`);
    },
  });
}

export function useDeleteAgentDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (demoId: string) => {
      const { error } = await supabase.from('agent_demos').delete().eq('id', demoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-demos'] });
      toast.success('Demo eliminado');
    },
  });
}
