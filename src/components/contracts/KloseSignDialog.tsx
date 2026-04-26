import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, PenTool, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  getABKloseSignablePages,
  getBCKloseSignablePages,
  getAmendmentKloseSignablePages,
} from './ContractPageViewer';
import type { Contract } from '@/hooks/useContracts';

const KLOSE_REPS = [
  { name: 'Sergio Mantilla', title: 'Managing Director' },
  { name: 'Luz Paula Rojas', title: 'Authorized Signatory' },
];

const SIGNATURE_FONTS = [
  { name: 'Cursive Elegant', family: "'Dancing Script', cursive", weight: '700' },
  { name: 'Classic Script', family: "'Great Vibes', cursive", weight: '400' },
  { name: 'Signature Style', family: "'Pacifico', cursive", weight: '400' },
  { name: 'Formal Hand', family: "'Satisfy', cursive", weight: '400' },
];

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';

interface KloseSignDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KloseSignDialog({ contract, open, onOpenChange }: KloseSignDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [repIdx, setRepIdx] = useState(0);
  const [customName, setCustomName] = useState('');
  const [fontIdx, setFontIdx] = useState(0);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRepIdx(0);
    setCustomName('');
    setFontIdx(0);
    const existing = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      link.onload = () => setTimeout(() => setFontsLoaded(true), 400);
      document.head.appendChild(link);
    } else {
      setFontsLoaded(true);
    }
  }, [open]);

  if (!contract) return null;

  const signerName = customName.trim() || KLOSE_REPS[repIdx].name;
  const font = SIGNATURE_FONTS[fontIdx];

  const generateSignaturePng = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const dpr = 2;
    canvas.width = 500 * dpr;
    canvas.height = 120 * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 500, 120);
    ctx.fillStyle = '#000000';
    ctx.font = `${font.weight} 48px ${font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(signerName, 250, 60, 480);
    return canvas.toDataURL('image/png');
  };

  const getKlosePages = () => {
    if (contract.contract_type === 'AB') return getABKloseSignablePages();
    if (contract.contract_type === 'BC') return getBCKloseSignablePages();
    return getAmendmentKloseSignablePages();
  };

  const handleSign = async () => {
    setSubmitting(true);
    try {
      const signatureImage = generateSignaturePng();
      if (!signatureImage) throw new Error('No se pudo generar la firma');

      const pages = getKlosePages();
      let ip = '';
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        ip = (await r.json()).ip;
      } catch {}

      const inserts = pages.map((p) => ({
        contract_id: contract.id,
        signer_name: signerName,
        signature_image: signatureImage,
        ip_address: ip,
        user_agent: `Klose Rep | Page ${p.pageNum}`,
      }));

      const { error: sigError } = await supabase.from('contract_signatures').insert(inserts);
      if (sigError) throw sigError;

      // Regenerate signed PDF if seller already signed (status >= signed)
      if (contract.status === 'signed' || contract.status === 'completed') {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          await fetch(`${supabaseUrl}/functions/v1/generate-signed-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: anonKey },
            body: JSON.stringify({ contractId: contract.id }),
          });
        } catch (e) {
          console.error('Re-stamp PDF failed:', e);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['contract-signatures', contract.id] });
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });

      toast({
        title: '✓ Firmado como Klose',
        description: `${signerName} firmó ${pages.length} página(s) del contrato.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error al firmar',
        description: err.message || 'No se pudo registrar la firma.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = getKlosePages().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Firmar como Klose LLC
          </DialogTitle>
          <DialogDescription>
            Aplica la firma del representante de Klose a las {totalPages} página(s) requeridas del contrato {contract.contract_type}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Representative selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Representante</Label>
            <div className="grid grid-cols-2 gap-2">
              {KLOSE_REPS.map((rep, idx) => (
                <button
                  key={rep.name}
                  type="button"
                  onClick={() => {
                    setRepIdx(idx);
                    setCustomName('');
                  }}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all hover:border-primary/50',
                    repIdx === idx && !customName
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{rep.name}</p>
                  <p className="text-xs text-muted-foreground">{rep.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom override */}
          <div>
            <Label htmlFor="custom-name" className="text-xs text-muted-foreground mb-1 block">
              O escriba otro nombre (opcional)
            </Label>
            <Input
              id="custom-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nombre del firmante"
            />
          </div>

          {/* Font selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Estilo de firma</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIGNATURE_FONTS.map((f, idx) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setFontIdx(idx)}
                  className={cn(
                    'p-3 rounded-lg border-2 bg-white text-left transition-all hover:border-primary/50',
                    fontIdx === idx ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  )}
                >
                  <span className="text-[10px] text-muted-foreground block mb-1">{f.name}</span>
                  <span
                    style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: '22px', color: '#1a1a1a' }}
                    className="block truncate"
                  >
                    {signerName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <Card className="bg-white p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Vista previa</p>
            <div
              style={{
                fontFamily: font.family,
                fontWeight: font.weight,
                fontSize: '40px',
                color: '#1a1a1a',
              }}
            >
              {signerName}
            </div>
            <div className="border-b-2 border-dashed border-muted-foreground/30 mt-1 mx-auto w-3/4" />
            <p className="text-xs text-muted-foreground mt-2">Klose LLC — {KLOSE_REPS[repIdx].title}</p>
          </Card>

          <canvas ref={canvasRef} className="hidden" />

          <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
            Esta firma se aplicará a {totalPages} página(s) del contrato. Si el seller ya firmó, el PDF firmado se regenerará automáticamente con ambas firmas.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSign} disabled={submitting || !fontsLoaded || !signerName}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Firmando…
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-2" /> Firmar {totalPages} página(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
