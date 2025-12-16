import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useRealtors, useCreateRealtor } from "@/hooks/useRealtors";
import { useRealtorStats } from "@/hooks/useRealtorStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Building2,
  Phone,
  Mail
} from "lucide-react";
import { RealtorDetailSheet } from "@/components/realtors/RealtorDetailSheet";

export default function Realtors() {
  const { data: realtors, isLoading } = useRealtors();
  const { data: stats, isLoading: statsLoading } = useRealtorStats();
  const createRealtor = useCreateRealtor();
  
  const [newRealtorOpen, setNewRealtorOpen] = useState(false);
  const [newRealtorData, setNewRealtorData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [selectedRealtorId, setSelectedRealtorId] = useState<string | null>(null);

  const handleCreateRealtor = () => {
    if (!newRealtorData.name) return;
    createRealtor.mutate(newRealtorData, {
      onSuccess: () => {
        setNewRealtorOpen(false);
        setNewRealtorData({ name: "", email: "", phone: "", company: "" });
      },
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Realtors</h1>
            <p className="text-muted-foreground">
              Gestiona tus relaciones con Realtors y trackea referidos
            </p>
          </div>
          <Dialog open={newRealtorOpen} onOpenChange={setNewRealtorOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Realtor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Realtor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newRealtorData.name}
                    onChange={(e) =>
                      setNewRealtorData({ ...newRealtorData, name: e.target.value })
                    }
                    placeholder="Nombre del Realtor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newRealtorData.email}
                    onChange={(e) =>
                      setNewRealtorData({ ...newRealtorData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={newRealtorData.phone}
                    onChange={(e) =>
                      setNewRealtorData({ ...newRealtorData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={newRealtorData.company}
                    onChange={(e) =>
                      setNewRealtorData({ ...newRealtorData, company: e.target.value })
                    }
                    placeholder="RE/MAX, Keller Williams, etc."
                  />
                </div>
                <Button
                  onClick={handleCreateRealtor}
                  disabled={!newRealtorData.name || createRealtor.isPending}
                  className="w-full gradient-primary"
                >
                  {createRealtor.isPending ? "Guardando..." : "Guardar Realtor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Realtors
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalRealtors || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Referidos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comisiones Pendientes
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-warning">
                  {formatCurrency(stats?.pendingCommissions || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comisiones Pagadas
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(stats?.paidCommissions || 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Realtors Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Lista de Realtors</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : realtors && realtors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Realtor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Referidos</TableHead>
                    <TableHead className="text-right">Comisión Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realtors.map((realtor) => {
                    const realtorStats = stats?.realtorDetails?.find(
                      (r) => r.id === realtor.id
                    );
                    return (
                      <TableRow
                        key={realtor.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedRealtorId(realtor.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{realtor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {realtor.email && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {realtor.email}
                              </div>
                            )}
                            {realtor.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {realtor.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {realtor.company ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {realtor.company}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {realtorStats?.referralCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={realtorStats?.pendingCommission ? "text-warning font-medium" : "text-muted-foreground"}>
                            {formatCurrency(realtorStats?.pendingCommission || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={realtor.is_active ? "default" : "secondary"}
                            className={realtor.is_active ? "bg-success/20 text-success" : ""}
                          >
                            {realtor.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  No hay Realtors
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Agrega tu primer Realtor para comenzar a trackear referidos
                </p>
                <Button onClick={() => setNewRealtorOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Realtor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <RealtorDetailSheet
        realtorId={selectedRealtorId}
        open={!!selectedRealtorId}
        onOpenChange={(open) => !open && setSelectedRealtorId(null)}
      />
    </Layout>
  );
}
