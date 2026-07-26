import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building2, Mail, Phone, MapPin, DollarSign, Home } from 'lucide-react';
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
  if (!buyer) return null;

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
            <Badge variant={buyer.is_active ? 'default' : 'secondary'}>
              {buyer.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
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
                        <Badge key={zip} variant="outline" className="text-xs">{zip}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Métricas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Volumen total</p>
                    <p className="font-medium">${(buyer.total_volume || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deals cerrados</p>
                  <p className="font-medium">{buyer.deals_closed || 0}</p>
                </div>
              </CardContent>
            </Card>

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
