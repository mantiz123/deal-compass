import { Link } from 'react-router-dom';
import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LeadsDelDia } from "@/components/dashboard/LeadsDelDia";
import { PipelinePreview } from "@/components/dashboard/PipelinePreview";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DeadLeadsAnalytics } from "@/components/dashboard/DeadLeadsAnalytics";
import { BuyerLiquidityWidget } from "@/components/dashboard/BuyerLiquidityWidget";
import { HotLeadsWidget } from "@/components/dashboard/HotLeadsWidget";
import { CriticalActionsWidget } from "@/components/dashboard/CriticalActionsWidget";
import { StaleLeadsAlert } from "@/components/dashboard/StaleLeadsAlert";
import { PipelineHygieneWidget } from "@/components/dashboard/PipelineHygieneWidget";
import { PayoutScheduleWidget } from "@/components/dashboard/PayoutScheduleWidget";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Target, Users, DollarSign, TrendingUp, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useAuth();
  const { currentOrg, isSuperAdmin } = useOrganization();

  // Klose-only widgets (Stripe/Mercury, buyers IP, hygiene engine, dead-leads analytics)
  // visible solo para super admin u orgs internal/elite. Estudiantes (free/pro) ven UI accionable.
  const showInternalWidgets =
    isSuperAdmin ||
    currentOrg?.is_klose_internal ||
    currentOrg?.tier === 'internal' ||
    currentOrg?.tier === 'elite';

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario';

  return (
    <Layout>
      {/* Hero Section */}
      <div className="mb-6 sm:mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Bienvenido, {userName}</h1>
              <Badge variant="glow" className="animate-pulse-glow text-[10px] sm:text-xs flex-shrink-0">
                <Zap className="mr-1 h-3 w-3" />
                AI Active
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              Aquí está el resumen de tu pipeline de wholesaling hoy.
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-initial">
              <Link to="/import">Import</Link>
            </Button>
            <Button size="sm" asChild className="flex-1 sm:flex-initial">
              <Link to="/leads">
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                Nuevo Lead
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Leads"
              value={stats?.totalLeads.toString() || "0"}
              change={`${stats?.leadsByStatus?.captacion || 0} en captación`}
              changeType="neutral"
              icon={Target}
              iconColor="text-primary"
            />
            {showInternalWidgets ? (
              <StatsCard
                title="Buyers Activos"
                value={stats?.buyersInNetwork.toString() || "0"}
                change="En la red de compradores"
                changeType="neutral"
                icon={Users}
                iconColor="text-info"
              />
            ) : (
              <StatsCard
                title="En Pipeline"
                value={(
                  (stats?.leadsByStatus?.contacto || 0) +
                  (stats?.leadsByStatus?.bajo_contrato || 0) +
                  (stats?.leadsByStatus?.cesion || 0)
                ).toString()}
                change="Leads activos en seguimiento"
                changeType="neutral"
                icon={Users}
                iconColor="text-info"
              />
            )}
            <StatsCard
              title="Deals Activos"
              value={stats?.activeDeals.toString() || "0"}
              change="Bajo contrato o cesión"
              changeType="positive"
              icon={DollarSign}
              iconColor="text-success"
            />
            <StatsCard
              title="K-Score Prom."
              value={stats?.avgPIWScore.toString() || "0"}
              change="Promedio de leads con score"
              changeType="neutral"
              icon={TrendingUp}
              iconColor="text-accent"
            />
          </>
        )}
      </div>

      {/* Stale Leads Alert */}
      <div className="mb-6">
        <StaleLeadsAlert />
      </div>

      {/* Hot Leads + Critical Actions side by side */}
      <div className="mb-6 grid gap-4 sm:gap-6 lg:grid-cols-2">
        <HotLeadsWidget />
        <CriticalActionsWidget />
      </div>

      {/* Centro de Acción - Full Width */}
      <div className="mb-6">
        <LeadsDelDia />
      </div>

      {/* Secondary Grid */}
      <div className={`grid gap-6 ${showInternalWidgets ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* Left Column - Pipeline + Activity */}
        <div className={`${showInternalWidgets ? 'lg:col-span-2' : ''} space-y-6`}>
          <PipelinePreview />
          <ActivityFeed />
        </div>

        {/* Right Column - widgets internos solo para Klose admin/internal/elite */}
        {showInternalWidgets && (
          <div className="space-y-6">
            <PayoutScheduleWidget />
            <PipelineHygieneWidget />
            <BuyerLiquidityWidget />
            <DeadLeadsAnalytics />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
