import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeals, DEAL_STAGES, STAGE_LABELS, type Deal, type DealStage } from '@/hooks/useDeals';
import { Plus, Search, MapPin, Building2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const money = (n?: number | null) =>
  n === null || n === undefined ? '—' : `$${Math.round(n).toLocaleString()}`;

function decisionBadge(decision: string) {
  const map: Record<string, string> = {
    buy: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    negotiate: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    pass: 'bg-destructive/15 text-destructive border-destructive/30',
    undecided: 'bg-muted text-muted-foreground border-border',
  };
  return map[decision] ?? map.undecided;
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link to={`/deals/${deal.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{deal.address}</p>
            <Badge variant="outline" className={cn('shrink-0 text-[10px]', decisionBadge(deal.decision))}>
              {deal.decision === 'undecided' ? '—' : deal.decision.toUpperCase()}
            </Badge>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {[deal.city, deal.state].filter(Boolean).join(', ') || 'Sin ubicación'}
          </p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>
              <span className="text-muted-foreground">Precio</span>
              <p className="font-semibold tabular-nums">{money(deal.list_price)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Score</span>
              <p className="font-semibold tabular-nums">
                {deal.investment_score ?? '—'}
                {deal.investment_score !== null && <span className="text-muted-foreground">/100</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Deals() {
  const { data: deals, isLoading } = useDeals();
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (deals ?? []).filter(
      (d) =>
        !q ||
        d.address.toLowerCase().includes(q) ||
        (d.city ?? '').toLowerCase().includes(q) ||
        (d.zip_code ?? '').includes(q)
    );
    const map = {} as Record<DealStage, Deal[]>;
    DEAL_STAGES.forEach((s) => (map[s] = []));
    filtered.forEach((d) => map[(d.stage as DealStage) ?? 'under_analysis']?.push(d));
    return map;
  }, [deals, search]);

  const total = deals?.length ?? 0;
  const avgScore = useMemo(() => {
    const withScore = (deals ?? []).filter((d) => d.investment_score !== null);
    if (!withScore.length) return null;
    return Math.round(
      withScore.reduce((s, d) => s + (d.investment_score ?? 0), 0) / withScore.length
    );
  }, [deals]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deals</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de análisis fix &amp; flip — Alabama
            </p>
          </div>
          <Button asChild>
            <Link to="/deals/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo análisis
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Deals totales</p>
                <p className="text-xl font-bold tabular-nums">{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Score promedio</p>
                <p className="text-xl font-bold tabular-nums">{avgScore ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar dirección, ciudad o ZIP"
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aún no hay deals. Sube el PDF de una propiedad para empezar.
              </p>
              <Button asChild>
                <Link to="/deals/new">
                  <Plus className="mr-2 h-4 w-4" /> Subir PDF
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DEAL_STAGES.map((stage) => (
              <div key={stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                  <Badge variant="secondary" className="tabular-nums">
                    {grouped[stage].length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {grouped[stage].map((d) => (
                    <DealCard key={d.id} deal={d} />
                  ))}
                  {grouped[stage].length === 0 && (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Vacío
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
