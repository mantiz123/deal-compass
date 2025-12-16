import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Deal, useUpdateDealResponse } from '@/hooks/useDeals';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  Send,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DealDetailSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierColors: Record<string, string> = {
  platinum: 'bg-primary/20 text-primary border-primary/30',
  gold: 'bg-accent/20 text-accent border-accent/30',
  silver: 'bg-muted text-muted-foreground border-border',
  bronze: 'bg-warning/10 text-warning border-warning/30',
};

export function DealDetailSheet({ deal, open, onOpenChange }: DealDetailSheetProps) {
  const updateResponse = useUpdateDealResponse();

  if (!deal) return null;

  const getStatus = () => {
    if (deal.response === 'accepted') return { label: 'Aceptado', color: 'bg-success text-success-foreground', icon: CheckCircle2 };
    if (deal.response === 'rejected') return { label: 'Rechazado', color: 'bg-destructive text-destructive-foreground', icon: XCircle };
    if (deal.clicked_at) return { label: 'Clickeado', color: 'bg-primary text-primary-foreground', icon: MousePointerClick };
    if (deal.opened_at) return { label: 'Abierto', color: 'bg-info text-info-foreground', icon: Eye };
    return { label: 'Enviado', color: 'bg-muted text-muted-foreground', icon: Send };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const handleAccept = () => {
    updateResponse.mutate({ dealId: deal.id, response: 'accepted' });
  };

  const handleReject = () => {
    updateResponse.mutate({ dealId: deal.id, response: 'rejected' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', status.color)}>
              <StatusIcon className="h-4 w-4" />
            </div>
            Deal Package
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status & Timeline */}
          <Card variant="glass" className="p-4">
            <h4 className="text-sm font-medium mb-3">Estado y Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado actual</span>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Enviado:</span>
                  <span>{format(new Date(deal.sent_at), 'PPp', { locale: es })}</span>
                </div>
                {deal.opened_at && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-info" />
                    <span className="text-muted-foreground">Abierto:</span>
                    <span>{formatDistanceToNow(new Date(deal.opened_at), { addSuffix: true, locale: es })}</span>
                  </div>
                )}
                {deal.clicked_at && (
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Click:</span>
                    <span>{formatDistanceToNow(new Date(deal.clicked_at), { addSuffix: true, locale: es })}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Buyer Info */}
          <Card variant="glass" className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Comprador
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{deal.buyer.company_name || deal.buyer.contact_name}</span>
                <Badge variant="outline" className={tierColors[deal.buyer.tier]}>
                  {deal.buyer.tier}
                </Badge>
              </div>
              {deal.buyer.company_name && (
                <p className="text-sm text-muted-foreground">{deal.buyer.contact_name}</p>
              )}
              {deal.buyer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${deal.buyer.email}`} className="text-primary hover:underline">
                    {deal.buyer.email}
                  </a>
                </div>
              )}
              {deal.buyer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${deal.buyer.phone}`} className="text-primary hover:underline">
                    {deal.buyer.phone}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Property Info */}
          {deal.lead.property && (
            <Card variant="glass" className="p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Propiedad
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{deal.lead.property.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {deal.lead.property.city}, {deal.lead.property.state} {deal.lead.property.zip_code}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {deal.lead.property.arv && (
                    <div>
                      <span className="text-muted-foreground">ARV:</span>
                      <p className="font-semibold">${deal.lead.property.arv.toLocaleString()}</p>
                    </div>
                  )}
                  {deal.lead.property.mao && (
                    <div>
                      <span className="text-muted-foreground">MAO:</span>
                      <p className="font-semibold text-success">${deal.lead.property.mao.toLocaleString()}</p>
                    </div>
                  )}
                  {deal.lead.property.bedrooms && (
                    <div>
                      <span className="text-muted-foreground">Habitaciones:</span>
                      <p className="font-semibold">{deal.lead.property.bedrooms}</p>
                    </div>
                  )}
                  {deal.lead.property.bathrooms && (
                    <div>
                      <span className="text-muted-foreground">Baños:</span>
                      <p className="font-semibold">{deal.lead.property.bathrooms}</p>
                    </div>
                  )}
                  {deal.lead.property.sqft && (
                    <div>
                      <span className="text-muted-foreground">Área:</span>
                      <p className="font-semibold">{deal.lead.property.sqft.toLocaleString()} sqft</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Deal Terms */}
          <Card variant="glass" className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Términos del Deal
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {deal.lead.offer_amount && (
                <div>
                  <span className="text-muted-foreground">Oferta:</span>
                  <p className="font-semibold">${deal.lead.offer_amount.toLocaleString()}</p>
                </div>
              )}
              {deal.lead.assignment_fee && (
                <div>
                  <span className="text-muted-foreground">Assignment Fee:</span>
                  <p className="font-semibold text-success">${deal.lead.assignment_fee.toLocaleString()}</p>
                </div>
              )}
              {deal.lead.closing_date && (
                <div className="col-span-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fecha de cierre:
                  </span>
                  <p className="font-semibold">{format(new Date(deal.lead.closing_date), 'PPP', { locale: es })}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          {!deal.response && (
            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={handleReject}
                disabled={updateResponse.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleAccept}
                disabled={updateResponse.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aceptar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
