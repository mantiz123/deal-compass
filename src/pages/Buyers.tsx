import { useState } from "react";
import { useServerPagination } from "@/hooks/useServerPagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBuyers, type Buyer } from "@/hooks/useBuyers";
import { NewBuyerDialog } from "@/components/buyers/NewBuyerDialog";
import { EditBuyerDialog } from "@/components/buyers/EditBuyerDialog";
import { DeleteBuyerDialog } from "@/components/buyers/DeleteBuyerDialog";
import { BuyerDetailSheet } from "@/components/buyers/BuyerDetailSheet";
import {
  Search, Plus, Phone, Mail, MoreHorizontal, MapPin, DollarSign,
  Home, Users, AlertCircle, Pencil, Trash2, UserX, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tierConfig: Record<string, { label: string; color: string }> = {
  platinum: { label: "Platinum", color: "bg-primary/20 text-primary border-primary/30" },
  gold: { label: "Gold", color: "bg-accent/20 text-accent border-accent/30" },
  silver: { label: "Silver", color: "bg-muted text-muted-foreground border-border" },
  bronze: { label: "Bronze", color: "bg-warning/10 text-warning border-warning/30" },
};

const Buyers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editBuyer, setEditBuyer] = useState<Buyer | null>(null);
  const [deleteBuyer, setDeleteBuyer] = useState<Buyer | null>(null);
  const [viewBuyer, setViewBuyer] = useState<Buyer | null>(null);

  const pagination = useServerPagination(24);
  const { data: result, isLoading, error } = useBuyers({
    search: searchTerm || undefined,
    tier: selectedTier,
    from: pagination.from,
    to: pagination.to,
  });

  const buyers = result?.data || [];
  const totalCount = result?.count ?? 0;
  const buyersPagination = pagination.paginationProps(totalCount);

  const handleSearchChange = (val: string) => { setSearchTerm(val); pagination.resetPage(); };
  const handleTierChange = (tier: string | null) => { setSelectedTier(tier); pagination.resetPage(); };

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
      <div className="mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Inversionistas</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Red de inversionistas Section 8 y cash buyers
            </p>
          </div>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Inversionista
          </Button>
        </div>
      </div>

      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, empresa o ZIP code..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tierConfig).map(([key, config]) => (
                <Badge
                  key={key}
                  className={cn("cursor-pointer transition-all", config.color,
                    selectedTier === key && "ring-2 ring-primary")}
                  onClick={() => handleTierChange(selectedTier === key ? null : key)}
                >
                  {config.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card variant="glass" className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar inversionistas</h3>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && totalCount === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay inversionistas todavía</h3>
            <p className="text-muted-foreground mb-6">
              Agrega tu primer inversionista para comenzar tu red.
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />Agregar Primero
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && buyers.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {buyers.map((buyer, index) => (
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
                <CardContent className="space-y-3">
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

                  <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                    {buyer.phone && (
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); window.open(`tel:${buyer.phone}`); }}>
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                    {buyer.email && (
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); window.open(`mailto:${buyer.email}`); }}>
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewBuyer(buyer); }}>
                          <Eye className="h-4 w-4 mr-2" />Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditBuyer(buyer); }}>
                          <Pencil className="h-4 w-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setDeleteBuyer(buyer); }}
                          className="text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {!buyer.is_active && (
                    <div className="mt-1 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
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

      <NewBuyerDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      <EditBuyerDialog buyer={editBuyer} open={!!editBuyer}
        onOpenChange={(open) => !open && setEditBuyer(null)} />
      <DeleteBuyerDialog buyer={deleteBuyer} open={!!deleteBuyer}
        onOpenChange={(open) => !open && setDeleteBuyer(null)} />
      <BuyerDetailSheet buyer={viewBuyer} open={!!viewBuyer}
        onOpenChange={(open) => !open && setViewBuyer(null)} />
    </Layout>
  );
};

export default Buyers;
