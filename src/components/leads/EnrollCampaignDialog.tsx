import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail, MessageSquare, Clock, Zap, ZapOff, CheckCircle2, PauseCircle, XCircle, Loader2,
} from 'lucide-react';
import {
  useCampaigns,
  useLeadEnrollments,
  useEnrollLeadInCampaign,
  useUnenrollLeadFromCampaign,
} from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  captacion: 'Captación', contacto: 'Contacto', bajo_contrato: 'Bajo Contrato',
  cesion: 'Cesión', cerrado: 'Cerrado',
};

const enrollStatusIcon: Record<string, any> = {
  active: CheckCircle2,
  paused: PauseCircle,
  completed: CheckCircle2,
  unsubscribed: XCircle,
};

const enrollStatusColor: Record<string, string> = {
  active: 'text-success',
  paused: 'text-warning',
  completed: 'text-muted-foreground',
  unsubscribed: 'text-destructive',
};

interface EnrollCampaignDialogProps {
  leadId: string;
  leadStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollCampaignDialog({ leadId, leadStatus, open, onOpenChange }: EnrollCampaignDialogProps) {
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: enrollments, isLoading: loadingEnrollments } = useLeadEnrollments(leadId);
  const enroll = useEnrollLeadInCampaign();
  const unenroll = useUnenrollLeadFromCampaign();

  const enrollmentMap = new Map(enrollments?.map(e => [e.campaign_id, e]) ?? []);

  const handleEnroll = async (campaignId: string) => {
    setEnrollingId(campaignId);
    try {
      await enroll.mutateAsync({ leadId, campaignId });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    setUnenrollingId(enrollmentId);
    try {
      await unenroll.mutateAsync({ enrollmentId, leadId });
    } finally {
      setUnenrollingId(null);
    }
  };

  const activeCampaigns = campaigns?.filter(c => c.is_active) ?? [];
  const inactiveCampaigns = campaigns?.filter(c => !c.is_active) ?? [];

  const renderCampaignRow = (campaign: any) => {
    const enrollment = enrollmentMap.get(campaign.id);
    const isEnrolledActive = enrollment?.status === 'active';
    const isEnrolledOther = enrollment && !isEnrolledActive;
    const EnrollIcon = enrollment ? enrollStatusIcon[enrollment.status] : null;

    const sequences = campaign.sequences ?? [];
    const emailCount = sequences.filter((s: any) => s.channel === 'email').length;
    const smsCount = sequences.filter((s: any) => s.channel === 'sms').length;
    const totalDays = sequences.reduce((acc: number, s: any) => acc + s.delay_days, 0);

    return (
      <div
        key={campaign.id}
        className={cn(
          'rounded-lg border px-3 py-3 transition-colors',
          isEnrolledActive ? 'border-success/40 bg-success/5' : 'border-border bg-muted/20'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{campaign.name}</span>
              {enrollment && EnrollIcon && (
                <EnrollIcon className={cn('h-3.5 w-3.5 shrink-0', enrollStatusColor[enrollment.status])} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" className="text-[10px] py-0">
                {statusLabels[campaign.trigger_status] ?? campaign.trigger_status}
              </Badge>
              {emailCount > 0 && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{emailCount}</span>
              )}
              {smsCount > 0 && (
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{smsCount} SMS</span>
              )}
              {totalDays > 0 && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{totalDays}d</span>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {isEnrolledActive ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 text-warning border-warning/30"
                disabled={unenrollingId === enrollment?.id}
                onClick={() => handleUnenroll(enrollment!.id)}
              >
                {unenrollingId === enrollment?.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : 'Pausar'}
              </Button>
            ) : isEnrolledOther ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={enrollingId === campaign.id}
                onClick={() => handleEnroll(campaign.id)}
              >
                {enrollingId === campaign.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : 'Reactivar'}
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs h-7"
                disabled={enrollingId === campaign.id}
                onClick={() => handleEnroll(campaign.id)}
              >
                {enrollingId === campaign.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : 'Enrollar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Enrollar en Campaña
          </DialogTitle>
          <DialogDescription>
            Selecciona una campaña para automatizar el seguimiento de este lead.
          </DialogDescription>
        </DialogHeader>

        {loadingCampaigns || loadingEnrollments ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay campañas creadas.</p>
            <p className="text-xs mt-1">Crea una campaña en la sección Campaigns primero.</p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {activeCampaigns.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Zap className="h-3 w-3 text-success" /> Campañas activas
                </p>
                <div className="space-y-2">
                  {activeCampaigns.map(renderCampaignRow)}
                </div>
              </div>
            )}
            {inactiveCampaigns.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <ZapOff className="h-3 w-3" /> Campañas inactivas
                </p>
                <div className="space-y-2 opacity-60">
                  {inactiveCampaigns.map(renderCampaignRow)}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
