import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOvernightCleanupSummary } from '@/hooks/useNotifications';

/**
 * Shows a one-time toast when user logs in summarizing overnight cleanup.
 * Renders nothing — purely side-effect component.
 */
export function CleanupLoginToast() {
  const { data: summary } = useOvernightCleanupSummary();
  const shown = useRef(false);

  useEffect(() => {
    if (!summary || shown.current) return;
    shown.current = true;

    const parts: string[] = [];
    if (summary.archived > 0) parts.push(`${summary.archived} archivados`);
    if (summary.deleted > 0) parts.push(`${summary.deleted} eliminados`);

    if (parts.length > 0) {
      toast.info('🧹 Limpieza nocturna completada', {
        description: `Se procesaron ${summary.total} leads: ${parts.join(', ')}.`,
        duration: 8000,
      });
    }
  }, [summary]);

  return null;
}
