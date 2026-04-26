import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTopBuyersByLiquidity, useRecalculateAllBuyerLiquidity } from '@/hooks/useBuyerLiquidity';
import { Droplets, RefreshCw, TrendingUp, Clock, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function getLiquidityColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-accent';
  if (score >= 40) return 'text-warning';
  return 'text-destructive';
}

function getLiquidityBadge(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Alta', color: 'bg-success/20 text-success border-success/30' };
  if (score >= 60) return { label: 'Media', color: 'bg-accent/20 text-accent border-accent/30' };
  if (score >= 40) return { label: 'Baja', color: 'bg-warning/20 text-warning border-warning/30' };
  return { label: 'Muy Baja', color: 'bg-destructive/20 text-destructive border-destructive/30' };
}

export function BuyerLiquidityWidget() {
  const { data: topBuyers, isLoading, error } = useTopBuyersByLiquidity(5);
  const recalculateMutation = useRecalculateAllBuyerLiquidity();

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
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
          <p className="text-sm text-muted-foreground">Error al cargar liquidity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-4 w-4 text-info" />
            Buyer Liquidity Index
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="h-7 px-2"
          >
            <RefreshCw className={cn(
              "h-3 w-3",
              recalculateMutation.isPending && "animate-spin"
            )} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!topBuyers || topBuyers.length === 0 ? (
          <div className="text-center py-6">
            <Droplets className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay datos de liquidez aún
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Recalcula los scores para ver rankings
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw className={cn(
                "h-3 w-3 mr-2",
                recalculateMutation.isPending && "animate-spin"
              )} />
              Calcular Ahora
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {topBuyers.map((buyer, index) => {
              const liquidityBadge = getLiquidityBadge(buyer.liquidity_score || 0);
              
              return (
                <div
                  key={buyer.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {buyer.company_name || buyer.contact_name}
                      </span>
                      <Badge className={cn('text-[10px] sm:text-xs', liquidityBadge.color)}>
                        {liquidityBadge.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                      {buyer.close_ratio !== null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {Math.round(Number(buyer.close_ratio))}% cierre
                        </span>
                      )}
                      {buyer.avg_response_time_hours !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(Number(buyer.avg_response_time_hours))}h resp.
                        </span>
                      )}
                      {buyer.deals_closed !== null && buyer.deals_closed > 0 && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {buyer.deals_closed} deals
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 w-16">
                    <div className={cn(
                      "text-lg font-bold text-right",
                      getLiquidityColor(buyer.liquidity_score || 0)
                    )}>
                      {buyer.liquidity_score || 0}
                    </div>
                    <Progress 
                      value={buyer.liquidity_score || 0} 
                      className="h-1 mt-1"
                    />
                  </div>
                </div>
              );
            })}

            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link to="/buyers">Ver todos los compradores →</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
