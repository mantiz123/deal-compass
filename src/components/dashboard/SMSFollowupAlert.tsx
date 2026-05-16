import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import { MessageSquare, AlertTriangle, ArrowRight } from 'lucide-react';

const SMS_GAP_DAYS = 3;

interface LeadNeedingSMS {
  id: string;
  piw_score: number | null;
  last_contact_at: string | null;
  property: {
    address: string;
    city: string;
    owner_name: string | null;
  } | null;
}

function useSMSFollowupLeads() {
  const orgId = useCurrentOrgIdSafe();
  return useQuery({
    queryKey: ['sms-followup-alert', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<LeadNeedingSMS[]> => {
      // 1. All active leads in 'contacto' for this org
      const { data: contactoLeads, error } = await supabase
        .from('leads')
        .select('id, piw_score, last_contact_at, property:properties(address, city, owner_name)')
        .eq('organization_id', orgId!)
        .eq('status', 'contacto')
        .is('archived_at', null)
        .order('piw_score', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;
      if (!contactoLeads?.length) return [];

      // 2. Which of those received an outbound SMS in the last N days?
      const since = new Date(Date.now() - SMS_GAP_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const leadIds = contactoLeads.map((l) => l.id);

      const { data: recentSMS } = await supabase
        .from('sms_outreach_log')
        .select('lead_id')
        .in('lead_id', leadIds)
        .eq('direction', 'outbound')
        .gte('sent_at', since);

      const recentIds = new Set((recentSMS ?? []).map((s) => s.lead_id));

      // 3. Return leads that have NOT received an SMS recently
      return (contactoLeads as LeadNeedingSMS[]).filter((l) => !recentIds.has(l.id));
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
}

export function SMSFollowupAlert() {
  const { data: leads, isLoading } = useSMSFollowupLeads();

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Nothing to alert
  if (!leads?.length) return null;

  const topLeads = leads.slice(0, 5);

  return (
    <Card variant="glass" className="border-orange-500/40 bg-orange-500/5 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="rounded-lg bg-orange-500/10 p-1.5">
              <MessageSquare className="h-4 w-4 text-orange-500" />
            </div>
            Leads sin SMS en {SMS_GAP_DAYS} días
            <Badge variant="outline" className="border-orange-500/50 text-orange-600 text-xs">
              {leads.length}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs text-orange-600 hover:text-orange-700">
            <Link to="/leads?status=contacto">
              Ver todos
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {topLeads.map((lead) => (
          <Link
            key={lead.id}
            to={`/leads?highlight=${lead.id}`}
            className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2 hover:bg-background/90 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {lead.property?.owner_name ?? 'Sin nombre'} — {lead.property?.address ?? '?'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {lead.property?.city}
                {lead.last_contact_at
                  ? ` · Último contacto: ${new Date(lead.last_contact_at).toLocaleDateString('es-US', { month: 'short', day: 'numeric' })}`
                  : ' · Sin contacto registrado'}
              </p>
            </div>
            {lead.piw_score != null && (
              <Badge
                variant="outline"
                className={`ml-2 shrink-0 text-xs ${
                  lead.piw_score >= 70
                    ? 'border-success/50 text-success'
                    : lead.piw_score >= 40
                    ? 'border-warning/50 text-warning'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {lead.piw_score}
              </Badge>
            )}
          </Link>
        ))}

        {leads.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-1">
            <AlertTriangle className="inline h-3 w-3 mr-1 text-orange-500" />
            {leads.length - 5} leads más esperando SMS
          </p>
        )}
      </CardContent>
    </Card>
  );
}
