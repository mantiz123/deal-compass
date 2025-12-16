import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayments } from '@/hooks/usePayments';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MonthlyData {
  month: string;
  monthLabel: string;
  received: number;
  pending: number;
}

export function MonthlyIncomeChart() {
  const { data: payments, isLoading } = usePayments();

  const { chartData, comparison } = useMemo(() => {
    if (!payments) return { chartData: [], comparison: { percentage: 0, trend: 'neutral' as const } };

    // Generate last 6 months
    const months: MonthlyData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      let received = 0;
      let pending = 0;

      for (const payment of payments) {
        const paymentDate = payment.payment_date 
          ? new Date(payment.payment_date) 
          : new Date(payment.created_at);

        if (isWithinInterval(paymentDate, { start: monthStart, end: monthEnd })) {
          if (payment.status === 'paid') {
            received += Number(payment.amount);
          } else if (payment.status === 'pending') {
            pending += Number(payment.amount);
          }
        }
      }

      months.push({
        month: monthKey,
        monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        received,
        pending,
      });
    }

    // Calculate month-over-month comparison
    const currentMonth = months[months.length - 1]?.received || 0;
    const previousMonth = months[months.length - 2]?.received || 0;
    
    let percentage = 0;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    
    if (previousMonth > 0) {
      percentage = Math.round(((currentMonth - previousMonth) / previousMonth) * 100);
      trend = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
    } else if (currentMonth > 0) {
      percentage = 100;
      trend = 'up';
    }

    return { chartData: months, comparison: { percentage, trend } };
  }, [payments]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  const totalReceived = chartData.reduce((sum, m) => sum + m.received, 0);
  const currentMonthReceived = chartData[chartData.length - 1]?.received || 0;

  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Ingresos Mensuales</h3>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-success">
            {formatTooltipValue(totalReceived)}
          </p>
          <div className="flex items-center gap-1 text-sm">
            {comparison.trend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-success">+{comparison.percentage}%</span>
              </>
            )}
            {comparison.trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{comparison.percentage}%</span>
              </>
            )}
            {comparison.trend === 'neutral' && (
              <>
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">0%</span>
              </>
            )}
            <span className="text-muted-foreground">vs mes anterior</span>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="monthLabel" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [
                formatTooltipValue(value),
                name === 'received' ? 'Recibido' : 'Pendiente'
              ]}
            />
            <Bar 
              dataKey="received" 
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={index === chartData.length - 1 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--primary) / 0.6)'
                  }
                />
              ))}
            </Bar>
            <Bar 
              dataKey="pending" 
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--warning) / 0.5)"
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Recibido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-warning/50" />
          <span className="text-muted-foreground">Pendiente</span>
        </div>
      </div>
    </Card>
  );
}
