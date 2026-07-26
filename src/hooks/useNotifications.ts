import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface AppNotification {
  id: string;
  type: 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  meta?: Record<string, any>;
  href?: string;
}

/**
 * Placeholder — se reemplaza cuando se agregue el pipeline Section 8
 * (deal room events, payment reminders, HUD FMR alerts).
 */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['app-notifications', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppNotification[]> => [],
    refetchInterval: 5 * 60 * 1000,
  });
}
