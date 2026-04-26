import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCleanupStats, useRecentCleanupLog } from '@/hooks/useLeadCleanup';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, Sparkles, Trash2, Archive, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const reasonLabels: Record<string, string> = {
  expired_auction: '🔨 Subasta vencida',
  stale_no_activity: '😴 Sin actividad',
  expired_archive: '🗑️ Archivado expirado',
  price_too_high: '💰 Precio muy alto',
  not_motivated: '😐 No motivado',
  no_response: '📵 Sin respuesta',
  legal_issues: '⚖️ Legal',
  other: '📝 Otro',
  manual_deleted: '👤 Manual',
};

export function PipelineHygieneWidget() {
  const { data: stats, isLoading: loadingStats } = useCleanupStats();
  const { data: recentLog, isLoading: loadingLog } = useRecentCleanupLog(5);
  const [showLog, setShowLog] = useState(false);
  const [running, setRunning] = useState(false);
  const queryClient = useQueryClient();

  const runCleanup = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-lead-cleanup');
      if (error) throw error;
      
      const msg = [
        data.archived_expired_auctions && `${data.archived_expired_auctions} subastas vencidas archivadas`,
        data.archived_stale && `${data.archived_stale} leads estancados archivados`,
        data.permanently_deleted && `${data.permanently_deleted} leads eliminados permanentemente`,
      ].filter(Boolean).join(', ');

      toast.success(msg || 'Pipeline limpio — nada que limpiar hoy 🎉');
      queryClient.invalidateQueries({ queryKey: ['cleanup-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cleanup-log-recent'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stale-leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
    } catch (err) {
      console.error(err);
      toast.error('Error al ejecutar limpieza');
    } finally {
      setRunning(false);
    }
  };

  if (loadingStats) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Higiene del Pipeline
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={runCleanup}
            disabled={running}
            className="text-xs self-start sm:self-auto"
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {running ? 'Limpiando...' : 'Limpiar ahora'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Limpieza automática diaria a las 8 AM. Leads archivados se eliminan tras 7 días.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats?.totalProcessed || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total procesados</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-lg font-bold text-warning">{stats?.totalArchived || 0}</p>
            <p className="text-[10px] text-muted-foreground">Archivados</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-lg font-bold text-destructive">{stats?.totalDeleted || 0}</p>
            <p className="text-[10px] text-muted-foreground">Eliminados</p>
          </div>
        </div>

        {/* Today's summary */}
        {(stats?.todayArchived || 0) + (stats?.todayDeleted || 0) > 0 && (
          <div className="rounded-lg bg-secondary/50 p-2 text-xs">
            <span className="font-medium">Hoy: </span>
            {stats?.todayArchived ? `${stats.todayArchived} archivados` : ''}
            {stats?.todayArchived && stats?.todayDeleted ? ' · ' : ''}
            {stats?.todayDeleted ? `${stats.todayDeleted} eliminados` : ''}
          </div>
        )}

        {/* Top reasons */}
        {stats?.reasonCounts && Object.keys(stats.reasonCounts).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.reasonCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([reason, count]) => (
                <Badge key={reason} variant="secondary" className="text-[10px]">
                  {reasonLabels[reason] || reason} ({count})
                </Badge>
              ))
            }
          </div>
        )}

        {/* Recent log toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setShowLog(!showLog)}
        >
          {showLog ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          {showLog ? 'Ocultar historial' : 'Ver historial reciente'}
        </Button>

        {showLog && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {loadingLog ? (
              <Skeleton className="h-16 w-full" />
            ) : recentLog && recentLog.length > 0 ? (
              recentLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 rounded border border-border p-2 text-xs">
                  {entry.action.includes('deleted') ? (
                    <Trash2 className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <Archive className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{entry.property_address || 'Propiedad'}</p>
                    <p className="text-muted-foreground truncate">{entry.notes}</p>
                    <p className="text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Sin historial aún. Ejecuta la limpieza para comenzar.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
