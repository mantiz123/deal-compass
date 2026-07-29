import { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/ui/data-pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useAdminBuyers } from "@/hooks/useAdminBuyers";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BuyerDetailSheet } from "@/components/buyers/BuyerDetailSheet";
import type { Buyer } from "@/hooks/useBuyers";
import { Search, Users, ShieldAlert, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const tierConfig: Record<string, { label: string; color: string }> = {
  platinum: { label: "Platinum", color: "bg-primary/20 text-primary border-primary/30" },
  gold: { label: "Gold", color: "bg-accent/20 text-accent border-accent/30" },
  silver: { label: "Silver", color: "bg-muted text-muted-foreground border-border" },
  bronze: { label: "Bronze", color: "bg-warning/10 text-warning border-warning/30" },
};

const AdminBuyers = () => {
  const { visibleOrgs, isSuperAdmin, loading: orgLoading } = useOrganization();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [orgId, setOrgId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [viewBuyer, setViewBuyer] = useState<Buyer | null>(null);

  const pagination = useServerPagination(25);

  const { data, isLoading, error } = useAdminBuyers({
    search: search || undefined,
    tier: tier === "all" ? null : tier,
    organizationId: orgId === "all" ? null : orgId,
    status,
    from: pagination.from,
    to: pagination.to,
  });

  const orgNames = useMemo(() => {
    const map: Record<string, string> = {};
    visibleOrgs.forEach((o) => { map[o.id] = o.name; });
    return map;
  }, [visibleOrgs]);

  const rows = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const paginationProps = pagination.paginationProps(totalCount);

  const onFilterChange = (fn: () => void) => { fn(); pagination.resetPage(); };
  const hasFilters = !!search || tier !== "all" || orgId !== "all" || status !== "all";

  const clearFilters = () => onFilterChange(() => {
    setSearch(""); setTier("all"); setOrgId("all"); setStatus("all");
  });

  if (!orgLoading && !isSuperAdmin) {
    return (
      <Layout>
        <Card className="max-w-md mx-auto mt-16">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 mx-auto text-warning" />
            <h1 className="text-lg font-semibold">Acceso restringido</h1>
            <p className="text-sm text-muted-foreground">
              Esta vista de administración solo está disponible para super administradores.
            </p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Administración de Inversionistas
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} registro{totalCount === 1 ? "" : "s"} en todas las organizaciones
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre, empresa, email o teléfono..."
                className="pl-9"
                value={search}
                onChange={(e) => onFilterChange(() => setSearch(e.target.value))}
              />
            </div>

            <Select value={tier} onValueChange={(v) => onFilterChange(() => setTier(v))}>
              <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tiers</SelectItem>
                {Object.entries(tierConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={orgId} onValueChange={(v) => onFilterChange(() => setOrgId(v))}>
              <SelectTrigger><SelectValue placeholder="Organización" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las organizaciones</SelectItem>
                {visibleOrgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => onFilterChange(() => setStatus(v as typeof status))}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="justify-start">
                <X className="h-4 w-4 mr-1" /> Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center text-sm text-destructive">
                No se pudieron cargar los registros.
              </div>
            ) : isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No hay registros que coincidan con los filtros.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="hidden lg:table-cell">Organización</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((b) => {
                      const cfg = tierConfig[b.tier as string] ?? tierConfig.bronze;
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            <div className="font-medium">{b.contact_name}</div>
                            {b.company_name && (
                              <div className="text-xs text-muted-foreground">{b.company_name}</div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground break-all">
                            {b.email || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {b.phone || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {orgNames[b.organization_id] ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={b.is_active ? "default" : "secondary"} className="text-xs">
                              {b.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setViewBuyer(b as Buyer)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalCount > 0 && <DataPagination {...paginationProps} />}
      </div>

      <BuyerDetailSheet
        buyer={viewBuyer}
        open={!!viewBuyer}
        onOpenChange={(open) => !open && setViewBuyer(null)}
      />
    </Layout>
  );
};

export default AdminBuyers;
