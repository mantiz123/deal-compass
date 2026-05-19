import { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDealsPage, useDealStats, useCreateDealPackage, type Deal } from '@/hooks/useDeals';
import { useBuyers } from '@/hooks/useBuyers';
import { useLeads } from '@/hooks/useLeads';
import { DealDetailSheet } from '@/components/deals/DealDetailSheet';
import {
  Search, FileText, Send, Eye, MousePointerClick, CheckCircle2, XCircle,
  DollarSign, TrendingUp, Clock, CalendarIcon, MapPin, X, AlertCircle,
  Plus, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const tierColors: Record<string, string> = {
  platinum: 'bg-primary/20 text-primary border-primary/30',
  gold: 'bg-accent/20 text-accent border-accent/30',
  silver: 'bg-muted text-muted-foreground border-border',
  bronze: 'bg-warning/10 text-warning border-warning/30',
};

type StatusFilter = 'all' | 'sent' | 'opened' | 'clicked' | 'responded';
const PAGE_SIZE = 25;

const getStatus = (deal: Deal) => {
  if (deal.response === 'accepted') return { label: 'Aceptado', color: 'bg-success text-success-foreground', icon: CheckCircle2, key: 'responded' as const };
  if (deal.response === 'rejected') return { label: 'Rechazado', color: 'bg-destructive text-destructive-foreground', icon: XCircle, key: 'responded' as const };
  if (deal.clicked_at) return { label: 'Clickeado', color: 'bg-primary text-primary-foreground', icon: MousePointerClick, key: 'clicked' as const };
  if (deal.opened_at) return { label: 'Abierto', color: 'bg-info text-info-foreground', icon: Eye, key: 'opened' as const };
  return { label: 'Enviado', color: 'bg-muted text-muted-foreground', icon: Send, key: 'sent' as const };
};

function SendDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');

  const { data: leadsResult } = useLeads({ filters: { search: leadSearch }, from: 0, to: 14 });
  const { data: buyersResult } = useBuyers();
  const createDeal = useCreateDealPackage();

  const leads = leadsResult?.data ?? [];
  const buyers = buyersResult?.data ?? [];

  const handleSend = async () => {
    if (!selectedLeadId || !selectedBuyerId) return;
    await createDeal.mutateAsync({ leadId: selectedLeadId, buyerId: selectedBuyerId });
    setSelectedLeadId('');
    setSelectedBuyerId('');
    setLeadSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Deal Package
          </DialogTitle>
          <DialogDescription>
            Selecciona un lead y un comprador para crear el deal package.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Lead selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Lead / Propiedad</label>
            <Input
              placeholder="Buscar por dirección..."
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              className="mb-2"
            />
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.property?.address ?? l.id} — {l.property?.city}
                  </SelectItem>
                ))}
                {leads.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Buyer selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Comprador</label>
            <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un comprador" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.company_name || b.contact_name}
                    {b.tier && <span className="text-muted-foreground ml-1">({b.tier})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={!selectedLeadId || !selectedBuyerId || createDeal.isPending}
          >
            {createDeal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar Deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Deals = () => {
  const [page, setPage] = useState(0);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showSendDeal, setShowSendDeal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [buyerFilter, setBuyerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data: dealsResult, isLoading } = useDealsPage({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm,
    statusFilter,
    buyerFilter,
    dateFrom,
    dateTo,
  });
  const { data: stats, isLoading: statsLoading } = useDealStats();
  const { data: buyersResult } = useBuyers();
  const buyers = buyersResult?.data;

  const deals = dealsResult?.data ?? [];
  const totalCount = dealsResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resetPage = useCallback(() => setPage(0), []);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBuyerFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    resetPage();
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || buyerFilter !== 'all' || dateFrom || dateTo;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Deal Packages</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestiona todos los deal packages enviados a compradores
          </p>
        </div>
        <Button onClick={() => setShowSendDeal(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Enviar Deal Package
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Enviados', value: stats?.total, icon: Send, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Tasa Apertura', value: `${stats?.openRate ?? 0}%`, icon: Eye, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Aceptados', value: stats?.accepted, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Pendientes', value: stats?.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Revenue Potencial', value: `$${(stats?.potentialRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-accent', bg: 'bg-accent/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {statsLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>}
                </div>
                <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
                onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); resetPage(); }}>
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

            <Select value={buyerFilter} onValueChange={(v) => { setBuyerFilter(v); resetPage(); }}>
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
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); resetPage(); }} initialFocus className="pointer-events-auto" />
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
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); resetPage(); }} initialFocus className="pointer-events-auto" />
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
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && deals.length === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No hay resultados' : 'No hay deals todavía'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros para ver más resultados.'
                : 'Crea tu primer deal package usando el botón "Enviar Deal Package".'}
            </p>
            {hasActiveFilters
              ? <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
              : <Button onClick={() => setShowSendDeal(true)}><Plus className="h-4 w-4 mr-2" />Enviar Deal Package</Button>
            }
          </CardContent>
        </Card>
      )}

      {/* Deals Table */}
      {!isLoading && deals.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Deal Packages
              <Badge variant="secondary">{totalCount} total</Badge>
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
                  {deals.map((deal, index) => {
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <DealDetailSheet
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      />

      <SendDealDialog open={showSendDeal} onOpenChange={setShowSendDeal} />
    </Layout>
  );
};

export default Deals;
