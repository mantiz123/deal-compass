import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CheckCircle, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIGNATURE_FONTS = [
  { name: 'Cursive Elegant', family: "'Dancing Script', cursive", weight: '700' },
  { name: 'Classic Script', family: "'Great Vibes', cursive", weight: '400' },
  { name: 'Signature Style', family: "'Pacifico', cursive", weight: '400' },
  { name: 'Formal Hand', family: "'Satisfy', cursive", weight: '400' },
];

// Load Google Fonts dynamically
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';

interface TypedSignatureProps {
  signerName: string;
  onSign: (signatureDataUrl: string) => void;
  label: string;
  existingSignature?: string;
  onClear?: () => void;
}

export default function TypedSignature({ signerName, onSign, label, existingSignature, onClear }: TypedSignatureProps) {
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(0);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load fonts
  useEffect(() => {
    const existing = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      link.onload = () => setTimeout(() => setFontsLoaded(true), 500);
      document.head.appendChild(link);
    } else {
      setFontsLoaded(true);
    }
  }, []);

  const generateSignatureImage = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !typedName.trim()) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = 2;
    canvas.width = 500 * dpr;
    canvas.height = 120 * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 500, 120);

    const font = SIGNATURE_FONTS[selectedFont];
    ctx.fillStyle = '#000000';
    ctx.font = `${font.weight} 48px ${font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(typedName, 250, 60, 480);

    return canvas.toDataURL('image/png');
  };

  const handleConfirm = () => {
    const dataUrl = generateSignatureImage();
    if (dataUrl) onSign(dataUrl);
  };

  if (existingSignature) {
    return (
      <Card className="border-2 border-green-500/50 bg-green-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600">✅ Firmado — {label}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-lg p-2 inline-block">
            <img src={existingSignature} alt="Firma" className="h-16" />
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Re-firmar
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-yellow-500/50 bg-yellow-500/5 animate-pulse p-4">
      <div className="flex items-center gap-2 mb-3">
        <PenTool className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-700">✍️ Firme Aquí — {label}</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Escriba su nombre completo:</label>
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Nombre completo"
            className="bg-white"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Seleccione un estilo de firma:</label>
          <div className="grid grid-cols-2 gap-2">
            {SIGNATURE_FONTS.map((font, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedFont(idx)}
                className={cn(
                  "p-3 rounded-lg border-2 bg-white text-left transition-all hover:border-primary/50",
                  selectedFont === idx
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                )}
              >
                <span className="text-[10px] text-muted-foreground block mb-1">{font.name}</span>
                <span
                  style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: '22px' }}
                  className="block truncate text-foreground"
                >
                  {typedName || signerName || 'Su Firma'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg bg-white p-4 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Vista previa de la firma</p>
          <div
            style={{
              fontFamily: SIGNATURE_FONTS[selectedFont].family,
              fontWeight: SIGNATURE_FONTS[selectedFont].weight,
              fontSize: '36px',
            }}
            className="text-foreground"
          >
            {typedName || signerName || 'Su Firma'}
          </div>
          <div className="border-b-2 border-dashed border-muted-foreground/30 mt-1 mx-auto w-3/4" />
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <Button
          onClick={handleConfirm}
          disabled={!typedName.trim() || !fontsLoaded}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          <PenTool className="h-4 w-4 mr-2" />
          Confirmar Firma
        </Button>
      </div>
    </Card>
  );
}
