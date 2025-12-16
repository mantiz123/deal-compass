import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2, Download, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface DealPackageGeneratorProps {
  leadId: string;
  propertyAddress: string;
  currentAssignmentFee?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealPackageGenerator({
  leadId,
  propertyAddress,
  currentAssignmentFee,
  open,
  onOpenChange,
}: DealPackageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [assignmentFee, setAssignmentFee] = useState(currentAssignmentFee?.toString() || '');
  const [terms, setTerms] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-deal-package`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            assignment_fee: assignmentFee ? parseFloat(assignmentFee) : undefined,
            terms: terms || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el Deal Package');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deal-package-${propertyAddress.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Deal Package generado y descargado exitosamente');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating deal package:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar el Deal Package');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generar Deal Package
          </DialogTitle>
          <DialogDescription id="deal-package-description">
            Genera un PDF profesional con todos los datos del deal para enviar a compradores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Propiedad</Label>
            <p className="text-sm text-muted-foreground">{propertyAddress}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignmentFee" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Assignment Fee (opcional)
            </Label>
            <Input
              id="assignmentFee"
              type="number"
              placeholder="ej: 10000"
              value={assignmentFee}
              onChange={(e) => setAssignmentFee(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si se deja vacío, se mostrará "Negotiable" en el PDF
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Términos de Cesión (opcional)</Label>
            <Textarea
              id="terms"
              placeholder="Términos específicos de la cesión, condiciones especiales, etc."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Si se deja vacío, se usarán términos estándar
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
