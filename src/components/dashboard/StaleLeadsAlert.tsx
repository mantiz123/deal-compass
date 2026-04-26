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
import { useStaleLeads, usePermanentlyDeleteLead } from '@/hooks/useArchiveLead';
import { ArchiveLeadDialog } from '@/components/leads/ArchiveLeadDialog';
import { Clock, Archive, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

export function StaleLeadsAlert() {
  const { data: staleLeads, isLoading } = useStaleLeads(14);
  const deleteLead = usePermanentlyDeleteLead();
  const [archiveLeadId, setArchiveLeadId] = useState<string | null>(null);
  const [archiveAddress, setArchiveAddress] = useState<string>('');
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteAddress, setDeleteAddress] = useState<string>('');

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

  const displayLeads = staleLeads?.slice(0, 5) || [];
  const totalStale = staleLeads?.length || 0;

  if (totalStale === 0) {
    return null;
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
            Sin contacto en más de 14 días. Archívalos (Kill) o elimínalos permanentemente.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayLeads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-1 text-warning flex-shrink-0">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    {lead.days_without_activity || 0}d
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {lead.property?.address || 'Sin dirección'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.property?.city}, {lead.property?.state}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-warning hover:text-warning hover:bg-warning/10 px-2 sm:px-3"
                  onClick={() => {
                    setArchiveLeadId(lead.id);
                    setArchiveAddress(lead.property?.address || '');
                  }}
                  title="Archivar con razón (Kill)"
                >
                  <Archive className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Kill</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 sm:px-3"
                  onClick={() => {
                    setDeleteLeadId(lead.id);
                    setDeleteAddress(lead.property?.address || '');
                  }}
                  title="Eliminar permanentemente"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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

      <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => { if (!open) setDeleteLeadId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Lead Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{deleteAddress}</strong> de forma permanente.
              Esta acción no se puede deshacer. ¿Estás seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteLeadId) {
                  deleteLead.mutate({ leadId: deleteLeadId, address: deleteAddress });
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
