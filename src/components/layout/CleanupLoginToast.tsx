import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOvernightCleanupSummary } from '@/hooks/useNotifications';

const STORAGE_KEY = 'cleanup-toast-last-shown';

function shownToday(): boolean {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return false;
  return last === new Date().toISOString().slice(0, 10);
}

function markShown() {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
}

export function CleanupLoginToast() {
  const { data: summary } = useOvernightCleanupSummary();
  const shown = useRef(false);

  useEffect(() => {
    if (!summary || shown.current || shownToday()) return;
    shown.current = true;
    markShown();

    const parts: string[] = [];
    if (summary.archived > 0) parts.push(`${summary.archived} archivados`);
    if (summary.deleted > 0) parts.push(`${summary.deleted} eliminados`);

    if (parts.length > 0) {
      toast.info('🧹 Limpieza nocturna completada', {
        description: `Se procesaron ${summary.total} leads: ${parts.join(', ')}.`,
        duration: 8000,
        dismissible: true,
        closeButton: true,
      });
    }
  }, [summary]);

  return null;
}
