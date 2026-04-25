import { useNavigate } from "react-router-dom";
import { useContractorAgreement } from "./useContractorAgreement";
import { useToast } from "./use-toast";

/**
 * Bloqueo escalonado: gate para acciones críticas que requieren ICA firmado.
 *
 * Acciones bloqueadas si NO hay ICA firmado:
 * - Crear/editar leads
 * - Enviar outreach (email/SMS) a sellers
 * - Solicitar KCFY (Klose Closes For You)
 * - Acceder a "Mis Ganancias" (/earnings)
 *
 * Permitido SIEMPRE (read-only):
 * - Academy, Dashboard, ver leads existentes, Settings
 */
export function useICAGuard() {
  const { hasSigned, isLoading } = useContractorAgreement();
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Devuelve `true` si el usuario puede proceder, `false` si está bloqueado.
   * Cuando bloquea, muestra toast + redirige al onboarding.
   */
  const requireICA = (actionLabel?: string): boolean => {
    if (isLoading) return false; // Esperar a que cargue
    if (hasSigned) return true;

    toast({
      title: "Firma requerida",
      description: actionLabel
        ? `Para ${actionLabel} necesitas firmar tu Independent Contractor Agreement (1099) primero.`
        : "Necesitas firmar tu Independent Contractor Agreement (1099) primero.",
      variant: "destructive",
    });
    navigate("/onboarding/contractor-agreement");
    return false;
  };

  return {
    hasSigned,
    isLoading,
    isBlocked: !isLoading && !hasSigned,
    requireICA,
  };
}
