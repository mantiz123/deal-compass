import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeadLeadsAnalytics, useArchivedLeads, usePermanentlyDeleteLead, archiveReasonLabels, ArchiveReason } from '@/hooks/useArchiveLead';
import { Skull, TrendingDown, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const reasonColors: Record<ArchiveReason, string> = {
  price_too_high: 'bg-warning/20 text-warning border-warning/30',
  not_motivated: 'bg-muted text-muted-foreground border-border',
  legal_issues: 'bg-destructive/20 text-destructive border-destructive/30',
  no_response: 'bg-secondary text-secondary-foreground border-border',
  title_problems: 'bg-destructive/20 text-destructive border-destructive/30',
  property_condition: 'bg-warning/20 text-warning border-warning/30',
  lost_to_competitor: 'bg-accent/20 text-accent border-accent/30',
  other: 'bg-muted text-muted-foreground border-border',
};

export function DeadLeadsAnalytics() {
  const { data: analytics, isLoading, error } = useDeadLeadsAnalytics();
  const { data: archivedLeads } = useArchivedLeads();
  const deleteLead = usePermanentlyDeleteLead();
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteLeadAddr, setDeleteLeadAddr] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);

  const totalDeadLeads = analytics?.reduce((sum, a) => sum + Number(a.count), 0) || 0;

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="glass" className="border-destructive/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Error al cargar analytics</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Skull className="h-4 w-4 text-muted-foreground" />
            Por Qué Mueren los Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <TrendingDown className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay deals archivados aún
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Usa "Kill Fast" para archivar leads que no funcionaron
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by count descending
  const sortedAnalytics = [...analytics].sort((a, b) => Number(b.count) - Number(a.count));

  return (
    <>
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Skull className="h-4 w-4 text-warning" />
            Por Qué Mueren los Deals
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {totalDeadLeads} archivados
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedAnalytics.map((item) => {
          const percentage = totalDeadLeads > 0 
            ? Math.round((Number(item.count) / totalDeadLeads) * 100) 
            : 0;
          const reason = item.archive_reason as ArchiveReason;
          
          return (
            <div
              key={reason}
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge className={cn('text-xs', reasonColors[reason])}>
                  {archiveReasonLabels[reason] || reason}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <span className="font-semibold">{item.count}</span>
                  <span className="text-muted-foreground ml-1">({percentage}%)</span>
                </div>
                {item.avg_piw_score !== null && (
                  <div className="text-xs text-muted-foreground">
                    K: {Math.round(Number(item.avg_piw_score))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Summary insights */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Insight:</strong>{' '}
            {sortedAnalytics[0] && (
              <>
                La razón principal es "{archiveReasonLabels[sortedAnalytics[0].archive_reason as ArchiveReason]}" 
                con {Math.round((Number(sortedAnalytics[0].count) / totalDeadLeads) * 100)}% de los casos.
              </>
            )}
          </p>
        </div>

        {/* Toggle archived leads list */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs text-muted-foreground"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? 'Ocultar leads archivados' : 'Ver leads archivados para eliminar'}
        </Button>

        {showArchived && archivedLeads && archivedLeads.length > 0 && (
          <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
            {archivedLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-border p-2 text-xs hover:bg-secondary/30 transition-colors"
              >
                <div className="truncate flex-1 mr-2">
                  <p className="font-medium truncate">{(lead.property as any)?.address || 'Sin dirección'}</p>
                  <p className="text-muted-foreground">
                    {archiveReasonLabels[lead.archive_reason as ArchiveReason] || lead.archive_reason}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => {
                    setDeleteLeadId(lead.id);
                    setDeleteLeadAddr((lead.property as any)?.address || '');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Delete confirmation dialog */}
    <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => { if (!open) setDeleteLeadId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar Lead Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar permanentemente <strong>{deleteLeadAddr}</strong>. 
            Esta acción no se puede deshacer. ¿Estás seguro?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteLeadId) {
                deleteLead.mutate({ leadId: deleteLeadId, address: deleteLeadAddr });
                setDeleteLeadId(null);
              }
            }}
          >
            {deleteLead.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
