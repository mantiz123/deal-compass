import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useContractSignatures, useUpdateContract, type Contract } from '@/hooks/useContracts';
import { Download, Eye, Send, FileText, Clock, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContractDetailSheetProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDetailSheet({ contract, open, onOpenChange }: ContractDetailSheetProps) {
  const { data: signatures = [] } = useContractSignatures(contract?.id);
  const { toast } = useToast();

  if (!contract) return null;

  const lead = contract.lead as any;
  const property = lead?.property;
  const signingUrl = `${window.location.origin}/sign/${contract.signing_token}`;

  const handleResend = async () => {
    try {
      await supabase.functions.invoke('send-contract-email', {
        body: { contractId: contract.id },
      });
      toast({ title: 'Reenviado', description: 'El enlace de firma ha sido reenviado.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo reenviar el email.', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signingUrl);
    toast({ title: 'Copiado', description: 'Enlace de firma copiado al portapapeles.' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalle del Contrato
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Property & Status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {property?.address || 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">{property?.city}, {property?.state}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={contract.contract_type === 'AB' ? 'bg-blue-500/20 text-blue-400' : contract.contract_type === 'BC' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}>
                {contract.contract_type}
              </Badge>
              <Badge className={
                contract.status === 'signed' ? 'bg-green-500/20 text-green-400' :
                contract.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                contract.status === 'viewed' ? 'bg-yellow-500/20 text-yellow-400' :
                contract.status === 'completed' ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }>
                {contract.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Audit Trail */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Línea de Tiempo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Creado
                </span>
                <span>{format(new Date(contract.created_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
              </div>
              {contract.sent_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" /> Enviado
                  </span>
                  <span>{format(new Date(contract.sent_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
              {contract.viewed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Visto
                  </span>
                  <span>{format(new Date(contract.viewed_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
              {contract.signed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Firmado
                  </span>
                  <span>{format(new Date(contract.signed_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
              {contract.ip_address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP</span>
                  <span className="font-mono text-xs">{contract.ip_address}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contract Data */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Datos del Contrato</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(contract.contract_data || {}).map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted-foreground text-xs">{key.replace(/_/g, ' ')}</span>
                  <p className="text-foreground">{String(value) || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          {signatures.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Firmas</h3>
                {signatures.map((sig) => (
                  <Card key={sig.id} className="p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{sig.signer_name}</p>
                        <p className="text-xs text-muted-foreground">{sig.signer_email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(sig.signed_at), 'dd MMM yyyy HH:mm')}
                      </span>
                    </div>
                    {sig.signature_image && (
                      <img src={sig.signature_image} alt="Firma" className="mt-2 h-16 bg-white rounded p-1" />
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {contract.pdf_url && (
              <Button variant="outline" onClick={() => window.open(contract.pdf_url!, '_blank')}>
                <Eye className="h-4 w-4 mr-2" /> Ver PDF Original
              </Button>
            )}
            {contract.signed_pdf_url && (
              <Button variant="outline" onClick={() => window.open(contract.signed_pdf_url!, '_blank')}>
                <Download className="h-4 w-4 mr-2" /> Descargar PDF Firmado
              </Button>
            )}
            {contract.status !== 'signed' && contract.status !== 'completed' && (
              <>
                <Button variant="outline" onClick={handleCopyLink}>
                  📋 Copiar Enlace de Firma
                </Button>
                {contract.seller_email && (
                  <Button onClick={handleResend}>
                    <Send className="h-4 w-4 mr-2" /> Reenviar Email
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
