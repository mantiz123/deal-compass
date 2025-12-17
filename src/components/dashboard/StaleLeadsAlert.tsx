import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaleLeads } from '@/hooks/useArchiveLead';
import { ArchiveLeadDialog } from '@/components/leads/ArchiveLeadDialog';
import { Clock, Archive, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StaleLeadsAlert() {
  const { data: staleLeads, isLoading } = useStaleLeads(14);
  const [archiveLeadId, setArchiveLeadId] = useState<string | null>(null);
  const [archiveAddress, setArchiveAddress] = useState<string>('');

  if (isLoading) {
    return (
      <Card variant="glass" className="border-warning/30">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Only show top 5 stale leads
  const displayLeads = staleLeads?.slice(0, 5) || [];
  const totalStale = staleLeads?.length || 0;

  if (totalStale === 0) {
    return null; // Don't render if no stale leads
  }

  return (
    <>
      <Card variant="glass" className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="h-4 w-4" />
              Leads Estancados
            </CardTitle>
            <Badge variant="outline" className="border-warning/50 text-warning">
              {totalStale} leads sin actividad
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Estos leads no han tenido contacto en más de 14 días. Considera archivarlos o dar seguimiento.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayLeads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-warning">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    {lead.days_without_activity || 0}d
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {lead.property?.address || 'Sin dirección'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.property?.city}, {lead.property?.state}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-warning hover:text-warning hover:bg-warning/10"
                onClick={() => {
                  setArchiveLeadId(lead.id);
                  setArchiveAddress(lead.property?.address || '');
                }}
              >
                <Archive className="h-4 w-4 mr-1" />
                Kill
              </Button>
            </div>
          ))}

          {totalStale > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{totalStale - 5} leads más sin actividad
            </p>
          )}
        </CardContent>
      </Card>

      <ArchiveLeadDialog
        leadId={archiveLeadId}
        leadAddress={archiveAddress}
        open={!!archiveLeadId}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveLeadId(null);
            setArchiveAddress('');
          }
        }}
      />
    </>
  );
}
