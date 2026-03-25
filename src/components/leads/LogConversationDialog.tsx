import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, Brain, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { 
  useLogConversation, 
  SellerUrgencyLevel, 
  PriceFlexibility,
  urgencyLabels,
  flexibilityLabels,
  AdjustmentResult,
} from '@/hooks/useSellerConversations';

interface LogConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentPiwScore: number;
  propertyAddress?: string;
}

export function LogConversationDialog({
  open,
  onOpenChange,
  leadId,
  currentPiwScore,
  propertyAddress,
}: LogConversationDialogProps) {
  const [urgencyLevel, setUrgencyLevel] = useState<SellerUrgencyLevel>('moderate');
  const [mainPain, setMainPain] = useState('');
  const [keyObjection, setKeyObjection] = useState('');
  const [priceFlexibility, setPriceFlexibility] = useState<PriceFlexibility>('somewhat_flexible');
  const [sellerAskingPrice, setSellerAskingPrice] = useState('');
  const [ourOfferDiscussed, setOurOfferDiscussed] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<AdjustmentResult | null>(null);

  const { mutate: logConversation, isPending } = useLogConversation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mainPain.trim()) {
      return;
    }

    logConversation({
      leadId,
      urgencyLevel,
      mainPain,
      keyObjection: keyObjection || undefined,
      priceFlexibility,
      sellerAskingPrice: sellerAskingPrice ? parseFloat(sellerAskingPrice) : undefined,
      ourOfferDiscussed: ourOfferDiscussed ? parseFloat(ourOfferDiscussed) : undefined,
      notes: notes || undefined,
      currentPiwScore,
    }, {
      onSuccess: (data) => {
        setResult(data);
      },
    });
  };

  const handleClose = () => {
    setUrgencyLevel('moderate');
    setMainPain('');
    setKeyObjection('');
    setPriceFlexibility('somewhat_flexible');
    setSellerAskingPrice('');
    setOurOfferDiscussed('');
    setNotes('');
    setResult(null);
    onOpenChange(false);
  };

  const getScoreChangeIcon = (adjustment: number) => {
    if (adjustment > 0) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (adjustment < 0) return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'ALTA': return 'text-green-500 bg-green-500/10';
      case 'MEDIA': return 'text-amber-500 bg-amber-500/10';
      case 'BAJA': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Registrar Conversación con Seller
          </DialogTitle>
          <DialogDescription>
            {propertyAddress && <span className="font-medium">{propertyAddress}</span>}
            <br />
            K-Score actual: <span className="font-bold text-primary">{currentPiwScore}</span>
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-6 py-4">
            {/* Result Display */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Análisis IA Completado
                </h3>
                {getScoreChangeIcon(result.adjustment)}
              </div>

              {/* Score Change */}
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Anterior</p>
                  <p className="text-3xl font-bold text-muted-foreground">{result.previousScore}</p>
                </div>
                <div className="text-2xl">→</div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Nuevo</p>
                  <p className="text-3xl font-bold text-primary">{result.adjustedScore}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.adjustment >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {result.adjustment >= 0 ? '+' : ''}{result.adjustment}
                </div>
              </div>

              {/* Deal Probability */}
              <div className="flex items-center justify-center">
                <span className={`px-4 py-2 rounded-full font-semibold ${getProbabilityColor(result.dealProbability)}`}>
                  Probabilidad de Cierre: {result.dealProbability}
                </span>
              </div>

              {/* Reason */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Razón del Ajuste:</p>
                <p className="text-sm text-muted-foreground">{result.reason}</p>
              </div>

              {/* Recommended Action */}
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm font-medium mb-1 text-primary">Acción Recomendada:</p>
                <p className="text-sm">{result.recommendedAction}</p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Urgency Level */}
            <div className="space-y-2">
              <Label htmlFor="urgency">Nivel de Urgencia Real *</Label>
              <Select value={urgencyLevel} onValueChange={(v) => setUrgencyLevel(v as SellerUrgencyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(urgencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ¿Qué tan urgido está el vendedor de cerrar?
              </p>
            </div>

            {/* Main Pain */}
            <div className="space-y-2">
              <Label htmlFor="mainPain">Dolor Principal *</Label>
              <Textarea
                id="mainPain"
                value={mainPain}
                onChange={(e) => setMainPain(e.target.value)}
                placeholder="Ej: Divorcio, herencia, mudanza, problemas financieros, propiedad vacía..."
                required
              />
              <p className="text-xs text-muted-foreground">
                ¿Por qué quiere vender? ¿Cuál es su motivación real?
              </p>
            </div>

            {/* Key Objection */}
            <div className="space-y-2">
              <Label htmlFor="objection">Objeción Clave</Label>
              <Textarea
                id="objection"
                value={keyObjection}
                onChange={(e) => setKeyObjection(e.target.value)}
                placeholder="Ej: Precio muy bajo, necesita más tiempo, quiere listar con agente, no entiende el proceso..."
              />
              <p className="text-xs text-muted-foreground">
                ¿Cuál fue la principal objeción o preocupación expresada?
              </p>
            </div>

            {/* Price Flexibility */}
            <div className="space-y-2">
              <Label htmlFor="flexibility">Flexibilidad de Precio *</Label>
              <Select value={priceFlexibility} onValueChange={(v) => setPriceFlexibility(v as PriceFlexibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(flexibilityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ¿Qué tan flexible es en el precio?
              </p>
            </div>

            {/* Price Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="askingPrice">Precio que Pide ($)</Label>
                <Input
                  id="askingPrice"
                  type="number"
                  value={sellerAskingPrice}
                  onChange={(e) => setSellerAskingPrice(e.target.value)}
                  placeholder="150000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ourOffer">Nuestra Oferta Discutida ($)</Label>
                <Input
                  id="ourOffer"
                  type="number"
                  value={ourOfferDiscussed}
                  onChange={(e) => setOurOfferDiscussed(e.target.value)}
                  placeholder="120000"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cualquier información adicional relevante..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !mainPain.trim()} className="flex-1">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando con IA...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Analizar y Ajustar PIW
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
