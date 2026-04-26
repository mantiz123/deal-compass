import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { NewCampaignDialog } from '@/components/campaigns/NewCampaignDialog';
import { 
  useCampaigns, 
  useCampaignStats, 
  useToggleCampaign,
  type DripCampaign 
} from '@/hooks/useCampaigns';
import {
  Plus,
  Mail,
  MessageSquare,
  Users,
  Zap,
  Send,
  Target,
  Clock,
  MoreHorizontal,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  captacion: 'Captación',
  contacto: 'Contacto',
  bajo_contrato: 'Bajo Contrato',
  cesion: 'Cesión',
  cerrado: 'Cerrado',
};

const Campaigns = () => {
  const { data: campaigns, isLoading, error } = useCampaigns();
  const { data: stats } = useCampaignStats();
  const toggleCampaign = useToggleCampaign();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleToggle = (campaign: DripCampaign) => {
    toggleCampaign.mutate({ id: campaign.id, is_active: !campaign.is_active });
  };

  const getSequencesSummary = (campaign: DripCampaign) => {
    const sequences = campaign.sequences || [];
    const emails = sequences.filter(s => s.channel === 'email').length;
    const sms = sequences.filter(s => s.channel === 'sms').length;
    return { emails, sms, total: sequences.length };
  };

  const getTotalDuration = (campaign: DripCampaign) => {
    const sequences = campaign.sequences || [];
    const totalDays = sequences.reduce((acc, s) => acc + s.delay_days, 0);
    const totalHours = sequences.reduce((acc, s) => acc + s.delay_hours, 0);
    return totalDays + Math.floor(totalHours / 24);
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Drip Campaigns</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Automatiza secuencias de emails y SMS para nutrir tus leads
            </p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Campañas</p>
                <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Megaphone className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold">{stats?.activeCampaigns || 0}</p>
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
                <p className="text-sm text-muted-foreground">Leads Enrolados</p>
                <p className="text-2xl font-bold">{stats?.totalEnrollments || 0}</p>
              </div>
              <div className="rounded-lg bg-info/10 p-2 text-info">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensajes Enviados</p>
                <p className="text-2xl font-bold">{stats?.messagesSent || 0}</p>
              </div>
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <Send className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 p-4 bg-warning/10 border-warning/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <p className="font-medium text-warning">Integraciones Pendientes</p>
            <p className="text-sm text-muted-foreground">
              Para enviar mensajes reales, configura las API keys de <strong>Twilio</strong> (SMS) y <strong>Resend</strong> (Email). 
              Por ahora puedes crear y diseñar tus campañas.
            </p>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="glass">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-1/2" />
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
            <h3 className="text-lg font-semibold mb-2">Error al cargar campañas</h3>
            <p className="text-muted-foreground">Por favor, intenta de nuevo más tarde.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && campaigns?.length === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay campañas todavía</h3>
            <p className="text-muted-foreground mb-6">
              Crea tu primera campaña de drip marketing para automatizar el seguimiento de tus leads.
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primera Campaña
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaigns Grid */}
      {!isLoading && !error && campaigns && campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign, index) => {
            const summary = getSequencesSummary(campaign);
            const duration = getTotalDuration(campaign);

            return (
              <Card
                key={campaign.id}
                variant="interactive"
                className={cn(
                  'animate-fade-in',
                  !campaign.is_active && 'opacity-60'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {campaign.name}
                        {campaign.is_active && (
                          <Badge variant="glow" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        )}
                      </CardTitle>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={campaign.is_active}
                        onCheckedChange={() => handleToggle(campaign)}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trigger */}
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Trigger:</span>
                    <Badge variant="outline">
                      {statusLabels[campaign.trigger_status] || campaign.trigger_status}
                    </Badge>
                  </div>

                  {/* Sequence Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-info" />
                      <span>{summary.emails} emails</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-success" />
                      <span>{summary.sms} SMS</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{duration} días</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {campaign.enrollments_count || 0} leads enrolados
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Campaign Dialog */}
      <NewCampaignDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </Layout>
  );
};

export default Campaigns;
