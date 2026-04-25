import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Archive, Trash2, AlertTriangle, X, ChevronRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const iconMap = {
  cleanup_archived: <Archive className="h-4 w-4 text-warning shrink-0" />,
  cleanup_deleted: <Trash2 className="h-4 w-4 text-destructive shrink-0" />,
  stale_warning: <AlertTriangle className="h-4 w-4 text-accent shrink-0" />,
  info: <Bell className="h-4 w-4 text-primary shrink-0" />,
  kcfy_request: <Briefcase className="h-4 w-4 text-primary shrink-0" />,
};

const typeLabels: Record<string, string> = {
  cleanup_archived: 'Archivado',
  cleanup_deleted: 'Eliminado',
  stale_warning: 'En riesgo',
  info: 'Info',
  kcfy_request: 'KCFY',
};

export function NotificationBell() {
  const { data: notifications, isLoading } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = (notifications || []).filter(n => !dismissed.has(n.id));
  const count = visible.length;

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const dismissAll = () => {
    setDismissed(new Set((notifications || []).map(n => n.id)));
  };

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
              {visible.map((notif) => {
                const isExpanded = expandedId === notif.id;
                return (
                  <div
                    key={notif.id}
                    className="px-4 py-3 hover:bg-secondary/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (notif.href) {
                        setOpen(false);
                        navigate(notif.href);
                      } else {
                        setExpandedId(isExpanded ? null : notif.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{iconMap[notif.type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant={
                              notif.type === 'cleanup_deleted' ? 'destructive' :
                              notif.type === 'stale_warning' ? 'warning' :
                              'secondary'
                            }
                            className="text-[9px] px-1.5 py-0"
                          >
                            {typeLabels[notif.type] || 'Info'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-tight">{notif.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>

                        {/* Expanded details */}
                        {isExpanded && notif.meta && (
                          <div className="mt-2 p-2 rounded-md bg-secondary/50 border border-border text-[11px] space-y-1">
                            {notif.meta.piw_score != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">K-Score:</span>
                                <span className="font-medium">{notif.meta.piw_score}</span>
                              </div>
                            )}
                            {notif.meta.source && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fuente:</span>
                                <span className="font-medium">{notif.meta.source}</span>
                              </div>
                            )}
                            {notif.meta.status && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado:</span>
                                <span className="font-medium">{notif.meta.status}</span>
                              </div>
                            )}
                            {notif.meta.days_stale != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Días inactivo:</span>
                                <span className="font-medium">{notif.meta.days_stale}d</span>
                              </div>
                            )}
                            {notif.meta.auction_date && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Subasta:</span>
                                <span className="font-medium">{notif.meta.auction_date}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {notif.meta && (
                          <button className="flex items-center gap-0.5 text-[10px] text-primary mt-1 hover:underline">
                            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            {isExpanded ? 'Menos detalles' : 'Ver detalles'}
                          </button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notif.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
