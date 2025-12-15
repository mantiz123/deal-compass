import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuyerMatchmaking, useSendDealPackage } from '@/hooks/useBuyerMatchmaking';
import type { Lead } from '@/hooks/useLeads';
import {
  Send,
  Mail,
  MessageSquare,
  Phone,
  Zap,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendDealPackageSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierConfig = {
  platinum: { label: 'Platinum', color: 'bg-primary/20 text-primary border-primary/30' },
  gold: { label: 'Gold', color: 'bg-accent/20 text-accent border-accent/30' },
  silver: { label: 'Silver', color: 'bg-muted text-muted-foreground border-border' },
  bronze: { label: 'Bronze', color: 'bg-warning/10 text-warning border-warning/30' },
};

const channelConfig = {
  email: { label: 'Email', icon: Mail, color: 'text-info' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-success' },
  whatsapp: { label: 'WhatsApp', icon: Phone, color: 'text-accent' },
};

export function SendDealPackageSheet({ lead, open, onOpenChange }: SendDealPackageSheetProps) {
  const { data: matchedBuyers, isLoading } = useBuyerMatchmaking(lead);
  const sendPackage = useSendDealPackage();
  
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<('email' | 'sms' | 'whatsapp')[]>(['email']);

  const toggleBuyer = (buyerId: string) => {
    setSelectedBuyers(prev =>
      prev.includes(buyerId)
        ? prev.filter(id => id !== buyerId)
        : [...prev, buyerId]
    );
  };

  const toggleChannel = (channel: 'email' | 'sms' | 'whatsapp') => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const selectTopBuyers = (count: number) => {
    if (matchedBuyers) {
      setSelectedBuyers(matchedBuyers.slice(0, count).map(b => b.id));
    }
  };

  const handleSend = async () => {
    if (!lead || selectedBuyers.length === 0) return;
    
    await sendPackage.mutateAsync({
      leadId: lead.id,
      buyerIds: selectedBuyers,
      channels: selectedChannels,
    });
    
    setSelectedBuyers([]);
    onOpenChange(false);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Enviar Deal Package
          </SheetTitle>
          <SheetDescription>
            {lead?.property?.address} - Selecciona compradores y canales de comunicación
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Deal Summary */}
          {lead && (
            <Card variant="glass">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Resumen del Deal</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ARV:</span>
                    <span className="ml-2 font-semibold">
                      ${lead.property?.arv?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MAO:</span>
                    <span className="ml-2 font-semibold text-success">
                      ${lead.property?.mao?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium capitalize">
                      {lead.property?.property_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ZIP:</span>
                    <span className="ml-2 font-medium">{lead.property?.zip_code}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channel Selection */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Canales de Envío
            </h4>
            <div className="flex gap-2">
              {(Object.entries(channelConfig) as [keyof typeof channelConfig, typeof channelConfig.email][]).map(
                ([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedChannels.includes(key);
                  return (
                    <Button
                      key={key}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleChannel(key)}
                      className={cn(isSelected && 'ring-2 ring-primary/50')}
                    >
                      <Icon className={cn('h-4 w-4 mr-2', isSelected ? '' : config.color)} />
                      {config.label}
                    </Button>
                  );
                }
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Configura las APIs de comunicación para habilitar el envío automático
            </p>
          </div>

          {/* Quick Select */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Compradores Coincidentes ({matchedBuyers?.length || 0})
            </h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => selectTopBuyers(3)}>
                Top 3
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectTopBuyers(5)}>
                Top 5
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectTopBuyers(10)}>
                Top 10
              </Button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Buyers List */}
          {!isLoading && matchedBuyers && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {matchedBuyers.length === 0 ? (
                <Card variant="glass" className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No hay compradores activos que coincidan con este deal.
                  </p>
                </Card>
              ) : (
                matchedBuyers.map((buyer, index) => {
                  const isSelected = selectedBuyers.includes(buyer.id);
                  return (
                    <Card
                      key={buyer.id}
                      variant="interactive"
                      className={cn(
                        'cursor-pointer transition-all',
                        isSelected && 'ring-2 ring-primary bg-primary/5'
                      )}
                      onClick={() => toggleBuyer(buyer.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            className="mt-1"
                            onCheckedChange={() => toggleBuyer(buyer.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{buyer.company_name || buyer.contact_name}</span>
                                <Badge className={tierConfig[buyer.tier].color} variant="outline">
                                  {tierConfig[buyer.tier].label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className={cn('h-4 w-4', getMatchScoreColor(buyer.matchScore))} />
                                <span className={cn('font-bold', getMatchScoreColor(buyer.matchScore))}>
                                  {buyer.matchScore}%
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {buyer.contact_name} • {buyer.deals_closed || 0} deals cerrados
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {buyer.matchReasons.slice(0, 3).map((reason, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-[10px] font-normal"
                                >
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Send Button */}
          <div className="pt-4 border-t border-border">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSend}
              disabled={selectedBuyers.length === 0 || selectedChannels.length === 0 || sendPackage.isPending}
            >
              {sendPackage.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a {selectedBuyers.length} Comprador{selectedBuyers.length !== 1 ? 'es' : ''}
                </>
              )}
            </Button>
            {selectedBuyers.length > 0 && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Se enviará por: {selectedChannels.map(c => channelConfig[c].label).join(', ')}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
