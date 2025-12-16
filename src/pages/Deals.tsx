import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeals, useDealStats, Deal } from '@/hooks/useDeals';
import { useBuyers } from '@/hooks/useBuyers';
import { DealDetailSheet } from '@/components/deals/DealDetailSheet';
import {
  Search,
  Filter,
  FileText,
  Send,
  Eye,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  DollarSign,
  TrendingUp,
  Clock,
  CalendarIcon,
  MapPin,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const tierColors: Record<string, string> = {
  platinum: 'bg-primary/20 text-primary border-primary/30',
  gold: 'bg-accent/20 text-accent border-accent/30',
  silver: 'bg-muted text-muted-foreground border-border',
  bronze: 'bg-warning/10 text-warning border-warning/30',
};

type StatusFilter = 'all' | 'sent' | 'opened' | 'clicked' | 'responded';

const Deals = () => {
  const { data: deals, isLoading } = useDeals();
  const { data: stats, isLoading: statsLoading } = useDealStats();
  const { data: buyers } = useBuyers();
  
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [buyerFilter, setBuyerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const getStatus = (deal: Deal) => {
    if (deal.response === 'accepted') return { label: 'Aceptado', color: 'bg-success text-success-foreground', icon: CheckCircle2, key: 'responded' as const };
    if (deal.response === 'rejected') return { label: 'Rechazado', color: 'bg-destructive text-destructive-foreground', icon: XCircle, key: 'responded' as const };
    if (deal.clicked_at) return { label: 'Clickeado', color: 'bg-primary text-primary-foreground', icon: MousePointerClick, key: 'clicked' as const };
    if (deal.opened_at) return { label: 'Abierto', color: 'bg-info text-info-foreground', icon: Eye, key: 'opened' as const };
    return { label: 'Enviado', color: 'bg-muted text-muted-foreground', icon: Send, key: 'sent' as const };
  };

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    
    return deals.filter((deal) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesAddress = deal.lead.property?.address.toLowerCase().includes(search);
        const matchesBuyer = deal.buyer.contact_name.toLowerCase().includes(search) ||
          deal.buyer.company_name?.toLowerCase().includes(search);
        if (!matchesAddress && !matchesBuyer) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        const status = getStatus(deal);
        if (status.key !== statusFilter) return false;
      }
      
      // Buyer filter
      if (buyerFilter !== 'all' && deal.buyer_id !== buyerFilter) return false;
      
      // Date filters
      const sentDate = new Date(deal.sent_at);
      if (dateFrom && isBefore(sentDate, startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(sentDate, endOfDay(dateTo))) return false;
      
      return true;
    });
  }, [deals, searchTerm, statusFilter, buyerFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBuyerFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || buyerFilter !== 'all' || dateFrom || dateTo;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold">Deal Packages</h1>
        <p className="text-muted-foreground">
          Gestiona todos los deal packages enviados a compradores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Enviados</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasa Apertura</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-info">{stats?.openRate || 0}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aceptados</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-success">{stats?.accepted || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-warning">{stats?.pending || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenue Potencial</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-accent">
                    ${(stats?.potentialRevenue || 0).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por propiedad o comprador..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="opened">Abierto</SelectItem>
                <SelectItem value="clicked">Clickeado</SelectItem>
                <SelectItem value="responded">Respondido</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={buyerFilter} onValueChange={setBuyerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Comprador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los compradores</SelectItem>
                {buyers?.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>
                    {buyer.company_name || buyer.contact_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('w-[130px] justify-start', !dateFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('w-[130px] justify-start', !dateTo && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd/MM/yy') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredDeals.length === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No hay resultados' : 'No hay deals todavía'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros para ver más resultados.'
                : 'Envía tu primer deal package desde la página de Leads o Buyers.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deals Table */}
      {!isLoading && filteredDeals.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Deal Packages
              {hasActiveFilters && (
                <Badge variant="secondary">{filteredDeals.length} resultados</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Propiedad</th>
                    <th className="p-4 font-medium">Comprador</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Assignment Fee</th>
                    <th className="p-4 font-medium">Enviado</th>
                    <th className="p-4 font-medium">Actividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDeals.map((deal, index) => {
                    const status = getStatus(deal);
                    const StatusIcon = status.icon;
                    
                    return (
                      <tr
                        key={deal.id}
                        className="group hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                        onClick={() => setSelectedDeal(deal)}
                      >
                        <td className="p-4">
                          {deal.lead.property ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-medium">{deal.lead.property.address}</p>
                                <p className="text-sm text-muted-foreground">
                                  {deal.lead.property.city}, {deal.lead.property.state}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin propiedad</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {deal.buyer.company_name || deal.buyer.contact_name}
                            </span>
                            <Badge variant="outline" className={cn('text-[10px]', tierColors[deal.buyer.tier])}>
                              {deal.buyer.tier}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {deal.lead.assignment_fee ? (
                            <span className="font-semibold text-success">
                              ${deal.lead.assignment_fee.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(deal.sent_at), 'dd/MM/yyyy')}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {deal.opened_at && (
                              <span className="flex items-center gap-1 text-info">
                                <Eye className="h-3 w-3" />
                                {formatDistanceToNow(new Date(deal.opened_at), { addSuffix: true, locale: es })}
                              </span>
                            )}
                            {deal.clicked_at && (
                              <span className="flex items-center gap-1 text-primary">
                                <MousePointerClick className="h-3 w-3" />
                                Click
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deal Detail Sheet */}
      <DealDetailSheet
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      />
    </Layout>
  );
};

export default Deals;
