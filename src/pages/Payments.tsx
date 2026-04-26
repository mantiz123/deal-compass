import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { NewPaymentDialog } from '@/components/payments/NewPaymentDialog';
import { MonthlyIncomeChart } from '@/components/payments/MonthlyIncomeChart';
import { usePaymentStats } from '@/hooks/usePayments';
import { 
  Plus, 
  DollarSign, 
  Clock, 
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

export default function Payments() {
  const [showNewPayment, setShowNewPayment] = useState(false);
  const { data: stats, isLoading: loadingStats } = usePaymentStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Pagos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tracking de pagos recibidos y pendientes
            </p>
          </div>
          <Button onClick={() => setShowNewPayment(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pago
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recibido</p>
                {loadingStats ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(stats?.totalReceived || 0)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                {loadingStats ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(stats?.totalPending || 0)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagos Completados</p>
                {loadingStats ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.paidCount || 0}</p>
                )}
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por Cobrar</p>
                {loadingStats ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.pendingCount || 0}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Monthly Income Chart */}
        <MonthlyIncomeChart />

        {/* Payments Table */}
        <PaymentsTable />
      </div>

      <NewPaymentDialog 
        open={showNewPayment} 
        onOpenChange={setShowNewPayment} 
      />
    </Layout>
  );
}
