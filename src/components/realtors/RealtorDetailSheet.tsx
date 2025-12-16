import { useRealtors } from "@/hooks/useRealtors";
import { useRealtorReferrals, useRealtorStats } from "@/hooks/useRealtorStats";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign,
  Clock,
  CheckCircle2,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RealtorDetailSheetProps {
  realtorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  captacion: "Captación",
  contacto: "Contacto",
  bajo_contrato: "Bajo Contrato",
  cesion: "Cesión",
  cerrado: "Cerrado",
};

const statusColors: Record<string, string> = {
  captacion: "bg-blue-500/20 text-blue-400",
  contacto: "bg-purple-500/20 text-purple-400",
  bajo_contrato: "bg-amber-500/20 text-amber-400",
  cesion: "bg-cyan-500/20 text-cyan-400",
  cerrado: "bg-green-500/20 text-green-400",
};

export function RealtorDetailSheet({
  realtorId,
  open,
  onOpenChange,
}: RealtorDetailSheetProps) {
  const { data: realtors } = useRealtors();
  const { data: referrals, isLoading: referralsLoading } = useRealtorReferrals(realtorId);
  const { data: stats } = useRealtorStats();

  const realtor = realtors?.find((r) => r.id === realtorId);
  const realtorStats = stats?.realtorDetails?.find((r) => r.id === realtorId);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!realtor) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-2xl">{realtor.name}</SheetTitle>
              <Badge
                variant={realtor.is_active ? "default" : "secondary"}
                className={realtor.is_active ? "bg-success/20 text-success" : ""}
              >
                {realtor.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {realtor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${realtor.email}`} className="text-primary hover:underline">
                    {realtor.email}
                  </a>
                </div>
              )}
              {realtor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${realtor.phone}`} className="text-primary hover:underline">
                    {realtor.phone}
                  </a>
                </div>
              )}
              {realtor.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{realtor.company}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="glass-card">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{realtorStats?.referralCount || 0}</div>
                <div className="text-xs text-muted-foreground">Referidos</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-lg font-bold text-warning">
                    {formatCurrency(realtorStats?.pendingCommission || 0)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Pendiente</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(realtorStats?.paidCommission || 0)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Pagado</div>
              </CardContent>
            </Card>
          </div>

          {/* Referrals List */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Referidos</CardTitle>
            </CardHeader>
            <CardContent>
              {referralsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : referrals && referrals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propiedad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => {
                      const property = referral.property as {
                        address: string;
                        city: string;
                        state: string;
                        zip_code: string;
                      } | null;
                      
                      return (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {property?.address || "Sin dirección"}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {property
                                  ? `${property.city}, ${property.state}`
                                  : "-"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(referral.created_at), "d MMM yyyy", {
                                  locale: es,
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[referral.status] || ""}>
                              {statusLabels[referral.status] || referral.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className={referral.status === "cerrado" ? "text-success" : "text-warning"}>
                                {formatCurrency(referral.referral_commission)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay referidos aún</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
