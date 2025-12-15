import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIWScoreGauge } from "@/components/dashboard/PIWScoreGauge";
import {
  Search,
  Filter,
  Upload,
  Download,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Zap,
} from "lucide-react";

const mockLeads = [
  {
    id: 1,
    address: "1234 Oak Street",
    city: "Birmingham",
    state: "AL",
    zipCode: "35201",
    owner: "John Smith",
    piwScore: 87,
    estimatedEquity: 45000,
    arv: 185000,
    estimatedRepairs: 25000,
    mao: 107000,
    status: "hot",
    lastContact: "2 hours ago",
    absenteeOwner: true,
    taxDelinquent: false,
  },
  {
    id: 2,
    address: "567 Pine Avenue",
    city: "Montgomery",
    state: "AL",
    zipCode: "36104",
    owner: "Sarah Johnson",
    piwScore: 72,
    estimatedEquity: 32000,
    arv: 145000,
    estimatedRepairs: 35000,
    mao: 68500,
    status: "warm",
    lastContact: "1 day ago",
    absenteeOwner: true,
    taxDelinquent: true,
  },
  {
    id: 3,
    address: "890 Maple Drive",
    city: "Huntsville",
    state: "AL",
    zipCode: "35801",
    owner: "Michael Brown",
    piwScore: 54,
    estimatedEquity: 28000,
    arv: 125000,
    estimatedRepairs: 40000,
    mao: 47500,
    status: "cold",
    lastContact: "3 days ago",
    absenteeOwner: false,
    taxDelinquent: true,
  },
  {
    id: 4,
    address: "321 Cedar Lane",
    city: "Mobile",
    state: "AL",
    zipCode: "36602",
    owner: "Emily Davis",
    piwScore: 91,
    estimatedEquity: 67000,
    arv: 220000,
    estimatedRepairs: 20000,
    mao: 134000,
    status: "hot",
    lastContact: "30 min ago",
    absenteeOwner: true,
    taxDelinquent: false,
  },
  {
    id: 5,
    address: "654 Birch Court",
    city: "Tuscaloosa",
    state: "AL",
    zipCode: "35401",
    owner: "Robert Wilson",
    piwScore: 45,
    estimatedEquity: 22000,
    arv: 98000,
    estimatedRepairs: 30000,
    mao: 38600,
    status: "cold",
    lastContact: "5 days ago",
    absenteeOwner: false,
    taxDelinquent: false,
  },
];

const statusConfig = {
  hot: { label: "High Priority", variant: "accent" as const },
  warm: { label: "Follow Up", variant: "warning" as const },
  cold: { label: "Low Priority", variant: "secondary" as const },
};

const Leads = () => {
  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              Manage and qualify your property leads with AI-powered scoring
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              Run AI Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by address, owner, or city..."
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <div className="flex gap-2">
              <Badge variant="glow" className="cursor-pointer">
                All (247)
              </Badge>
              <Badge variant="accent" className="cursor-pointer">
                Hot (42)
              </Badge>
              <Badge variant="warning" className="cursor-pointer">
                Warm (89)
              </Badge>
              <Badge variant="secondary" className="cursor-pointer">
                Cold (116)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Property</th>
                  <th className="p-4 font-medium">Owner</th>
                  <th className="p-4 font-medium">PIW Score</th>
                  <th className="p-4 font-medium">ARV</th>
                  <th className="p-4 font-medium">Est. Repairs</th>
                  <th className="p-4 font-medium">MAO</th>
                  <th className="p-4 font-medium">Indicators</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className="group hover:bg-secondary/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{lead.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.city}, {lead.state} {lead.zipCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{lead.owner}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.lastContact}
                      </p>
                    </td>
                    <td className="p-4">
                      <PIWScoreGauge score={lead.piwScore} size="sm" />
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">
                        ${lead.arv.toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-warning">
                        ${lead.estimatedRepairs.toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-success">
                        ${lead.mao.toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {lead.absenteeOwner && (
                          <Badge variant="info" className="text-[10px]">
                            Absentee
                          </Badge>
                        )}
                        {lead.taxDelinquent && (
                          <Badge variant="warning" className="text-[10px]">
                            Tax Delinq.
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={statusConfig[lead.status].variant}>
                        {statusConfig[lead.status].label}
                      </Badge>
                    </td>
                    <td className="p-4">
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
    </Layout>
  );
};

export default Leads;
