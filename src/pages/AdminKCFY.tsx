import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useKCFYRequests, useUpdateKCFYRequest, type KCFYStatus, type KCFYPriority } from '@/hooks/useKCFYRequests';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, CheckCircle2, Clock, XCircle, AlertTriangle, MapPin, DollarSign, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { KCFYTimeline } from '@/components/leads/KCFYTimeline';
import {
  KCFY_STAGE_META,
  KCFY_STAGE_ORDER,
  useAddKCFYStatusEvent,
  type KCFYStage,
} from '@/hooks/useKCFYStatusEvents';

const STATUS_TABS: { value: KCFYStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'closed', label: 'Cerradas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'all', label: 'Todas' },
];

const PRIORITY_COLORS: Record<KCFYPriority, string> = {
  urgent: 'bg-red-500/15 text-red-500 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  normal: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  low: 'bg-muted text-muted-foreground',
};

const STATUS_BADGE: Record<KCFYStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' },
  accepted: { label: 'Aceptada', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  in_progress: { label: 'En proceso', className: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  closed: { label: 'Cerrada', className: 'bg-primary/15 text-primary border-primary/30' },
  rejected: { label: 'Rechazada', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  cancelled: { label: 'Cancelada', className: 'bg-muted text-muted-foreground' },
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function AdminKCFY() {
  const { isSuperAdmin, loading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<KCFYStatus | 'all'>('pending');

  const filterStatus = activeTab === 'all' ? undefined : { status: [activeTab] as KCFYStatus[] };
  const { data: requests, isLoading } = useKCFYRequests(filterStatus);
  const updateMutation = useUpdateKCFYRequest();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Stage advance dialog
  const [stageDialogReq, setStageDialogReq] = useState<{ id: string; orgId: string } | null>(null);
  const [selectedStage, setSelectedStage] = useState<KCFYStage>('contacting_seller');
  const [stageNote, setStageNote] = useState('');
  const addEvent = useAddKCFYStatusEvent();

  const counts = useMemo(() => {
    const map = { pending: 0, accepted: 0, in_progress: 0, closed: 0, rejected: 0 };
    (requests || []).forEach((r) => {
      if (r.status in map) (map as any)[r.status]++;
    });
    return map;
  }, [requests]);

  if (orgLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAccept = (id: string) => {
    updateMutation.mutate({
      id,
      updates: {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        klose_assignee_id: user?.id ?? null,
      },
    });
  };

  const handleStartProgress = (id: string) => {
    updateMutation.mutate({ id, updates: { status: 'in_progress' } });
  };

  const handleClose = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { status: 'closed', closed_at: new Date().toISOString() },
    });
  };

  const handleReject = () => {
    if (!rejectingId) return;
    updateMutation.mutate(
      {
        id: rejectingId,
        updates: { status: 'rejected', rejection_reason: rejectReason || 'Sin razón especificada' },
      },
      {
        onSuccess: () => {
          setRejectingId(null);
          setRejectReason('');
        },
      },
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel KCFY — Klose Closes For You</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona solicitudes de cierre asistido enviadas por estudiantes.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Pendientes" value={counts.pending} icon={Clock} tone="yellow" />
          <SummaryCard label="Aceptadas" value={counts.accepted} icon={CheckCircle2} tone="emerald" />
          <SummaryCard label="En proceso" value={counts.in_progress} icon={Briefcase} tone="blue" />
          <SummaryCard label="Cerradas" value={counts.closed} icon={CheckCircle2} tone="primary" />
          <SummaryCard label="Rechazadas" value={counts.rejected} icon={XCircle} tone="destructive" />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {requests?.length ?? 0} solicitud{(requests?.length ?? 0) === 1 ? '' : 'es'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !requests || requests.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No hay solicitudes en este estado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Propiedad</TableHead>
                        <TableHead>K-Score</TableHead>
                        <TableHead>Prioridad</TableHead>
                        <TableHead>Deal estimado</TableHead>
                        <TableHead>Solicitada</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => {
                        const lead = (req as any).lead;
                        const prop = lead?.property;
                        const statusInfo = STATUS_BADGE[req.status];
                        return (
                          <TableRow key={req.id}>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-sm">{prop?.address || '—'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {prop?.city}, {prop?.state} {prop?.zip_code}
                                  </div>
                                  {req.notes && (
                                    <div className="text-xs text-muted-foreground mt-1 max-w-xs italic">
                                      "{req.notes}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {lead?.piw_score ?? '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={PRIORITY_COLORS[req.priority]}>
                                {req.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {req.priority.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                {formatCurrency(req.deal_value_estimate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: es })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                              {req.rejection_reason && (
                                <div className="text-xs text-muted-foreground mt-1 max-w-xs italic">
                                  {req.rejection_reason}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {req.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleAccept(req.id)}
                                      disabled={updateMutation.isPending}
                                    >
                                      Aceptar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setRejectingId(req.id)}
                                      disabled={updateMutation.isPending}
                                    >
                                      Rechazar
                                    </Button>
                                  </>
                                )}
                                {req.status === 'accepted' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleStartProgress(req.id)}
                                    disabled={updateMutation.isPending}
                                  >
                                    Iniciar proceso
                                  </Button>
                                )}
                                {req.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleClose(req.id)}
                                    disabled={updateMutation.isPending}
                                  >
                                    Cerrar deal
                                  </Button>
                                )}
                                {req.status !== 'rejected' && req.status !== 'cancelled' && req.status !== 'closed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setStageDialogReq({ id: req.id, orgId: req.organization_id });
                                      setSelectedStage('contacting_seller');
                                      setStageNote('');
                                    }}
                                    disabled={addEvent.isPending}
                                  >
                                    <GitBranch className="h-3.5 w-3.5 mr-1" />
                                    Avanzar etapa
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stage advance dialog */}
      <Dialog
        open={!!stageDialogReq}
        onOpenChange={(open) => {
          if (!open) {
            setStageDialogReq(null);
            setStageNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avanzar etapa del KCFY</DialogTitle>
            <DialogDescription>
              Registra el avance del deal. El estudiante verá esta actualización en su timeline.
            </DialogDescription>
          </DialogHeader>

          {stageDialogReq && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4 max-h-64 overflow-y-auto bg-muted/20">
                <KCFYTimeline kcfyRequestId={stageDialogReq.id} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage-select">Nueva etapa</Label>
                <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as KCFYStage)}>
                  <SelectTrigger id="stage-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KCFY_STAGE_ORDER.filter((s) => s !== 'submitted').map((s) => (
                      <SelectItem key={s} value={s}>
                        {KCFY_STAGE_META[s].label} — {KCFY_STAGE_META[s].description}
                      </SelectItem>
                    ))}
                    <SelectItem value="dead">
                      {KCFY_STAGE_META.dead.label} — {KCFY_STAGE_META.dead.description}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage-note">
                  Nota {selectedStage === 'dead' ? '(razón obligatoria para el estudiante)' : '(opcional, visible para el estudiante)'}
                </Label>
                <Textarea
                  id="stage-note"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder={
                    selectedStage === 'dead'
                      ? 'Ej: Seller decidió no vender, ARV no soportó la oferta, título problemático...'
                      : 'Ej: Hablamos con el seller, contraofertando $5k menos...'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogReq(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!stageDialogReq) return;
                if (selectedStage === 'dead' && !stageNote.trim()) return;
                addEvent.mutate(
                  {
                    kcfy_request_id: stageDialogReq.id,
                    organization_id: stageDialogReq.orgId,
                    stage: selectedStage,
                    note: stageNote,
                  },
                  {
                    onSuccess: () => {
                      setStageDialogReq(null);
                      setStageNote('');
                    },
                  },
                );
              }}
              disabled={addEvent.isPending || (selectedStage === 'dead' && !stageNote.trim())}
            >
              Registrar etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud KCFY</DialogTitle>
            <DialogDescription>
              Indica al estudiante por qué Klose no puede tomar este deal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Razón (visible para el estudiante)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: K-Score muy bajo, propiedad fuera del rango operativo, falta información del owner..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateMutation.isPending}
            >
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: any;
  tone: 'yellow' | 'emerald' | 'blue' | 'primary' | 'destructive';
}) {
  const toneClasses: Record<typeof tone, string> = {
    yellow: 'text-yellow-500 bg-yellow-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    primary: 'text-primary bg-primary/10',
    destructive: 'text-destructive bg-destructive/10',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
