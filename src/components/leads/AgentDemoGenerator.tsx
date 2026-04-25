import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mic,
  Loader2,
  Trash2,
  Play,
  FileText,
  Bot,
  User,
  Headphones,
  Languages,
} from 'lucide-react';
import {
  useAgentDemos,
  useGenerateAgentDemo,
  useDeleteAgentDemo,
  AGENT_LABELS,
  SELLER_LABELS,
  type AgentPersona,
  type SellerPersona,
  type AgentDemo,
} from '@/hooks/useAgentDemos';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AgentDemoGenerator() {
  const { data: demos, isLoading } = useAgentDemos();
  const generate = useGenerateAgentDemo();
  const remove = useDeleteAgentDemo();

  const [agentPersona, setAgentPersona] = useState<AgentPersona>('sarah');
  const [sellerPersona, setSellerPersona] = useState<SellerPersona>('motivated');
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [selected, setSelected] = useState<AgentDemo | null>(null);

  const handleGenerate = () => {
    generate.mutate({ agent_persona: agentPersona, seller_persona: sellerPersona, language });
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Headphones className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Audición de Agentes</h3>
          <p className="text-sm text-muted-foreground">
            Genera una conversación demo entre un agente Klose y un seller simulado para escuchar cómo suenan antes de usarlos en llamadas reales.
          </p>
        </div>
      </div>

      {/* Generador */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Bot className="h-3 w-3" /> Agente Klose
          </label>
          <Select value={agentPersona} onValueChange={(v) => setAgentPersona(v as AgentPersona)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AGENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" /> Tipo de Seller
          </label>
          <Select value={sellerPersona} onValueChange={(v) => setSellerPersona(v as SellerPersona)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SELLER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Languages className="h-3 w-3" /> Idioma
          </label>
          <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'es')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">Inglés</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="w-full"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Generar Demo
              </>
            )}
          </Button>
        </div>
      </div>

      {generate.isPending && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 border border-dashed">
          ⏳ Esto toma 30-60 segundos: Gemini escribe el diálogo, ElevenLabs sintetiza cada turno con voces distintas y todo se concatena en un MP3.
        </div>
      )}

      {/* Lista de demos */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Tus demos generados</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : !demos || demos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
            Aún no has generado ningún demo. Configura un agente arriba y genera tu primero.
          </p>
        ) : (
          <div className="space-y-2">
            {demos.map((demo) => (
              <div
                key={demo.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{AGENT_LABELS[demo.agent_persona]}</Badge>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <Badge variant="secondary">{SELLER_LABELS[demo.seller_persona]}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {demo.language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
                    </Badge>
                    {demo.status === 'generating' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Generando
                      </Badge>
                    )}
                    {demo.status === 'failed' && (
                      <Badge variant="destructive" className="text-xs">Falló</Badge>
                    )}
                  </div>
                  {demo.scenario_summary && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {demo.scenario_summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{formatDate(demo.created_at)}</span>
                    <span>·</span>
                    <span>{formatDuration(demo.duration_seconds)}</span>
                  </div>
                </div>

                {demo.status === 'ready' && demo.audio_url && (
                  <audio controls src={demo.audio_url} className="h-8 max-w-xs" />
                )}

                <div className="flex items-center gap-1">
                  {demo.status === 'ready' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected(demo)}
                      title="Ver transcripción"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(demo.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: transcripción */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcripción del Demo
            </DialogTitle>
            <DialogDescription>
              {selected && `${AGENT_LABELS[selected.agent_persona]} · ${SELLER_LABELS[selected.seller_persona]}`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              {selected.scenario_summary && (
                <div className="text-sm bg-muted/50 p-3 rounded-md italic">
                  {selected.scenario_summary}
                </div>
              )}
              {selected.audio_url && (
                <audio controls src={selected.audio_url} className="w-full" />
              )}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {selected.transcript.map((turn, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${turn.speaker === 'agent' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          turn.speaker === 'agent'
                            ? 'bg-primary/10 text-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">
                          {turn.speaker === 'agent' ? 'Agente' : 'Seller'}
                        </div>
                        {turn.text}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
