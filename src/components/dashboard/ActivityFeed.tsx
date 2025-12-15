import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Phone, Mail, FileText, DollarSign, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
  sms: { icon: MessageSquare, color: "text-primary" },
  call: { icon: Phone, color: "text-warning" },
  email: { icon: Mail, color: "text-info" },
  note: { icon: FileText, color: "text-muted-foreground" },
  offer: { icon: DollarSign, color: "text-success" },
  followup: { icon: Clock, color: "text-accent" },
  meeting: { icon: User, color: "text-primary" },
};

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactions')
        .select(`
          *,
          lead:leads(
            id,
            property:properties(address, city)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-xl">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatActivityMessage = (activity: any) => {
    const property = activity.lead?.property;
    const address = property?.address ? `${property.address}` : 'Propiedad';
    const type = activity.interaction_type;
    
    switch (type) {
      case 'call':
        return activity.direction === 'incoming' 
          ? `Llamada recibida - ${address}`
          : `Llamada realizada - ${address}`;
      case 'sms':
        return activity.direction === 'incoming'
          ? `SMS recibido - ${address}`
          : `SMS enviado - ${address}`;
      case 'email':
        return activity.direction === 'incoming'
          ? `Email recibido - ${address}`
          : `Email enviado - ${address}`;
      case 'note':
        return `Nota añadida - ${address}`;
      case 'offer':
        return `Oferta registrada - ${address}`;
      case 'followup':
        return `Seguimiento - ${address}`;
      default:
        return `${type} - ${address}`;
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-xl">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const config = iconMap[activity.interaction_type] || iconMap.note;
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={cn("rounded-lg bg-secondary p-2", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
