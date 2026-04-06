import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useArchivedLeads, useUnarchiveLead, usePermanentlyDeleteLead, archiveReasonLabels, ArchiveReason } from '@/hooks/useArchiveLead';
import { Archive, Trash2, Undo2, ChevronDown, ChevronUp, Eye, Loader2, MapPin, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  captacion: 'Captación',
  contacto: 'Contacto',
  bajo_contrato: 'Bajo Contrato',
  cesion: 'Cesión',
  cerrado: 'Cerrado',
};

export function ArchivedLeadsSection() {
  const { data: archivedLeads, isLoading } = useArchivedLeads();
  const unarchive = useUnarchiveLead();
  const deleteLead = usePermanentlyDeleteLead();
  const [expanded, setExpanded] = useState(false);
  const [detailLead, setDetailLead] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; address: string } | null>(null);

  const leads = archivedLeads || [];

  if (isLoading || leads.length === 0) return null;

  const displayed = expanded ? leads : leads.slice(0, 3);

  return (
    <>
      <Card variant="glass" className="border-warning/20 bg-warning/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Archive className="h-4 w-4 text-warning" />
              Leads Archivados
            </CardTitle>
            <Badge variant="outline" className="border-warning/50 text-warning">
              {leads.length} archivados
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Leads descartados con razón documentada. Se eliminan automáticamente después de 7 días.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayed.map((lead) => {
            const reason = lead.archive_reason as ArchiveReason | null;
            const reasonLabel = reason ? archiveReasonLabels[reason] : '📝 Sin razón';
            const archivedAt = lead.archived_at ? new Date(lead.archived_at) : null;
            const daysArchived = archivedAt
              ? Math.floor((Date.now() - archivedAt.getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            const daysUntilDelete = Math.max(0, 7 - daysArchived);

            return (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0">
                    <Badge
                      variant={daysUntilDelete <= 2 ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1.5"
                    >
                      {daysUntilDelete}d
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {lead.property?.address || 'Sin dirección'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">{reasonLabel}</span>
                      {lead.archive_notes && (
                        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[180px]">
                          — {lead.archive_notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Ver detalle"
                    onClick={() => setDetailLead(lead)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                    title="Restaurar lead"
                    onClick={() => unarchive.mutate(lead.id)}
                    disabled={unarchive.isPending}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Eliminar permanentemente"
                    onClick={() => setDeleteTarget({ id: lead.id, address: lead.property?.address || '' })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {leads.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Ver todos ({leads.length - 3} más)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!detailLead} onOpenChange={(open) => !open && setDetailLead(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-warning" />
                  Deal Archivado
                </SheetTitle>
                <SheetDescription>
                  Detalle completo del lead archivado
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Property Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Propiedad
                  </h3>
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="font-medium">{detailLead.property?.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {detailLead.property?.city}, {detailLead.property?.state} {detailLead.property?.zip_code}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                      {detailLead.property?.owner_name && (
                        <div>
                          <span className="text-muted-foreground text-xs">Propietario:</span>
                          <p className="font-medium">{detailLead.property.owner_name}</p>
                        </div>
                      )}
                      {detailLead.property?.arv && (
                        <div>
                          <span className="text-muted-foreground text-xs">ARV:</span>
                          <p className="font-medium">${Number(detailLead.property.arv).toLocaleString()}</p>
                        </div>
                      )}
                      {detailLead.property?.mao && (
                        <div>
                          <span className="text-muted-foreground text-xs">MAO:</span>
                          <p className="font-medium">${Number(detailLead.property.mao).toLocaleString()}</p>
                        </div>
                      )}
                      {detailLead.piw_score != null && (
                        <div>
                          <span className="text-muted-foreground text-xs">K-Score:</span>
                          <p className="font-medium">{detailLead.piw_score}%</p>
                        </div>
                      )}
                      {detailLead.offer_amount && (
                        <div>
                          <span className="text-muted-foreground text-xs">Oferta:</span>
                          <p className="font-medium">${Number(detailLead.offer_amount).toLocaleString()}</p>
                        </div>
                      )}
                      {detailLead.source && (
                        <div>
                          <span className="text-muted-foreground text-xs">Fuente:</span>
                          <p className="font-medium">{detailLead.source}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Archive Reason */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Archive className="h-4 w-4 text-warning" />
                    Razón del Archivo
                  </h3>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
                    <Badge variant="warning" className="text-xs">
                      {detailLead.archive_reason
                        ? archiveReasonLabels[detailLead.archive_reason as ArchiveReason]
                        : 'Sin categoría'}
                    </Badge>
                    {detailLead.archive_notes && (
                      <p className="text-sm text-muted-foreground">{detailLead.archive_notes}</p>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Creado:</span>
                      <span>{format(new Date(detailLead.created_at), "d MMM yyyy", { locale: es })}</span>
                    </div>
                    {detailLead.last_contact_at && (
                      <div className="flex justify-between items-center py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Último contacto:</span>
                        <span>{format(new Date(detailLead.last_contact_at), "d MMM yyyy", { locale: es })}</span>
                      </div>
                    )}
                    {detailLead.archived_at && (
                      <div className="flex justify-between items-center py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Archivado:</span>
                        <span>{format(new Date(detailLead.archived_at), "d MMM yyyy", { locale: es })}</span>
                      </div>
                    )}
                    {detailLead.archived_at && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-muted-foreground">Eliminación automática:</span>
                        <span className="text-destructive font-medium">
                          {(() => {
                            const deleteDate = new Date(detailLead.archived_at);
                            deleteDate.setDate(deleteDate.getDate() + 7);
                            return format(deleteDate, "d MMM yyyy", { locale: es });
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estado when archived */}
                <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Estado al archivar:</span>
                  <Badge variant="secondary">{statusLabels[detailLead.status] || detailLead.status}</Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      unarchive.mutate(detailLead.id);
                      setDetailLead(null);
                    }}
                    disabled={unarchive.isPending}
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Restaurar Lead
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setDeleteTarget({ id: detailLead.id, address: detailLead.property?.address || '' });
                      setDetailLead(null);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Lead Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{deleteTarget?.address}</strong> de forma permanente.
              Los datos del deal quedarán registrados en el historial de limpieza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteLead.mutate({ leadId: deleteTarget.id, address: deleteTarget.address });
                  setDeleteTarget(null);
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
