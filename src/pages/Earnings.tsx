import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, HandshakeIcon, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pendiente revisión', icon: Clock, className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  accepted: { label: 'Aceptada', icon: CheckCircle2, className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  in_progress: { label: 'En curso', icon: TrendingUp, className: 'bg-primary/10 text-primary border-primary/30' },
  closed: { label: 'Cerrada ✓', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'Rechazada', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
  cancelled: { label: 'Cancelada', icon: XCircle, className: 'bg-muted text-muted-foreground border-border' },
};

const formatMoney = (n: number | null | undefined) =>
  n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function Earnings() {
  const orgId = useCurrentOrgIdSafe();
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-earnings', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const { data, error } = await supabase
        .from('kcfy_requests')
        .select(`
          *,
          lead:leads!inner(
            id,
            property:properties!inner(address, city, state)
          )
        `)
        .eq('organization_id', orgId)
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!user,
  });

  // KPIs
  const closed = (requests || []).filter(r => r.status === 'closed');
  const inFlight = (requests || []).filter(r => ['pending', 'accepted', 'in_progress'].includes(r.status));
  const totalEarned = closed.reduce((sum, r) => {
    const dealValue = Number(r.deal_value_estimate || 0);
    const split = Number(r.agreed_split_student || 60) / 100;
    return sum + dealValue * split;
  }, 0);
  const projectedFromInflight = inFlight.reduce((sum, r) => {
    const dealValue = Number(r.deal_value_estimate || 0);
    const split = Number(r.agreed_split_student || 60) / 100;
    return sum + dealValue * split;
  }, 0);

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mis Ganancias</h1>
            <p className="text-sm text-muted-foreground">
              Tu corte del 60% sobre cada deal cerrado vía KCFY
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Ya ganado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400">{formatMoney(totalEarned)}</div>
              <p className="text-xs text-muted-foreground mt-1">{closed.length} deal{closed.length !== 1 ? 's' : ''} cerrado{closed.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> En proceso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatMoney(projectedFromInflight)}</div>
              <p className="text-xs text-muted-foreground mt-1">{inFlight.length} solicitud{inFlight.length !== 1 ? 'es' : ''} activa{inFlight.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <HandshakeIcon className="h-4 w-4 text-muted-foreground" /> Total solicitudes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{requests?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Histórico KCFY</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">Detalle de solicitudes KCFY</CardTitle>
            <CardDescription>
              Cuando Klose cierre el deal, recibirás el 60% de la fee de asignación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !requests?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Aún no has solicitado KCFY</p>
                <p className="text-xs mt-1">Desde un lead caliente, presiona "Pedir KCFY" para que el equipo Klose lo cierre por ti.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((r: any) => {
                  const meta = STATUS_META[r.status] || STATUS_META.pending;
                  const Icon = meta.icon;
                  const dealValue = Number(r.deal_value_estimate || 0);
                  const myShare = dealValue * (Number(r.agreed_split_student || 60) / 100);
                  const propAddress = r.lead?.property
                    ? `${r.lead.property.address}, ${r.lead.property.city}, ${r.lead.property.state}`
                    : 'Lead sin dirección';

                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium truncate">{propAddress}</span>
                          <Badge variant="outline" className={meta.className}>
                            <Icon className="h-3 w-3 mr-1" />
                            {meta.label}
                          </Badge>
                          {r.priority !== 'normal' && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {r.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Solicitado el {format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                          {r.closed_at && ` · Cerrado el ${format(new Date(r.closed_at), "d MMM yyyy", { locale: es })}`}
                        </p>
                        {r.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Motivo: {r.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Tu corte (60%)</p>
                        <p className={`text-lg font-bold ${r.status === 'closed' ? 'text-emerald-400' : 'text-primary'}`}>
                          {formatMoney(myShare)}
                        </p>
                        {dealValue > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            de {formatMoney(dealValue)} fee
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
