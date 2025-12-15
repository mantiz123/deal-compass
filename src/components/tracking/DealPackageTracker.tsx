import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDealPackageTracking,
  useDealPackageStats,
  useRealtimeDealPackages,
  type DealPackageWithTracking,
} from '@/hooks/useDealPackageTracking';
import {
  Mail,
  MousePointerClick,
  Eye,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

const tierColors: Record<string, string> = {
  platinum: 'bg-primary/20 text-primary border-primary/30',
  gold: 'bg-accent/20 text-accent border-accent/30',
  silver: 'bg-muted text-muted-foreground border-border',
  bronze: 'bg-warning/10 text-warning border-warning/30',
};

export function DealPackageTracker() {
  const queryClient = useQueryClient();
  const { data: packages, isLoading: packagesLoading } = useDealPackageTracking();
  const { data: stats, isLoading: statsLoading } = useDealPackageStats();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['deal-package-tracking'] });
    queryClient.invalidateQueries({ queryKey: ['deal-package-stats'] });
    setTimeout(() => setIsRefreshing(false), 500);
  }, [queryClient]);

  // Real-time updates
  useRealtimeDealPackages(handleRefresh);

  const getPackageStatus = (pkg: DealPackageWithTracking) => {
    if (pkg.response) return { label: 'Respondido', color: 'bg-success text-success-foreground', icon: CheckCircle2 };
    if (pkg.clicked_at) return { label: 'Clickeado', color: 'bg-primary text-primary-foreground', icon: MousePointerClick };
    if (pkg.opened_at) return { label: 'Abierto', color: 'bg-info text-info-foreground', icon: Eye };
    return { label: 'Enviado', color: 'bg-muted text-muted-foreground', icon: Send };
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Enviados</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasa de Apertura</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-info">{stats?.openRate || 0}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-info" />
              </div>
            </div>
            {!statsLoading && (
              <Progress value={stats?.openRate || 0} className="mt-2 h-1" />
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasa de Clicks</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-primary">{stats?.clickRate || 0}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
            </div>
            {!statsLoading && (
              <Progress value={stats?.clickRate || 0} className="mt-2 h-1" />
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversión</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-success">{stats?.responseRate || 0}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
            {!statsLoading && (
              <Progress value={stats?.responseRate || 0} className="mt-2 h-1" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Deal Packages Enviados
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {packagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !packages || packages.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay deal packages enviados aún.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ve a un lead y envía un deal package para comenzar el tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {packages.map((pkg) => {
                const status = getPackageStatus(pkg);
                const StatusIcon = status.icon;

                return (
                  <Card key={pkg.id} variant="interactive" className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', status.color)}>
                        <StatusIcon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {pkg.buyer.company_name || pkg.buyer.contact_name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={tierColors[pkg.buyer.tier]}
                            >
                              {pkg.buyer.tier}
                            </Badge>
                          </div>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>

                        {/* Property Info */}
                        {pkg.lead.property && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {pkg.lead.property.address}, {pkg.lead.property.city}
                            </span>
                          </div>
                        )}

                        {/* Timeline */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              Enviado {formatDistanceToNow(new Date(pkg.sent_at), { 
                                addSuffix: true, 
                                locale: es 
                              })}
                            </span>
                          </div>
                          {pkg.opened_at && (
                            <div className="flex items-center gap-1 text-info">
                              <Eye className="h-3 w-3" />
                              <span>
                                Abierto {formatDistanceToNow(new Date(pkg.opened_at), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                          )}
                          {pkg.clicked_at && (
                            <div className="flex items-center gap-1 text-primary">
                              <MousePointerClick className="h-3 w-3" />
                              <span>
                                Click {formatDistanceToNow(new Date(pkg.clicked_at), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
