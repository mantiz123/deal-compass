import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, PenTool, Edit3, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIGNATURE_FONTS = [
  { name: 'Cursive Elegant', family: "'Dancing Script', cursive", weight: '700' },
  { name: 'Classic Script', family: "'Great Vibes', cursive", weight: '400' },
  { name: 'Signature Style', family: "'Pacifico', cursive", weight: '400' },
  { name: 'Formal Hand', family: "'Satisfy', cursive", weight: '400' },
];

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';

interface TypedSignatureProps {
  signerName: string;
  onSign: (signatureDataUrl: string) => void;
  label: string;
  existingSignature?: string;
  onClear?: () => void;
}

export default function TypedSignature({ signerName, onSign, label, existingSignature, onClear }: TypedSignatureProps) {
  // Type mode
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(0);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw mode
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [activeTab, setActiveTab] = useState<'type' | 'draw'>('type');

  // Load Google Fonts for type mode
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

  // Initialize draw canvas white background whenever tab switches to draw
  useEffect(() => {
    if (activeTab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, [activeTab]);

  // ── Type mode helpers ─────────────────────────────────────────────

  const generateTypedImage = (): string | null => {
    const canvas = typeCanvasRef.current;
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

  const handleConfirmType = () => {
    const dataUrl = generateTypedImage();
    if (dataUrl) onSign(dataUrl);
  };

  // ── Draw mode helpers ─────────────────────────────────────────────

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = (e as React.TouchEvent).touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      setHasDrawn(true);
    }
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSign(canvas.toDataURL('image/png'));
  };

  // ── Existing signature display ────────────────────────────────────

  if (existingSignature) {
    return (
      <Card className="border-2 border-green-500/50 bg-green-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600">Signed — {label}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-lg p-2 inline-block">
            <img src={existingSignature} alt="Signature" className="h-16" />
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>Re-sign</Button>
          )}
        </div>
      </Card>
    );
  }

  // ── Signing UI ────────────────────────────────────────────────────

  return (
    <Card className="border-2 border-yellow-500/50 bg-yellow-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <PenTool className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-700">Sign Here — {label}</span>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'type' | 'draw')}>
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="type" className="text-xs gap-1.5">
            <Edit3 className="h-3 w-3" /> Type Signature
          </TabsTrigger>
          <TabsTrigger value="draw" className="text-xs gap-1.5">
            <PenTool className="h-3 w-3" /> Draw Signature
          </TabsTrigger>
        </TabsList>

        {/* ─── TYPE TAB ─── */}
        <TabsContent value="type" className="space-y-3 mt-0">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type your full legal name:</label>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Full name"
              className="bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Choose a signature style:</label>
            <div className="grid grid-cols-2 gap-2">
              {SIGNATURE_FONTS.map((font, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFont(idx)}
                  className={cn(
                    'p-3 rounded-lg border-2 bg-white text-left transition-all hover:border-primary/50',
                    selectedFont === idx ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  )}
                >
                  <span className="text-[10px] text-muted-foreground block mb-1">{font.name}</span>
                  <span
                    style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: '22px', color: '#1a1a1a' }}
                    className="block truncate"
                  >
                    {typedName || signerName || 'Your Name'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border rounded-lg bg-white p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
            <div
              style={{
                fontFamily: SIGNATURE_FONTS[selectedFont].family,
                fontWeight: SIGNATURE_FONTS[selectedFont].weight,
                fontSize: '36px',
                color: '#1a1a1a',
              }}
            >
              {typedName || signerName || 'Your Name'}
            </div>
            <div className="border-b-2 border-dashed border-muted-foreground/30 mt-1 mx-auto w-3/4" />
          </div>

          <canvas ref={typeCanvasRef} className="hidden" />

          <Button
            onClick={handleConfirmType}
            disabled={!typedName.trim() || !fontsLoaded}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <PenTool className="h-4 w-4 mr-2" /> Confirm Typed Signature
          </Button>
        </TabsContent>

        {/* ─── DRAW TAB ─── */}
        <TabsContent value="draw" className="space-y-3 mt-0">
          <p className="text-xs text-muted-foreground">Draw your signature below using your mouse or finger:</p>

          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white overflow-hidden relative">
            <canvas
              ref={drawCanvasRef}
              width={600}
              height={160}
              className="w-full touch-none cursor-crosshair block"
              style={{ touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground/40 text-sm select-none">Sign here</p>
              </div>
            )}
            <div className="absolute bottom-2 left-4 right-4 border-b border-dashed border-muted-foreground/30" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={clearDraw} disabled={!hasDrawn}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={handleConfirmDraw}
              disabled={!hasDrawn}
            >
              <PenTool className="h-3.5 w-3.5 mr-1.5" /> Confirm Drawing
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Works with mouse, stylus, or touch. Draw in a single stroke for best results.
          </p>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
