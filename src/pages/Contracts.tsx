import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContracts, type Contract } from '@/hooks/useContracts';
import { ContractDetailSheet } from '@/components/contracts/ContractDetailSheet';
import { Search, Download, Eye, CheckCircle2, FileText, AlertCircle, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', color: 'bg-blue-500/20 text-blue-400' },
  viewed: { label: 'Visto', color: 'bg-yellow-500/20 text-yellow-400' },
  signed: { label: 'Firmado', color: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completado', color: 'bg-primary/20 text-primary' },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  AB: { label: 'AB', color: 'bg-blue-500/20 text-blue-400' },
  BC: { label: 'BC', color: 'bg-purple-500/20 text-purple-400' },
  DC: { label: 'DC', color: 'bg-teal-500/20 text-teal-400' },
  AMENDMENT: { label: 'AMD', color: 'bg-orange-500/20 text-orange-400' },
};

export default function Contracts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('AB');
  const [onlyPendingKlose, setOnlyPendingKlose] = useState(false);

  const { data: allContracts = [], isLoading } = useContracts({
    status: statusFilter,
    contract_type: 'all',
    search,
  });

  const { data: kloseSignatures = {} } = useQuery({
    queryKey: ['klose-signatures-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('contract_id, signer_name, signed_at')
        .like('user_agent', 'Klose Rep%');
      if (error) throw error;
      const map: Record<string, { name: string; signedAt: string }> = {};
      data?.forEach((s: any) => { map[s.contract_id] = { name: s.signer_name, signedAt: s.signed_at }; });
      return map;
    },
  });

  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Apply "pending Klose signature" filter
  const contracts = useMemo(() => {
    if (!onlyPendingKlose) return allContracts;
    return allContracts.filter(c => !kloseSignatures[c.id] && c.status !== 'draft');
  }, [allContracts, onlyPendingKlose, kloseSignatures]);

  // Split contracts by type
  const abContracts = useMemo(() => contracts.filter(c => c.contract_type === 'AB'), [contracts]);
  const bcContracts = useMemo(() => contracts.filter(c => c.contract_type === 'BC'), [contracts]);
  const dcContracts = useMemo(() => contracts.filter(c => c.contract_type === 'DC'), [contracts]);
  const amdContracts = useMemo(() => contracts.filter(c => c.contract_type === 'AMENDMENT'), [contracts]);

  // Critical date alerts: BC contracts closing within 7 days, AB contracts approaching closing
  const criticalAlerts = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const alerts: { contractId: string; address: string; label: string; daysLeft: number }[] = [];

    allContracts.forEach(c => {
      const cd = (c as any).contract_data || {};
      const property = (c.lead as any)?.property;
      const address = property?.address || 'Propiedad sin dirección';

      if ((c.contract_type === 'BC' || c.contract_type === 'DC') && cd.closing_date) {
        const closingMs = new Date(cd.closing_date).getTime();
        const daysLeft = Math.ceil((closingMs - now) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 7 && c.status !== 'completed') {
          alerts.push({ contractId: c.id, address, label: c.contract_type === 'DC' ? 'Cierre DC' : 'Cierre BC', daysLeft });
        }
      }
      if (c.contract_type === 'AB' && c.sent_at && cd.closing_days) {
        const closingMs = new Date(c.sent_at).getTime() + Number(cd.closing_days) * 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil((closingMs - now) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 7 && c.status !== 'completed' && c.status !== 'signed') {
          alerts.push({ contractId: c.id, address, label: 'Cierre AB', daysLeft });
        }
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [allContracts]);

  // KPIs calculated on ALL contracts (not filtered) for true overview
  const kpis = useMemo(() => {
    const total = allContracts.length;
    const signed = allContracts.filter(c => c.status === 'signed' || c.status === 'completed').length;
    const pendingKloseSign = allContracts.filter(c => !kloseSignatures[c.id] && c.status !== 'draft').length;
    const inFlight = allContracts.filter(c => c.status === 'sent' || c.status === 'viewed').length;
    // Estimated commission at risk: sum option_fee from contract_data of in-flight contracts
    const commissionInFlight = allContracts
      .filter(c => c.status === 'sent' || c.status === 'viewed' || c.status === 'signed')
      .reduce((sum, c) => {
        const cd = (c as any).contract_data || {};
        const fee = parseFloat(cd.option_fee || cd.assignment_fee || '0');
        return sum + (isNaN(fee) ? 0 : fee);
      }, 0);
    return { total, signed, pendingKloseSign, inFlight, commissionInFlight };
  }, [allContracts, kloseSignatures]);

  const handleOpenPdf = (url: string | null) => {
    if (!url) return;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      toast({ title: 'Error', description: 'No se pudo abrir el PDF. Revisa si tu navegador bloqueó la ventana.', variant: 'destructive' });
    }
  };

  const handleDownload = async (url: string | null, contractId: string) => {
    if (!url) return;
    setDownloadingId(contractId);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'Contrato.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      try {
        const path = url.split('/storage/v1/object/public/contracts/')[1];
        if (path) {
          const { data, error } = await supabase.storage.from('contracts').download(path);
          if (error) throw error;
          const blobUrl = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = 'Contrato.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } else {
          throw new Error('bad path');
        }
      } catch {
        toast({ title: 'Error', description: 'No se pudo descargar. Desactiva tu bloqueador de anuncios.', variant: 'destructive' });
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const renderTable = (list: Contract[], recipientLabel: string) => (
    <Card variant="glass">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad</TableHead>
              <TableHead>{recipientLabel}</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Klose</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Firmado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Cargando contratos...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay contratos de este tipo. Genera uno desde el detalle de un lead.
                </TableCell>
              </TableRow>
            ) : (
              list.map((contract) => {
                const lead = contract.lead as any;
                const property = lead?.property;
                const st = statusConfig[contract.status] || statusConfig.draft;
                const tp = typeConfig[contract.contract_type] || typeConfig.AB;
                const preferredPdfUrl = contract.signed_pdf_url || contract.pdf_url;
                const cData = (contract as any).contract_data as Record<string, string> | null;
                const recipientName = contract.contract_type === 'BC'
                  ? (cData?.assignee_name || 'N/A')
                  : contract.contract_type === 'DC'
                    ? (cData?.buyer_name || 'N/A')
                    : (property?.owner_name || 'N/A');

                return (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer"
                    onClick={() => { setSelectedContract(contract); setDetailOpen(true); }}
                  >
                    <TableCell className="font-medium">
                      {property?.address || 'N/A'}
                      <div className="text-xs text-muted-foreground">
                        {property?.city}, {property?.state}
                      </div>
                    </TableCell>
                    <TableCell>{recipientName}</TableCell>
                    <TableCell>
                      <Badge className={tp.color}>{tp.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {kloseSignatures[contract.id] ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="success" className="gap-1 cursor-help">
                                <CheckCircle2 className="h-3 w-3" />
                                {kloseSignatures[contract.id].name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Firmado el {format(new Date(kloseSignatures[contract.id].signedAt), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={st.color}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(contract.created_at), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contract.signed_at ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-muted-foreground">
                                {format(new Date(contract.signed_at), 'dd MMM yyyy', { locale: es })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{contract.contract_type === 'BC' ? 'Buyer' : 'Seller'} firmó el {format(new Date(contract.signed_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {preferredPdfUrl && (
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPdf(preferredPdfUrl)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {preferredPdfUrl && (
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(preferredPdfUrl, contract.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground">Gestión de contratos y firmas electrónicas</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{kpis.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Contratos en sistema</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Firmados</span>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-success mt-1">{kpis.signed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cerrados completos</p>
            </CardContent>
          </Card>
          <Card variant="glass" className={kpis.pendingKloseSign > 0 ? 'ring-1 ring-warning/50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes Klose</span>
                <AlertCircle className={`h-4 w-4 ${kpis.pendingKloseSign > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${kpis.pendingKloseSign > 0 ? 'text-warning' : 'text-foreground'}`}>{kpis.pendingKloseSign}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Requieren tu firma</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">$ En juego</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary mt-1">
                ${kpis.commissionInFlight.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpis.inFlight} contrato(s) activo(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Critical Date Alerts ── */}
        {criticalAlerts.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/8 p-3 space-y-1.5">
            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {criticalAlerts.length} contrato{criticalAlerts.length > 1 ? 's' : ''} con fecha crítica en los próximos 7 días
            </p>
            <div className="flex flex-wrap gap-2">
              {criticalAlerts.map(alert => (
                <button
                  key={alert.contractId}
                  className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs hover:bg-destructive/20 transition-colors cursor-pointer"
                  onClick={() => {
                    const contract = allContracts.find(c => c.id === alert.contractId);
                    if (contract) { setSelectedContract(contract); setDetailOpen(true); }
                  }}
                >
                  <Clock className="h-3 w-3 text-destructive" />
                  <span className="font-medium">{alert.label}</span>
                  <span className="text-muted-foreground truncate max-w-[120px]">{alert.address}</span>
                  <Badge variant="destructive" className="text-[9px] px-1 py-0">
                    {alert.daysLeft === 0 ? 'HOY' : `${alert.daysLeft}d`}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <Card variant="glass">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por dirección o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="viewed">Visto</SelectItem>
                  <SelectItem value="signed">Firmado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background/50">
                <Switch
                  id="pending-klose"
                  checked={onlyPendingKlose}
                  onCheckedChange={setOnlyPendingKlose}
                />
                <Label htmlFor="pending-klose" className="text-xs cursor-pointer whitespace-nowrap">
                  Solo pendientes mi firma
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: AB / BC / DC / Amendments */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="AB" className="gap-1.5">
              AB — Seller
              {abContracts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{abContracts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="BC" className="gap-1.5">
              BC — Buyer
              {bcContracts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{bcContracts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="DC" className="gap-1.5">
              DC — Doble
              {dcContracts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{dcContracts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="AMENDMENT" className="gap-1.5">
              Amends
              {amdContracts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{amdContracts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="AB" className="mt-4">
            {renderTable(abContracts, 'Vendedor')}
          </TabsContent>

          <TabsContent value="BC" className="mt-4">
            {renderTable(bcContracts, 'Buyer/Assignee')}
          </TabsContent>

          <TabsContent value="DC" className="mt-4">
            {renderTable(dcContracts, 'End Buyer')}
          </TabsContent>

          <TabsContent value="AMENDMENT" className="mt-4">
            {renderTable(amdContracts, 'Vendedor')}
          </TabsContent>
        </Tabs>
      </div>

      <ContractDetailSheet
        contract={selectedContract}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </Layout>
  );
}
