import { Link } from 'react-router-dom';
import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, DollarSign, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Investor';

  return (
    <Layout>
      <div className="mb-6 sm:mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
              Bienvenido, {userName}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base mt-1">
              Panel de inversión Section 8 — Alabama
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/import">Importar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/properties">
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                Nueva Propiedad
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}</>
        ) : (
          <>
            <StatsCard
              title="Propiedades"
              value={stats?.totalProperties.toString() || "0"}
              change="En inventario"
              changeType="neutral"
              icon={Building2}
              iconColor="text-primary"
            />
            <StatsCard
              title="Inversionistas"
              value={stats?.totalInvestors.toString() || "0"}
              change="En la red"
              changeType="neutral"
              icon={Users}
              iconColor="text-info"
            />
            <StatsCard
              title="Cobros pendientes"
              value={`$${(stats?.pendingPayments || 0).toLocaleString()}`}
              change={`${stats?.pendingCount || 0} pagos`}
              changeType="neutral"
              icon={DollarSign}
              iconColor="text-warning"
            />
            <StatsCard
              title="Cobros recibidos"
              value={`$${(stats?.receivedPayments || 0).toLocaleString()}`}
              change="Total histórico"
              changeType="positive"
              icon={TrendingUp}
              iconColor="text-success"
            />
          </>
        )}
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Próximos módulos Section 8</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Análisis financiero: cashflow, cap rate, DSCR y proyección multianual</p>
          <p>• HUD Fair Market Rents por ZIP (Alabama)</p>
          <p>• Rehab estimator con checklist HQS</p>
          <p>• Deal Room para enviar oportunidades a inversionistas</p>
          <p>• Directorio de DSCR lenders</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Index;
