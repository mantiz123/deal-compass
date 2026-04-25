import { useState } from 'react';
import { useTrainingAudio } from '@/hooks/useTrainingSessions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Play, Pause, AlertCircle, Volume2 } from 'lucide-react';

interface TrainingAudioPlayerProps {
  conversationId: string | null;
}

/**
 * Streams the ElevenLabs MP3 for a past training conversation.
 * Audio is fetched lazily (only when user clicks "Cargar audio") to avoid
 * burning ElevenLabs API quota on every detail-sheet open.
 */
export function TrainingAudioPlayer({ conversationId }: TrainingAudioPlayerProps) {
  const [enabled, setEnabled] = useState(false);
  const { data: audioUrl, isLoading, error, refetch } = useTrainingAudio(
    enabled ? conversationId : null,
  );

  if (!conversationId) {
    return (
      <Card variant="glass" className="p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Audio no disponible — esta sesión no tiene ID de ElevenLabs guardado.
        </p>
      </Card>
    );
  }

  if (!enabled) {
    return (
      <Card variant="glass" className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Audio de la llamada</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEnabled(true)}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Cargar audio
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card variant="glass" className="p-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Descargando audio desde ElevenLabs...
        </p>
      </Card>
    );
  }

  if (error || !audioUrl) {
    return (
      <Card className="p-3 border-warning bg-warning/5">
        <p className="text-sm flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          No se pudo cargar el audio. Suele tardar 30-60s en estar listo después
          de terminar la llamada.
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <Volume2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Audio de la llamada</p>
      </div>
      <audio controls src={audioUrl} className="w-full" preload="metadata" />
    </Card>
  );
}
