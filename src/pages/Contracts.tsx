import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useContracts, type Contract } from '@/hooks/useContracts';
import { ContractDetailSheet } from '@/components/contracts/ContractDetailSheet';
import { Search, Download, Eye, Loader2, CheckCircle2 } from 'lucide-react';
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
  AMENDMENT: { label: 'AMD', color: 'bg-orange-500/20 text-orange-400' },
};

export default function Contracts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: contracts = [], isLoading } = useContracts({
    status: statusFilter,
    contract_type: typeFilter,
    search,
  });

  const { data: kloseSignatures = {} } = useQuery({
    queryKey: ['klose-signatures-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('contract_id, signer_name')
        .like('user_agent', 'Klose Rep%');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.contract_id] = s.signer_name; });
      return map;
    },
  });

  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground">Gestión de contratos y firmas electrónicas</p>
          </div>
        </div>

        {/* Filters */}
        <Card variant="glass">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por dirección o vendedor..."
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="AB">AB Contract</SelectItem>
                  <SelectItem value="BC">BC Contract</SelectItem>
                  <SelectItem value="AMENDMENT">Amendment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card variant="glass">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Vendedor</TableHead>
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Cargando contratos...
                    </TableCell>
                  </TableRow>
                ) : contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay contratos. Genera uno desde el detalle de un lead.
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((contract) => {
                    const lead = contract.lead as any;
                    const property = lead?.property;
                    const st = statusConfig[contract.status] || statusConfig.draft;
                    const tp = typeConfig[contract.contract_type] || typeConfig.AB;
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
                        <TableCell>{property?.owner_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={tp.color}>{tp.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={st.color}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(contract.created_at), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contract.signed_at
                            ? format(new Date(contract.signed_at), 'dd MMM yyyy', { locale: es })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {contract.pdf_url && (
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(contract.pdf_url, contract.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {contract.signed_pdf_url && (
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(contract.signed_pdf_url, contract.id)}>
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
      </div>

      <ContractDetailSheet
        contract={selectedContract}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </Layout>
  );
}
