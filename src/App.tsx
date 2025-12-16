import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Pipeline from "./pages/Pipeline";
import Leads from "./pages/Leads";
import Buyers from "./pages/Buyers";
import Tracking from "./pages/Tracking";
import Campaigns from "./pages/Campaigns";
import Deals from "./pages/Deals";
import Properties from "./pages/Properties";
import Realtors from "./pages/Realtors";
import Payments from "./pages/Payments";
import Import from "./pages/Import";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/buyers" element={<Buyers />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/realtors" element={<Realtors />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/import" element={<Import />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
