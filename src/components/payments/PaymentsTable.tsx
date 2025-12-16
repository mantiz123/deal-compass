import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePayments, useMarkPaymentPaid, Payment, PaymentStatus } from '@/hooks/usePayments';
import { useRealtors } from '@/hooks/useRealtors';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  CheckCircle, 
  Clock, 
  XCircle,
  DollarSign,
  Building,
  Home,
  CalendarIcon,
  Filter,
  X,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary"; icon: typeof CheckCircle }> = {
  paid: { label: 'Pagado', variant: 'success', icon: CheckCircle },
  pending: { label: 'Pendiente', variant: 'warning', icon: Clock },
  cancelled: { label: 'Cancelado', variant: 'secondary', icon: XCircle },
};

const methodLabels: Record<string, string> = {
  check: 'Cheque',
  wire: 'Transferencia',
  zelle: 'Zelle',
  venmo: 'Venmo',
  cash: 'Efectivo',
  other: 'Otro',
};

export function PaymentsTable() {
  const { data: payments, isLoading } = usePayments();
  const { data: realtors } = useRealtors();
  const markPaid = useMarkPaymentPaid();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [realtorFilter, setRealtorFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const handleMarkPaid = (payment: Payment) => {
    const today = new Date().toISOString().split('T')[0];
    markPaid.mutate({ id: payment.id, payment_date: today });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setRealtorFilter('all');
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = statusFilter !== 'all' || realtorFilter !== 'all' || dateRange.from || dateRange.to;

  // Filter payments
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter((payment) => {
      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }
      
      // Realtor filter
      if (realtorFilter !== 'all' && payment.realtor_id !== realtorFilter) {
        return false;
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        const paymentDate = payment.payment_date 
          ? parseISO(payment.payment_date)
          : payment.created_at 
            ? parseISO(payment.created_at)
            : null;
        
        if (paymentDate) {
          if (dateRange.from && dateRange.to) {
            if (!isWithinInterval(paymentDate, { start: dateRange.from, end: dateRange.to })) {
              return false;
            }
          } else if (dateRange.from && paymentDate < dateRange.from) {
            return false;
          } else if (dateRange.to && paymentDate > dateRange.to) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [payments, statusFilter, realtorFilter, dateRange]);

  if (isLoading) {
    return (
      <Card variant="glass" className="p-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card variant="glass" className="p-8 text-center">
        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin pagos registrados</h3>
        <p className="text-muted-foreground">
          Registra tu primer pago para comenzar a trackear tus ingresos.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* Realtor Filter */}
          <Select value={realtorFilter} onValueChange={setRealtorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Realtor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Realtors</SelectItem>
              {realtors?.map((realtor) => (
                <SelectItem key={realtor.id} value={realtor.id}>
                  {realtor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM", { locale: es })} -{" "}
                      {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy", { locale: es })
                  )
                ) : (
                  <span>Rango de fechas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground">
          Mostrando {filteredPayments.length} de {payments.length} pagos
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Realtor</TableHead>
            <TableHead>Deal</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No hay pagos que coincidan con los filtros seleccionados
              </TableCell>
            </TableRow>
          ) : (
            filteredPayments.map((payment) => {
              const status = statusConfig[payment.status];
              const StatusIcon = status.icon;

              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    <span className={`font-bold text-lg ${payment.status === 'paid' ? 'text-success' : ''}`}>
                      {formatCurrency(Number(payment.amount))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{methodLabels[payment.payment_method]}</span>
                    {payment.reference_number && (
                      <span className="block text-xs text-muted-foreground">
                        #{payment.reference_number}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.realtor ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">{payment.realtor.name}</span>
                          {payment.realtor.company && (
                            <span className="block text-xs text-muted-foreground">
                              {payment.realtor.company}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.lead?.property ? (
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {payment.lead.property.address}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {payment.status === 'paid' && payment.payment_date ? (
                        <span className="text-success">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                      ) : payment.due_date ? (
                        <span className="text-warning">
                          Vence: {format(new Date(payment.due_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: es })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {payment.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleMarkPaid(payment)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-success" />
                            Marcar como Pagado
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          Ver Detalles
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
