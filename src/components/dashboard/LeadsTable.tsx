import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIWScoreGauge } from "./PIWScoreGauge";
import { MoreHorizontal, Phone, Mail, MapPin } from "lucide-react";

const mockLeads = [
  {
    id: 1,
    address: "1234 Oak Street",
    city: "Birmingham",
    state: "AL",
    owner: "John Smith",
    piwScore: 87,
    estimatedEquity: 45000,
    status: "hot",
    lastContact: "2 hours ago",
  },
  {
    id: 2,
    address: "567 Pine Avenue",
    city: "Montgomery",
    state: "AL",
    owner: "Sarah Johnson",
    piwScore: 72,
    estimatedEquity: 32000,
    status: "warm",
    lastContact: "1 day ago",
  },
  {
    id: 3,
    address: "890 Maple Drive",
    city: "Huntsville",
    state: "AL",
    owner: "Michael Brown",
    piwScore: 54,
    estimatedEquity: 28000,
    status: "cold",
    lastContact: "3 days ago",
  },
  {
    id: 4,
    address: "321 Cedar Lane",
    city: "Mobile",
    state: "AL",
    owner: "Emily Davis",
    piwScore: 91,
    estimatedEquity: 67000,
    status: "hot",
    lastContact: "30 min ago",
  },
  {
    id: 5,
    address: "654 Birch Court",
    city: "Tuscaloosa",
    state: "AL",
    owner: "Robert Wilson",
    piwScore: 45,
    estimatedEquity: 22000,
    status: "cold",
    lastContact: "5 days ago",
  },
];

const statusConfig = {
  hot: { label: "High Priority", variant: "accent" as const },
  warm: { label: "Follow Up", variant: "warning" as const },
  cold: { label: "Low Priority", variant: "secondary" as const },
};

export function LeadsTable() {
  return (
    <Card variant="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Recent Leads</CardTitle>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="pb-4 font-medium">Property</th>
                <th className="pb-4 font-medium">Owner</th>
                <th className="pb-4 font-medium">PIW Score</th>
                <th className="pb-4 font-medium">Est. Equity</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Last Contact</th>
                <th className="pb-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockLeads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-secondary/30 transition-colors">
                  <td className="py-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{lead.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.city}, {lead.state}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <p className="font-medium">{lead.owner}</p>
                  </td>
                  <td className="py-4">
                    <PIWScoreGauge score={lead.piwScore} size="sm" />
                  </td>
                  <td className="py-4">
                    <p className="font-semibold text-success">
                      ${lead.estimatedEquity.toLocaleString()}
                    </p>
                  </td>
                  <td className="py-4">
                    <Badge variant={statusConfig[lead.status].variant}>
                      {statusConfig[lead.status].label}
                    </Badge>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {lead.lastContact}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
