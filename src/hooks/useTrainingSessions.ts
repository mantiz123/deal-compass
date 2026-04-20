import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TrainingPersona =
  | 'DESPERATE_FORECLOSURE'
  | 'SKEPTICAL_PROBATE'
  | 'TIRE_KICKER_GREEDY'
  | 'CONFUSED_ELDERLY'
  | 'UNKNOWN';

export interface TrainingSession {
  id: string;
  user_id: string;
  persona: TrainingPersona;
  outcome: string | null;
  agent_score: number | null;
  strengths: string[];
  weaknesses: string[];
  final_offer: number | null;
  would_close: boolean | null;
  duration_seconds: number;
  transcript: any;
  elevenlabs_conversation_id: string | null;
  raw_result_tag: string | null;
  created_at: string;
}

export interface CreateTrainingSessionInput {
  persona: TrainingPersona;
  outcome?: string | null;
  agent_score?: number | null;
  strengths?: string[];
  weaknesses?: string[];
  final_offer?: number | null;
  would_close?: boolean | null;
  duration_seconds: number;
  transcript: any;
  elevenlabs_conversation_id?: string | null;
  raw_result_tag?: string | null;
}

export function useTrainingSessions() {
  return useQuery({
    queryKey: ['training_sessions'],
    queryFn: async (): Promise<TrainingSession[]> => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as TrainingSession[];
    },
  });
}

export function useTrainingStats() {
  return useQuery({
    queryKey: ['training_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('agent_score, would_close')
        .not('agent_score', 'is', null);
      if (error) throw error;

      const sessions = data || [];
      const totalCalls = sessions.length;
      const avgScore = totalCalls > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.agent_score || 0), 0) / totalCalls)
        : 0;
      const closeRate = totalCalls > 0
        ? Math.round((sessions.filter((s) => s.would_close).length / totalCalls) * 100)
        : 0;

      return { totalCalls, avgScore, closeRate };
    },
  });
}

export function useCreateTrainingSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTrainingSessionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['training_stats'] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'No se pudo guardar sesión', description: err.message });
    },
  });
}

/**
 * Parses the [TRAINING_RESULT: {...}] tag injected by the Seller Simulator agent
 * at the end of every training conversation.
 *
 * Example tag:
 *   [TRAINING_RESULT: {"persona":"DESPERATE_FORECLOSURE","outcome":"closed_at_152k",
 *   "agent_score":85,"strengths":["empathy","good rapport"],
 *   "weaknesses":["didn't ask about timeline"],"final_offer":152000,"would_close":true}]
 */
export function parseTrainingResult(transcriptText: string): {
  persona: TrainingPersona;
  outcome: string | null;
  agent_score: number | null;
  strengths: string[];
  weaknesses: string[];
  final_offer: number | null;
  would_close: boolean | null;
  raw_tag: string | null;
} {
  const fallback = {
    persona: 'UNKNOWN' as TrainingPersona,
    outcome: null,
    agent_score: null,
    strengths: [],
    weaknesses: [],
    final_offer: null,
    would_close: null,
    raw_tag: null,
  };

  // Match [TRAINING_RESULT: {...}] (greedy on the JSON body)
  const match = transcriptText.match(/\[TRAINING_RESULT:\s*(\{[\s\S]*?\})\s*\]/);
  if (!match) return fallback;

  try {
    const parsed = JSON.parse(match[1]);
    const validPersonas: TrainingPersona[] = [
      'DESPERATE_FORECLOSURE',
      'SKEPTICAL_PROBATE',
      'TIRE_KICKER_GREEDY',
      'CONFUSED_ELDERLY',
    ];
    const persona: TrainingPersona = validPersonas.includes(parsed.persona)
      ? parsed.persona
      : 'UNKNOWN';

    return {
      persona,
      outcome: typeof parsed.outcome === 'string' ? parsed.outcome : null,
      agent_score: typeof parsed.agent_score === 'number' ? parsed.agent_score : null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
      final_offer: typeof parsed.final_offer === 'number' ? parsed.final_offer : null,
      would_close: typeof parsed.would_close === 'boolean' ? parsed.would_close : null,
      raw_tag: match[0],
    };
  } catch (e) {
    console.error('Failed to parse TRAINING_RESULT:', e);
    return { ...fallback, raw_tag: match[0] };
  }
}

export const PERSONA_LABELS: Record<TrainingPersona, { name: string; emoji: string; color: string }> = {
  DESPERATE_FORECLOSURE: { name: 'Robert (Foreclosure desesperado)', emoji: '🔥', color: 'destructive' },
  SKEPTICAL_PROBATE: { name: 'Linda (Probate desconfiada)', emoji: '🤨', color: 'warning' },
  TIRE_KICKER_GREEDY: { name: 'Mike (Tire-kicker codicioso)', emoji: '💸', color: 'secondary' },
  CONFUSED_ELDERLY: { name: 'Dorothy (Anciana confundida)', emoji: '👵', color: 'accent' },
  UNKNOWN: { name: 'Persona desconocida', emoji: '❓', color: 'muted' },
};
