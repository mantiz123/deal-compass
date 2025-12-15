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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Buyer } from '@/hooks/useBuyers';
import {
  Send,
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  DollarSign,
  Home,
  Loader2,
  FileText,
  Calendar,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendToBuyerSheetProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const channelConfig = {
  email: { label: 'Email', icon: Mail, color: 'text-info' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-success' },
  whatsapp: { label: 'WhatsApp', icon: Phone, color: 'text-accent' },
};

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Casa Unifamiliar',
  multi_family: 'Multifamiliar',
  condo: 'Condominio',
  townhouse: 'Townhouse',
  land: 'Terreno',
  commercial: 'Comercial',
};

export function SendToBuyerSheet({ buyer, open, onOpenChange }: SendToBuyerSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<('email' | 'sms' | 'whatsapp')[]>(['email']);

  // Fetch leads under contract that haven't been sent to this buyer yet
  const { data: availableLeads, isLoading } = useQuery({
    queryKey: ['leads-for-buyer', buyer?.id],
    queryFn: async () => {
      if (!buyer?.id) return [];

      // Get leads under contract with property data
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          properties:property_id (*)
        `)
        .eq('status', 'bajo_contrato');

      if (leadsError) throw leadsError;

      // Get already sent deal packages
      const { data: sentPackages, error: packagesError } = await supabase
        .from('deal_packages')
        .select('lead_id')
        .eq('buyer_id', buyer.id);

      if (packagesError) throw packagesError;

      const sentLeadIds = new Set(sentPackages?.map(p => p.lead_id) || []);

      // Filter out already sent leads and add match info
      return leads
        ?.filter(lead => !sentLeadIds.has(lead.id))
        .map(lead => {
          // Calculate basic match score based on buyer preferences
          let matchScore = 50;
          const matchReasons: string[] = [];

          const property = lead.properties as any;
          if (!property) return { ...lead, property, matchScore, matchReasons };

          // ZIP code match
          if (buyer.preferred_zip_codes?.includes(property.zip_code)) {
            matchScore += 20;
            matchReasons.push('ZIP coincide');
          }

          // Property type match
          if (buyer.preferred_property_types?.includes(property.property_type)) {
            matchScore += 15;
            matchReasons.push('Tipo coincide');
          }

          // ARV range match
          const arv = Number(property.arv);
          const minArv = Number(buyer.min_arv);
          const maxArv = Number(buyer.max_arv);
          if (arv && minArv && maxArv && arv >= minArv && arv <= maxArv) {
            matchScore += 15;
            matchReasons.push('ARV en rango');
          }

          return {
            ...lead,
            property,
            matchScore: Math.min(matchScore, 100),
            matchReasons,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore) || [];
    },
    enabled: !!buyer?.id && open,
  });

  // Send deal packages mutation
  const sendPackages = useMutation({
    mutationFn: async ({ leadIds, buyerId }: { leadIds: string[]; buyerId: string }) => {
      const packages = leadIds.map(leadId => ({
        lead_id: leadId,
        buyer_id: buyerId,
        sent_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('deal_packages')
        .insert(packages);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-for-buyer'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-deals'] });
      toast({
        title: 'Deal Packages enviados',
        description: `Se han enviado ${selectedLeads.length} deal package(s) a ${buyer?.contact_name}`,
      });
      setSelectedLeads([]);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error sending deal packages:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron enviar los deal packages',
        variant: 'destructive',
      });
    },
  });

  const toggleLead = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleChannel = (channel: 'email' | 'sms' | 'whatsapp') => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const selectAll = () => {
    if (availableLeads) {
      setSelectedLeads(availableLeads.map(l => l.id));
    }
  };

  const handleSend = async () => {
    if (!buyer || selectedLeads.length === 0) return;
    await sendPackages.mutateAsync({
      leadIds: selectedLeads,
      buyerId: buyer.id,
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  if (!buyer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Deals a {buyer.contact_name}
          </SheetTitle>
          <SheetDescription>
            Selecciona los leads bajo contrato para enviar como deal packages
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-6 space-y-4">
          {/* Buyer Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{buyer.company_name || buyer.contact_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {buyer.deals_closed || 0} deals cerrados • {buyer.avg_close_time_days || '-'} días promedio
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Rango ARV</p>
                  <p className="font-medium">
                    ${(buyer.min_arv || 0).toLocaleString()} - ${(buyer.max_arv || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Channel Selection */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
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
            <p className="text-xs text-muted-foreground mt-1">
              * El envío real requiere configurar las APIs de comunicación
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Leads Bajo Contrato ({availableLeads?.length || 0})
            </h4>
            {availableLeads && availableLeads.length > 0 && (
              <Button variant="outline" size="sm" onClick={selectAll}>
                Seleccionar Todos
              </Button>
            )}
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

          {/* Leads List */}
          {!isLoading && availableLeads && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2 pb-4">
                {availableLeads.length === 0 ? (
                  <Card className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      No hay leads bajo contrato disponibles para este comprador.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ya se han enviado todos los deals o no hay leads bajo contrato.
                    </p>
                  </Card>
                ) : (
                  availableLeads.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.id);
                    return (
                      <Card
                        key={lead.id}
                        className={cn(
                          'cursor-pointer transition-all hover:bg-muted/50',
                          isSelected && 'ring-2 ring-primary bg-primary/5'
                        )}
                        onClick={() => toggleLead(lead.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              className="mt-1"
                              onCheckedChange={() => toggleLead(lead.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">
                                    {lead.property?.address || 'Dirección no disponible'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Zap className={cn('h-4 w-4', getMatchScoreColor(lead.matchScore))} />
                                  <span className={cn('font-bold', getMatchScoreColor(lead.matchScore))}>
                                    {lead.matchScore}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {lead.property?.city}, {lead.property?.state} {lead.property?.zip_code}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Home className="h-3 w-3" />
                                  {propertyTypeLabels[lead.property?.property_type] || lead.property?.property_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span>
                                  <span className="text-muted-foreground">ARV:</span>{' '}
                                  <span className="font-medium">
                                    ${Number(lead.property?.arv || 0).toLocaleString()}
                                  </span>
                                </span>
                                <span>
                                  <span className="text-muted-foreground">MAO:</span>{' '}
                                  <span className="font-medium text-success">
                                    ${Number(lead.property?.mao || 0).toLocaleString()}
                                  </span>
                                </span>
                                {lead.piw_score && (
                                  <Badge variant="outline" className="text-xs">
                                    PIW {lead.piw_score}
                                  </Badge>
                                )}
                              </div>
                              {lead.matchReasons.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {lead.matchReasons.map((reason, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="text-[10px] font-normal"
                                    >
                                      {reason}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}

          {/* Send Button */}
          <div className="pt-4 border-t border-border">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSend}
              disabled={selectedLeads.length === 0 || selectedChannels.length === 0 || sendPackages.isPending}
            >
              {sendPackages.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar {selectedLeads.length} Deal Package{selectedLeads.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
            {selectedLeads.length > 0 && (
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
