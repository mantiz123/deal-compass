import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Mail, FileText, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "sms",
    message: "SMS sent to John Smith - 1234 Oak Street",
    time: "5 min ago",
    icon: MessageSquare,
    color: "text-primary",
  },
  {
    id: 2,
    type: "call",
    message: "Missed call from Sarah Johnson",
    time: "32 min ago",
    icon: Phone,
    color: "text-warning",
  },
  {
    id: 3,
    type: "contract",
    message: "Contract signed - 890 Maple Drive",
    time: "1 hour ago",
    icon: FileText,
    color: "text-success",
  },
  {
    id: 4,
    type: "deal",
    message: "Deal closed - $15,000 assignment fee",
    time: "3 hours ago",
    icon: DollarSign,
    color: "text-accent",
  },
  {
    id: 5,
    type: "email",
    message: "Email campaign sent to 48 buyers",
    time: "5 hours ago",
    icon: Mail,
    color: "text-info",
  },
];

export function ActivityFeed() {
  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-xl">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-4 animate-fade-in",
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn("rounded-lg bg-secondary p-2", activity.color)}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-tight">
                  {activity.message}
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
