import { useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useBuyers, type Buyer } from "@/hooks/useBuyers";
import { useBuyerStats } from "@/hooks/useBuyerMatchmaking";
import { useRecalculateAllBuyerLiquidity } from "@/hooks/useBuyerLiquidity";
import { NewBuyerDialog } from "@/components/buyers/NewBuyerDialog";
import { EditBuyerDialog } from "@/components/buyers/EditBuyerDialog";
import { DeleteBuyerDialog } from "@/components/buyers/DeleteBuyerDialog";
import { BuyerDetailSheet } from "@/components/buyers/BuyerDetailSheet";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MoreHorizontal,
  MapPin,
  DollarSign,
  Home,
  Zap,
  Star,
  Users,
  AlertCircle,
  Pencil,
  Trash2,
  UserX,
  Eye,
  Droplets,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tierConfig: Record<string, { label: string; color: string }> = {
  platinum: { label: "Platinum", color: "bg-primary/20 text-primary border-primary/30" },
  gold: { label: "Gold", color: "bg-accent/20 text-accent border-accent/30" },
  silver: { label: "Silver", color: "bg-muted text-muted-foreground border-border" },
  bronze: { label: "Bronze", color: "bg-warning/10 text-warning border-warning/30" },
};

const Buyers = () => {
  const { data: buyers, isLoading, error } = useBuyers();
  const { data: stats } = useBuyerStats();
  const recalculateLiquidity = useRecalculateAllBuyerLiquidity();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editBuyer, setEditBuyer] = useState<Buyer | null>(null);
  const [deleteBuyer, setDeleteBuyer] = useState<Buyer | null>(null);
  const [viewBuyer, setViewBuyer] = useState<Buyer | null>(null);

  // Sort buyers by liquidity score (descending), then by deals closed
  const sortedBuyers = buyers?.slice().sort((a, b) => {
    const aScore = (a as any).liquidity_score || 0;
    const bScore = (b as any).liquidity_score || 0;
    if (bScore !== aScore) return bScore - aScore;
    return (b.deals_closed || 0) - (a.deals_closed || 0);
  });

  const filteredBuyers = sortedBuyers?.filter(buyer => {
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        buyer.contact_name?.toLowerCase().includes(search) ||
        buyer.company_name?.toLowerCase().includes(search) ||
        buyer.preferred_zip_codes?.some(zip => zip.includes(search));
      if (!matchesSearch) return false;
    }
    
    // Filter by tier
    if (selectedTier && buyer.tier !== selectedTier) return false;
    
    return true;
  });

  const buyersPagination = usePagination(filteredBuyers, { pageSize: 24 });

  const getLiquidityColor = (score: number | null): string => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-accent';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const formatARVRange = (buyer: Buyer) => {
    if (!buyer.min_arv && !buyer.max_arv) return 'Sin especificar';
    const min = buyer.min_arv ? `$${Number(buyer.min_arv).toLocaleString()}` : '$0';
    const max = buyer.max_arv ? `$${Number(buyer.max_arv).toLocaleString()}` : '∞';
    return `${min} - ${max}`;
  };

  const formatPropertyTypes = (types: string[] | null) => {
    if (!types || types.length === 0) return ['Todos'];
    return types.map(t => t.replace('_', ' ').toUpperCase().slice(0, 3));
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Buyers Network</h1>
            <p className="text-muted-foreground">
              Gestiona tu red de cash buyers con matchmaking impulsado por IA
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => recalculateLiquidity.mutate()}
              disabled={recalculateLiquidity.isPending}
            >
              <RefreshCw className={cn(
                "mr-2 h-4 w-4",
                recalculateLiquidity.isPending && "animate-spin"
              )} />
              Recalcular Liquidity
            </Button>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Buyer
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Buyers</p>
                <p className="text-2xl font-bold">{stats?.totalBuyers || 0}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{stats?.activeBuyers || 0}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2 text-success">
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Cierre Prom.</p>
                <p className="text-2xl font-bold">{stats?.avgCloseTime || 0} días</p>
              </div>
              <div className="rounded-lg bg-info/10 p-2 text-info">
                <Star className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deals Totales</p>
                <p className="text-2xl font-bold">{stats?.totalDeals || 0}</p>
              </div>
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, empresa o ZIP code..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {Object.entries(tierConfig).map(([key, config]) => (
                <Badge
                  key={key}
                  className={cn(
                    "cursor-pointer transition-all",
                    config.color,
                    selectedTier === key && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedTier(selectedTier === key ? null : key)}
                >
                  {config.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} variant="glass">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card variant="glass" className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar compradores</h3>
            <p className="text-muted-foreground">Por favor, intenta de nuevo más tarde.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && buyers?.length === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay compradores todavía</h3>
            <p className="text-muted-foreground mb-6">
              Añade tu primer cash buyer para comenzar a hacer matchmaking con tus deals.
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Primer Comprador
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Buyers Grid */}
      {!isLoading && !error && filteredBuyers && filteredBuyers.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {buyersPagination.paginatedItems.map((buyer, index) => (
              <Card
                key={buyer.id}
                variant="interactive"
                className="animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setViewBuyer(buyer)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {buyer.company_name || buyer.contact_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{buyer.contact_name}</p>
                    </div>
                    <Badge className={tierConfig[buyer.tier]?.color || tierConfig.bronze.color}>
                      {tierConfig[buyer.tier]?.label || 'Bronze'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Liquidity Score */}
                  <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      Liquidity Score
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-lg font-bold",
                        getLiquidityColor((buyer as any).liquidity_score)
                      )}>
                        {(buyer as any).liquidity_score || '-'}
                      </span>
                      {(buyer as any).liquidity_score && (
                        <Progress 
                          value={(buyer as any).liquidity_score} 
                          className="w-12 h-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Close Ratio & Deals */}
                  <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Ratio Cierre:</span>
                      <span className="font-medium">
                        {(buyer as any).close_ratio 
                          ? `${Math.round(Number((buyer as any).close_ratio))}%` 
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="font-bold text-primary">
                        {buyer.deals_closed || 0} deals
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {buyer.preferred_zip_codes && buyer.preferred_zip_codes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Zips:</span>
                        <span className="font-medium">
                          {buyer.preferred_zip_codes.slice(0, 3).join(", ")}
                          {buyer.preferred_zip_codes.length > 3 && '...'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tipos:</span>
                      <span className="font-medium">
                        {formatPropertyTypes(buyer.preferred_property_types).join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">ARV:</span>
                      <span className="font-medium">{formatARVRange(buyer)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-success">
                        {buyer.avg_close_time_days || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Días Promedio</p>
                    </div>
                    <div className="flex gap-1">
                      {buyer.phone && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(`tel:${buyer.phone}`)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {buyer.email && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(`mailto:${buyer.email}`)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewBuyer(buyer); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditBuyer(buyer); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setDeleteBuyer(buyer); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Inactive indicator */}
                  {!buyer.is_active && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
                      <UserX className="h-4 w-4" />
                      <span>Inactivo</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <DataPagination {...buyersPagination} />
        </>
      )}

      {/* Dialogs & Sheets */}
      <NewBuyerDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      <EditBuyerDialog 
        buyer={editBuyer} 
        open={!!editBuyer} 
        onOpenChange={(open) => !open && setEditBuyer(null)} 
      />
      <DeleteBuyerDialog 
        buyer={deleteBuyer} 
        open={!!deleteBuyer} 
        onOpenChange={(open) => !open && setDeleteBuyer(null)} 
      />
      <BuyerDetailSheet
        buyer={viewBuyer}
        open={!!viewBuyer}
        onOpenChange={(open) => !open && setViewBuyer(null)}
      />
    </Layout>
  );
};

export default Buyers;
