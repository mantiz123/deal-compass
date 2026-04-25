import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface AppNotification {
  id: string;
  type: 'cleanup_archived' | 'cleanup_deleted' | 'stale_warning' | 'info' | 'kcfy_request';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  meta?: Record<string, any>;
  href?: string;
}

/**
 * Builds notifications from cleanup log + stale leads.
 * No extra DB table needed — derived from existing data.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { isSuperAdmin } = useOrganization();

  return useQuery({
    queryKey: ['app-notifications', user?.id, isSuperAdmin],
    enabled: !!user,
    queryFn: async (): Promise<AppNotification[]> => {
      const notifications: AppNotification[] = [];

      // 1. Recent cleanup actions (last 48h)
      const since = new Date();
      since.setHours(since.getHours() - 48);

      const { data: cleanupLogs } = await supabase
        .from('lead_cleanup_log')
        .select('id, action, reason, notes, property_address, property_city, lead_data, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      for (const log of cleanupLogs || []) {
        const isDelete = log.action.includes('deleted');
        const leadData = (log.lead_data as Record<string, any>) || {};
        notifications.push({
          id: log.id,
          type: isDelete ? 'cleanup_deleted' : 'cleanup_archived',
          title: isDelete ? 'Lead eliminado permanentemente' : 'Lead archivado automáticamente',
          message: `${log.property_address || 'Propiedad'}${log.property_city ? `, ${log.property_city}` : ''} — ${log.notes || log.reason}`,
          timestamp: log.created_at,
          read: false,
          meta: {
            piw_score: leadData.piw_score,
            source: leadData.source,
            status: leadData.status,
            days_stale: leadData.days_stale,
            auction_date: leadData.auction_date,
            reason: log.reason,
          },
        });
      }

      // 2. Stale leads warnings
      const staleThreshold = new Date();
      staleThreshold.setDate(staleThreshold.getDate() - 10);

      const { data: staleLeads } = await supabase
        .from('leads')
        .select('id, created_at, last_contact_at, piw_score, source, status, days_without_activity, property:properties!inner(address, city)')
        .is('archived_at', null)
        .not('status', 'eq', 'cerrado')
        .lt('last_contact_at', staleThreshold.toISOString())
        .order('last_contact_at', { ascending: true })
        .limit(5);

      for (const lead of staleLeads || []) {
        const prop = (lead as any).property;
        const days = Math.floor(
          (Date.now() - new Date(lead.last_contact_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        notifications.push({
          id: `stale-${lead.id}`,
          type: 'stale_warning',
          title: '⚠️ Lead en riesgo de archivado',
          message: `${prop?.address || 'Propiedad'}, ${prop?.city || ''} — ${days} días sin actividad (se archiva a los 14)`,
          timestamp: lead.last_contact_at || lead.created_at,
          read: false,
          meta: {
            piw_score: lead.piw_score,
            source: lead.source,
            status: lead.status,
            days_stale: days,
          },
        });
      }

      // 3. KCFY requests — solo super admins
      if (isSuperAdmin) {
        const kcfySince = new Date();
        kcfySince.setDate(kcfySince.getDate() - 14);

        const { data: kcfyReqs } = await supabase
          .from('kcfy_requests')
          .select(`
            id, status, priority, notes, deal_value_estimate, created_at,
            lead:leads!inner(
              id, piw_score,
              property:properties!inner(address, city, state)
            )
          `)
          .in('status', ['pending'])
          .gte('created_at', kcfySince.toISOString())
          .order('created_at', { ascending: false })
          .limit(15);

        for (const req of (kcfyReqs || []) as any[]) {
          const prop = req.lead?.property;
          const priorityIcon = req.priority === 'urgent' ? '🚨' : req.priority === 'high' ? '⚡' : '📩';
          notifications.push({
            id: `kcfy-${req.id}`,
            type: 'kcfy_request',
            title: `${priorityIcon} Nueva solicitud KCFY (${req.priority.toUpperCase()})`,
            message: `${prop?.address || 'Propiedad'}, ${prop?.city || ''} — K-Score ${req.lead?.piw_score ?? '—'}${req.deal_value_estimate ? ` · ~$${Math.round(req.deal_value_estimate).toLocaleString()}` : ''}`,
            timestamp: req.created_at,
            read: false,
            href: '/admin/kcfy',
            meta: {
              priority: req.priority,
              piw_score: req.lead?.piw_score,
              deal_value: req.deal_value_estimate,
              notes: req.notes,
            },
          });
        }
      }

      // Sort by timestamp desc
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return notifications;
    },
    refetchInterval: 5 * 60 * 1000, // every 5 min
  });
}

/**
 * Gets the overnight cleanup summary for the login toast.
 */
export function useOvernightCleanupSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['overnight-cleanup-summary', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from('lead_cleanup_log')
        .select('action, reason')
        .gte('created_at', todayStart.toISOString());

      if (!logs || logs.length === 0) return null;

      const archived = logs.filter(l => l.action === 'auto_archived').length;
      const deleted = logs.filter(l => l.action === 'auto_deleted').length;

      return { archived, deleted, total: logs.length };
    },
    staleTime: Infinity, // only fetch once per session
  });
}
