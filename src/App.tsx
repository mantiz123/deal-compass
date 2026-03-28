import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Guide from "./pages/Guide";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import "@/styles/landing.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset" element={<ResetPassword />} />
              <Route path="/guide" element={<Guide />} />
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
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
