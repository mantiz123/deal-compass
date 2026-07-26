import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function NotificationBell() {
  const { data: notifications, isLoading } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = (notifications || []).filter(n => !dismissed.has(n.id));
  const count = visible.length;

  const dismiss = (id: string) => setDismissed(prev => new Set(prev).add(id));
  const dismissAll = () => setDismissed(new Set((notifications || []).map(n => n.id)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Notificaciones</h4>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={dismissAll}>
              Marcar todas leídas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Cargando...</div>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Sin notificaciones nuevas</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((notif) => (
                <div
                  key={notif.id}
                  className="px-4 py-3 hover:bg-secondary/50 transition-colors group cursor-pointer"
                  onClick={() => {
                    if (notif.href) {
                      setOpen(false);
                      navigate(notif.href);
                    }
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground/60 mb-0.5">
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: es })}
                      </div>
                      <p className="text-xs font-medium leading-tight">{notif.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      {notif.href && (
                        <div className="flex items-center gap-0.5 text-[10px] text-primary mt-1">
                          <ChevronRight className="h-3 w-3" />
                          Abrir
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
