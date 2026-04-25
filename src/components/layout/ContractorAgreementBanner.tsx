import { useNavigate, useLocation } from "react-router-dom";
import { useContractorAgreement } from "@/hooks/useContractorAgreement";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileWarning } from "lucide-react";

const HIDE_ON_PATHS = ["/onboarding/contractor-agreement", "/pending-approval", "/auth"];

export function ContractorAgreementBanner() {
  const { hasSigned, isLoading } = useContractorAgreement();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading || hasSigned) return null;
  if (HIDE_ON_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-amber-500/40 bg-amber-500/10">
      <FileWarning className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm">
          Para recibir comisiones (60% por deal cerrado) necesitas firmar tu Independent Contractor Agreement (1099).
        </span>
        <Button size="sm" onClick={() => navigate("/onboarding/contractor-agreement")}>
          Firmar ahora
        </Button>
      </AlertDescription>
    </Alert>
  );
}
