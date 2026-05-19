import { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mail, MessageSquare, Clock, Users, Trash2, Zap, ZapOff,
  ChevronRight, CheckCircle2, XCircle, PauseCircle,
} from 'lucide-react';
import { useCampaignEnrollments, useToggleCampaign, type DripCampaign } from '@/hooks/useCampaigns';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  captacion: 'Captación', contacto: 'Contacto', bajo_contrato: 'Bajo Contrato',
  cesion: 'Cesión', cerrado: 'Cerrado',
};

const enrollmentStatusConfig: Record<string, { label: string; icon: any; color: string }> = {
  active:       { label: 'Activo',       icon: CheckCircle2, color: 'text-success' },
  paused:       { label: 'Pausado',      icon: PauseCircle,  color: 'text-warning' },
  completed:    { label: 'Completado',   icon: CheckCircle2, color: 'text-muted-foreground' },
  unsubscribed: { label: 'Unsub.',       icon: XCircle,      color: 'text-destructive' },
};

interface CampaignDetailSheetProps {
  campaign: DripCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drip_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaña eliminada' });
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo eliminar la campaña', variant: 'destructive' }),
  });
}

export function CampaignDetailSheet({ campaign, open, onOpenChange, onDeleted }: CampaignDetailSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: enrollments, isLoading: loadingEnrollments } = useCampaignEnrollments(campaign?.id ?? '');
  const toggleCampaign = useToggleCampaign();
  const deleteCampaign = useDeleteCampaign();

  if (!campaign) return null;

  const sequences = (campaign.sequences ?? []).sort((a, b) => a.sequence_order - b.sequence_order);
  const emails = sequences.filter(s => s.channel === 'email').length;
  const sms = sequences.filter(s => s.channel === 'sms').length;
  const totalDays = sequences.reduce((acc, s) => acc + s.delay_days + Math.floor(s.delay_hours / 24), 0);

  const enrollmentCounts = {
    active: enrollments?.filter(e => e.status === 'active').length ?? 0,
    paused: enrollments?.filter(e => e.status === 'paused').length ?? 0,
    completed: enrollments?.filter(e => e.status === 'completed').length ?? 0,
    unsubscribed: enrollments?.filter(e => e.status === 'unsubscribed').length ?? 0,
  };

  const handleDelete = async () => {
    await deleteCampaign.mutateAsync(campaign.id);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <SheetTitle className="text-xl">{campaign.name}</SheetTitle>
                {campaign.description && (
                  <SheetDescription>{campaign.description}</SheetDescription>
                )}
              </div>
              <Badge variant={campaign.is_active ? 'glow' : 'secondary'} className="shrink-0">
                {campaign.is_active ? <Zap className="h-3 w-3 mr-1" /> : <ZapOff className="h-3 w-3 mr-1" />}
                {campaign.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </SheetHeader>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card variant="glass">
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{emails}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3" /> Emails
                </p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{sms}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <MessageSquare className="h-3 w-3" /> SMS
                </p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{totalDays}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> Días
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trigger */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Trigger:</span>
            <Badge variant="outline">{statusLabels[campaign.trigger_status] ?? campaign.trigger_status}</Badge>
          </div>

          {/* Sequences */}
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2">Secuencia de mensajes</p>
            {sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin secuencias configuradas.</p>
            ) : (
              <div className="space-y-2">
                {sequences.map((seq) => (
                  <div key={seq.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                    <div className="mt-0.5 shrink-0 rounded-md p-1.5 bg-background">
                      {seq.channel === 'email'
                        ? <Mail className="h-3.5 w-3.5 text-info" />
                        : <MessageSquare className="h-3.5 w-3.5 text-success" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">
                          #{seq.sequence_order} · Día {seq.delay_days}{seq.delay_hours > 0 ? ` +${seq.delay_hours}h` : ''}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {seq.channel === 'email' ? 'Email' : 'SMS'}
                        </Badge>
                      </div>
                      {seq.subject && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Asunto: {seq.subject}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{seq.content}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="mb-4" />

          {/* Enrollments */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Leads enrolados ({enrollments?.length ?? 0})</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {Object.entries(enrollmentCounts).map(([status, count]) => {
                const cfg = enrollmentStatusConfig[status];
                const Icon = cfg.icon;
                return (
                  <div key={status} className="rounded-lg border border-border bg-muted/20 p-2 text-center">
                    <Icon className={cn('h-4 w-4 mx-auto mb-1', cfg.color)} />
                    <p className="text-sm font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {loadingEnrollments ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : enrollments && enrollments.length > 0 ? (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {enrollments.slice(0, 20).map((e: any) => {
                  const cfg = enrollmentStatusConfig[e.status] ?? enrollmentStatusConfig.active;
                  const Icon = cfg.icon;
                  const prop = e.lead?.property;
                  return (
                    <div key={e.id} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-sm bg-background/50">
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.color)} />
                      <span className="truncate flex-1">
                        {prop?.address ?? 'Sin dirección'} — {prop?.owner_name ?? e.lead?.id}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(e.enrolled_at), 'dd MMM', { locale: es })}
                      </span>
                    </div>
                  );
                })}
                {enrollments.length > 20 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    +{enrollments.length - 20} más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin leads enrolados aún.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => toggleCampaign.mutate({ id: campaign.id, is_active: !campaign.is_active })}
              disabled={toggleCampaign.isPending}
            >
              {campaign.is_active
                ? <><ZapOff className="h-4 w-4 mr-1.5" /> Pausar</>
                : <><Zap className="h-4 w-4 mr-1.5" /> Activar</>}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteCampaign.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar campaña</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar "{campaign.name}"? Se cancelarán todos los enrollments activos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
