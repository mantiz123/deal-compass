import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { PipelinePreview } from "@/components/dashboard/PipelinePreview";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Target, Users, DollarSign, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Welcome back, Pau</h1>
              <Badge variant="glow" className="animate-pulse-glow">
                <Zap className="mr-1 h-3 w-3" />
                AI Active
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Here's what's happening with your wholesaling pipeline today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Import Leads</Button>
            <Button>
              <Target className="mr-2 h-4 w-4" />
              New Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Leads"
          value="1,247"
          change="+12% from last month"
          changeType="positive"
          icon={Target}
          iconColor="text-primary"
        />
        <StatsCard
          title="Active Buyers"
          value="89"
          change="+5 new this week"
          changeType="positive"
          icon={Users}
          iconColor="text-info"
        />
        <StatsCard
          title="Deals Closed"
          value="23"
          change="$345K total value"
          changeType="neutral"
          icon={DollarSign}
          iconColor="text-success"
        />
        <StatsCard
          title="Avg. PIW Score"
          value="72"
          change="+8 points improvement"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-accent"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Leads Table */}
        <div className="lg:col-span-2 space-y-6">
          <LeadsTable />
        </div>

        {/* Right Column - Pipeline & Activity */}
        <div className="space-y-6">
          <PipelinePreview />
          <ActivityFeed />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
