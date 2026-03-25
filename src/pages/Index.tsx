import { Link } from 'react-router-dom';
import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LeadsDelDia } from "@/components/dashboard/LeadsDelDia";
import { PipelinePreview } from "@/components/dashboard/PipelinePreview";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DeadLeadsAnalytics } from "@/components/dashboard/DeadLeadsAnalytics";
import { BuyerLiquidityWidget } from "@/components/dashboard/BuyerLiquidityWidget";
import { HotLeadsWidget } from "@/components/dashboard/HotLeadsWidget";
import { StaleLeadsAlert } from "@/components/dashboard/StaleLeadsAlert";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { Target, Users, DollarSign, TrendingUp, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useAuth();
  
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario';

  return (
    <Layout>
      {/* Hero Section */}
      <div className="mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Bienvenido, {userName}</h1>
              <Badge variant="glow" className="animate-pulse-glow">
                <Zap className="mr-1 h-3 w-3" />
                AI Active
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Aquí está el resumen de tu pipeline de wholesaling hoy.
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/import">Import Leads</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/leads">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Lead
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <StatsCard
              title="Buyers Activos"
              value={stats?.buyersInNetwork.toString() || "0"}
              change="En la red de compradores"
              changeType="neutral"
              icon={Users}
              iconColor="text-info"
            />
            <StatsCard
              title="Deals Activos"
              value={stats?.activeDeals.toString() || "0"}
              change="Bajo contrato o cesión"
              changeType="positive"
              icon={DollarSign}
              iconColor="text-success"
            />
            <StatsCard
              title="PIW Score Prom."
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

      {/* Centro de Acción - Full Width */}
      <div className="mb-6">
        <LeadsDelDia />
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Pipeline + Activity */}
        <div className="lg:col-span-2 space-y-6">
          <PipelinePreview />
          <ActivityFeed />
        </div>

        {/* Right Column - Buyers & Dead Leads */}
        <div className="space-y-6">
          <BuyerLiquidityWidget />
          <DeadLeadsAnalytics />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
