import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { useDealPackageNotifications } from "@/hooks/useDealPackageNotifications";
import { CleanupLoginToast } from "./CleanupLoginToast";
import { ContractorAgreementBanner } from "./ContractorAgreementBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, loading, isApproved } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Enable realtime notifications for deal packages
  useDealPackageNotifications();

  // Show login toast not rendered here — rendered in JSX below

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && isApproved === false) {
      navigate('/pending-approval');
    }
  }, [user, loading, isApproved, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <CleanupLoginToast />
      <Sidebar />
      <div className={isMobile ? "pl-0" : "pl-64 transition-all duration-300"}>
        <Header />
        <ContractorAgreementBanner />
        <main className="p-3 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
