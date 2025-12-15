import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MoreHorizontal,
  MapPin,
  DollarSign,
  Home,
  Zap,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockBuyers = [
  {
    id: 1,
    name: "Atlantic Capital Investments",
    contact: "Mark Thompson",
    email: "mark@atlanticcapital.com",
    phone: "(205) 555-0123",
    zipCodes: ["35201", "35203", "35205", "35209"],
    propertyTypes: ["SFH", "Duplex"],
    arvRange: "$100K - $250K",
    repairLevel: "Light to Heavy",
    closedDeals: 12,
    matchScore: 94,
    tier: "platinum",
    lastActive: "2 hours ago",
  },
  {
    id: 2,
    name: "Southern Rehab LLC",
    contact: "Jennifer Adams",
    email: "jen@southernrehab.com",
    phone: "(334) 555-0456",
    zipCodes: ["36104", "36106", "36109"],
    propertyTypes: ["SFH"],
    arvRange: "$80K - $150K",
    repairLevel: "Heavy",
    closedDeals: 8,
    matchScore: 87,
    tier: "gold",
    lastActive: "1 day ago",
  },
  {
    id: 3,
    name: "Rocket City Properties",
    contact: "David Chen",
    email: "david@rocketcityprops.com",
    phone: "(256) 555-0789",
    zipCodes: ["35801", "35802", "35805", "35806"],
    propertyTypes: ["SFH", "Multifamily"],
    arvRange: "$150K - $350K",
    repairLevel: "Light to Medium",
    closedDeals: 15,
    matchScore: 91,
    tier: "platinum",
    lastActive: "5 hours ago",
  },
  {
    id: 4,
    name: "Gulf Coast Ventures",
    contact: "Lisa Martinez",
    email: "lisa@gulfcoastv.com",
    phone: "(251) 555-0321",
    zipCodes: ["36602", "36604", "36606"],
    propertyTypes: ["SFH", "Condo"],
    arvRange: "$120K - $280K",
    repairLevel: "Light",
    closedDeals: 6,
    matchScore: 78,
    tier: "silver",
    lastActive: "3 days ago",
  },
  {
    id: 5,
    name: "Bama Flippers Inc",
    contact: "Robert Taylor",
    email: "rob@bamaflippers.com",
    phone: "(205) 555-0654",
    zipCodes: ["35401", "35404", "35405"],
    propertyTypes: ["SFH"],
    arvRange: "$60K - $120K",
    repairLevel: "Medium to Heavy",
    closedDeals: 4,
    matchScore: 72,
    tier: "bronze",
    lastActive: "1 week ago",
  },
];

const tierConfig = {
  platinum: { label: "Platinum", color: "bg-primary/20 text-primary border-primary/30" },
  gold: { label: "Gold", color: "bg-accent/20 text-accent border-accent/30" },
  silver: { label: "Silver", color: "bg-muted text-muted-foreground border-border" },
  bronze: { label: "Bronze", color: "bg-warning/10 text-warning border-warning/30" },
};

const Buyers = () => {
  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Buyers Network</h1>
            <p className="text-muted-foreground">
              Manage your cash buyer network with AI-powered matchmaking
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Buyer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Buyers</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Home className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active This Week</p>
                <p className="text-2xl font-bold">34</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2 text-success">
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Close Time</p>
                <p className="text-2xl font-bold">12 days</p>
              </div>
              <div className="rounded-lg bg-info/10 p-2 text-info">
                <Star className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="interactive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Closed</p>
                <p className="text-2xl font-bold">$2.4M</p>
              </div>
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search buyers by name, zip code, or property type..."
                className="pl-10 bg-secondary/50"
              />
            </div>
            <div className="flex gap-2">
              {Object.entries(tierConfig).map(([key, config]) => (
                <Badge
                  key={key}
                  className={cn("cursor-pointer", config.color)}
                >
                  {config.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockBuyers.map((buyer, index) => (
          <Card
            key={buyer.id}
            variant="interactive"
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{buyer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{buyer.contact}</p>
                </div>
                <Badge className={tierConfig[buyer.tier].color}>
                  {tierConfig[buyer.tier].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Match Score */}
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                <span className="text-sm text-muted-foreground">AI Match Score</span>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-lg font-bold text-primary">{buyer.matchScore}%</span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Zip Codes:</span>
                  <span className="font-medium">{buyer.zipCodes.slice(0, 3).join(", ")}...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Types:</span>
                  <span className="font-medium">{buyer.propertyTypes.join(", ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">ARV Range:</span>
                  <span className="font-medium">{buyer.arvRange}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-success">{buyer.closedDeals}</p>
                  <p className="text-xs text-muted-foreground">Deals Closed</p>
                </div>
                <div className="flex gap-1">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

export default Buyers;
