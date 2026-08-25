import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import Index from "./pages/Index";
import Buyers from "./pages/Buyers";
import AdminBuyers from "./pages/AdminBuyers";
import Properties from "./pages/Properties";
import Payments from "./pages/Payments";
import Import from "./pages/Import";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import Settings from "./pages/Settings";
import Landing from "./pages/Landing";
import Analyze from "./pages/Analyze";
import Contracts from "./pages/Contracts";
import ContractNew from "./pages/ContractNew";
import ContractSign from "./pages/ContractSign";
import NotFound from "./pages/NotFound";
import Cobros from "./pages/Cobros";
import Deals from "./pages/Deals";
import DealNew from "./pages/DealNew";
import DealDetail from "./pages/DealDetail";
import PayCheckout from "./pages/PayCheckout";
import Terms from "./pages/legal/Terms";
import Refund from "./pages/legal/Refund";
import Privacy from "./pages/legal/Privacy";
import Home from "./pages/site/Home";
import Buy from "./pages/site/Buy";
import Sell from "./pages/site/Sell";
import LandPage from "./pages/site/Land";
import Markets from "./pages/site/Markets";
import MarketDetail from "./pages/site/MarketDetail";
import About from "./pages/site/About";
import Contact from "./pages/site/Contact";
import "@/styles/landing.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/buy" element={<Buy />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/land" element={<LandPage />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/markets/:slug" element={<MarketDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/investors" element={<Landing />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/buyers" element={<Buyers />} />
              <Route path="/admin/buyers" element={<AdminBuyers />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/new" element={<DealNew />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/import" element={<Import />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts/new" element={<ContractNew />} />
              <Route path="/sign/:token" element={<ContractSign />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/cobros" element={<Cobros />} />
              <Route path="/pay/:token" element={<PayCheckout />} />
              <Route path="/legal/terms" element={<Terms />} />
              <Route path="/legal/refund" element={<Refund />} />
              <Route path="/legal/privacy" element={<Privacy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
