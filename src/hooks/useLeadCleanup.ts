import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CleanupLogEntry {
  id: string;
  lead_id: string | null;
  property_address: string | null;
  property_city: string | null;
  action: string;
  reason: string;
  notes: string | null;
  lead_data: any;
  created_at: string;
}

export function useCleanupStats() {
  return useQuery({
    queryKey: ['cleanup-stats'],
    queryFn: async () => {
      // Total leads ever processed (archived + deleted)
      const { data: allLogs, error } = await supabase
        .from('lead_cleanup_log')
        .select('action, reason, created_at');

      if (error) throw error;

      const logs = allLogs || [];
      const totalArchived = logs.filter(l => l.action === 'auto_archived').length;
      const totalDeleted = logs.filter(l => l.action === 'auto_deleted').length;
      const manualDeleted = logs.filter(l => l.action === 'manual_deleted').length;

      // Today's actions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayLogs = logs.filter(l => new Date(l.created_at) >= todayStart);
      const todayArchived = todayLogs.filter(l => l.action === 'auto_archived').length;
      const todayDeleted = todayLogs.filter(l => l.action === 'auto_deleted').length;

      // Reason breakdown
      const reasonCounts: Record<string, number> = {};
      for (const log of logs) {
        reasonCounts[log.reason] = (reasonCounts[log.reason] || 0) + 1;
      }

      return {
        totalArchived,
        totalDeleted,
        manualDeleted,
        todayArchived,
        todayDeleted,
        totalProcessed: logs.length,
        reasonCounts,
      };
    },
  });
}

export function useRecentCleanupLog(limit = 10) {
  return useQuery({
    queryKey: ['cleanup-log-recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_cleanup_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as CleanupLogEntry[];
    },
  });
}
