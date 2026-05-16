import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Award,
  Home,
  FileText,
  Calendar,
  CheckCircle2,
  Eye,
  MousePointer,
  Send
} from 'lucide-react';
import type { Buyer } from '@/hooks/useBuyers';

interface BuyerDetailSheetProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierColors: Record<string, string> = {
  platinum: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900',
  gold: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900',
  silver: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
  bronze: 'bg-gradient-to-r from-orange-300 to-orange-400 text-orange-900',
};

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Casa Unifamiliar',
  multi_family: 'Multifamiliar',
  condo: 'Condominio',
  townhouse: 'Townhouse',
  land: 'Terreno',
  commercial: 'Comercial',
};

export function BuyerDetailSheet({ buyer, open, onOpenChange }: BuyerDetailSheetProps) {
  const sendReactivationMutation = useMutation({
    mutationFn: async () => {
      if (!buyer?.id) throw new Error("No buyer selected");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reactivate-buyers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ buyer_id: buyer.id }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Send failed");
      return result as { sent: number; failed: number };
    },
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(`Email enviado a ${buyer?.contact_name ?? "buyer"}`);
      } else {
        toast.error("No se pudo enviar — verifica que el buyer tenga email");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Fetch deal packages for this buyer
  const { data: dealPackages, isLoading: loadingDeals } = useQuery({
    queryKey: ['buyer-deals', buyer?.id],
    queryFn: async () => {
      if (!buyer?.id) return [];
      const { data, error } = await supabase
        .from('deal_packages')
        .select(`
          *,
          leads:lead_id (
            id,
            status,
            offer_amount,
            assignment_fee,
            closing_date,
            properties:property_id (
              address,
              city,
              state,
              zip_code,
              arv,
              property_type
            )
          )
        `)
        .eq('buyer_id', buyer.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!buyer?.id && open,
  });

  if (!buyer) return null;

  const closedDeals = dealPackages?.filter(dp => dp.response === 'accepted') || [];
  const pendingDeals = dealPackages?.filter(dp => !dp.response || dp.response === 'pending') || [];
  const openRate = dealPackages?.length 
    ? Math.round((dealPackages.filter(dp => dp.opened_at).length / dealPackages.length) * 100) 
    : 0;
  const clickRate = dealPackages?.length 
    ? Math.round((dealPackages.filter(dp => dp.clicked_at).length / dealPackages.length) * 100) 
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-2xl flex items-center gap-3">
                {buyer.contact_name}
                <Badge className={tierColors[buyer.tier]}>
                  {buyer.tier.charAt(0).toUpperCase() + buyer.tier.slice(1)}
                </Badge>
              </SheetTitle>
              {buyer.company_name && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {buyer.company_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={buyer.is_active ? 'default' : 'secondary'}>
                {buyer.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          {buyer.is_active && (
            <Button
              className="mt-3 w-full"
              onClick={() => sendReactivationMutation.mutate()}
              disabled={sendReactivationMutation.isPending || !buyer.email}
              title={!buyer.email ? "Este buyer no tiene email registrado" : "Enviar email de reactivación profesional"}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendReactivationMutation.isPending ? "Enviando…" : "Enviar Deal Package"}
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {buyer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${buyer.email}`} className="text-primary hover:underline">
                      {buyer.email}
                    </a>
                  </div>
                )}
                {buyer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${buyer.phone}`} className="text-primary hover:underline">
                      {buyer.phone}
                    </a>
                  </div>
                )}
                {buyer.preferred_zip_codes && buyer.preferred_zip_codes.length > 0 && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {buyer.preferred_zip_codes.map((zip) => (
                        <Badge key={zip} variant="outline" className="text-xs">
                          {zip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Deals Cerrados
                  </div>
                  <p className="text-2xl font-bold text-primary">{buyer.deals_closed || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/50 border-accent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Volumen Total
                  </div>
                  <p className="text-2xl font-bold">
                    ${(buyer.total_volume || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    Tiempo Promedio Cierre
                  </div>
                  <p className="text-2xl font-bold">
                    {buyer.avg_close_time_days || '-'} <span className="text-sm font-normal">días</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Award className="h-3.5 w-3.5" />
                    AI Match Score
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {buyer.ai_match_score || '-'}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Engagement de Deal Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <FileText className="h-3.5 w-3.5" />
                      Enviados
                    </div>
                    <p className="text-xl font-semibold">{dealPackages?.length || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <Eye className="h-3.5 w-3.5" />
                      Tasa Apertura
                    </div>
                    <p className="text-xl font-semibold">{openRate}%</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <MousePointer className="h-3.5 w-3.5" />
                      Tasa Clicks
                    </div>
                    <p className="text-xl font-semibold">{clickRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Buying Criteria */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Criterios de Compra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rango ARV</p>
                    <p className="font-medium">
                      ${(buyer.min_arv || 0).toLocaleString()} - ${(buyer.max_arv || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nivel Máximo Reparación</p>
                    <p className="font-medium capitalize">{buyer.max_repair_level || 'No especificado'}</p>
                  </div>
                </div>
                {buyer.preferred_property_types && buyer.preferred_property_types.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tipos de Propiedad Preferidos</p>
                    <div className="flex flex-wrap gap-1">
                      {buyer.preferred_property_types.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          <Home className="h-3 w-3 mr-1" />
                          {propertyTypeLabels[type] || type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {buyer.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{buyer.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Deal History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Historial de Deals
                  <Badge variant="outline">{dealPackages?.length || 0} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDeals ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                ) : dealPackages && dealPackages.length > 0 ? (
                  <div className="space-y-3">
                    {dealPackages.map((deal) => (
                      <div 
                        key={deal.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {deal.leads?.properties?.address || 'Dirección no disponible'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(deal.sent_at), "d MMM yyyy", { locale: es })}
                            {deal.leads?.properties?.city && (
                              <>
                                <span>•</span>
                                {deal.leads.properties.city}, {deal.leads.properties.state}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {deal.opened_at && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Visto
                            </Badge>
                          )}
                          {deal.response === 'accepted' ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Cerrado
                            </Badge>
                          ) : deal.response === 'rejected' ? (
                            <Badge variant="destructive">Rechazado</Badge>
                          ) : (
                            <Badge variant="secondary">Pendiente</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay deals enviados a este comprador
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Creado: {format(new Date(buyer.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}</p>
              <p>Actualizado: {format(new Date(buyer.updated_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

    </Sheet>
  );
}
