import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ICA_VERSION } from "@/lib/icaTemplate";
import { Database } from "@/integrations/supabase/types";

type TaxClassification = Database["public"]["Enums"]["tax_classification"];

export interface ICASignPayload {
  legalName: string;
  businessName?: string;
  taxClassification: TaxClassification;
  taxIdFull: string; // SSN/EIN — sent to DB only at submit
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone?: string;
  signatureImage: string; // data URL
  commissionSplitStudent?: number;
}

export function useContractorAgreement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contractor-agreement", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_agreements")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const signMutation = useMutation({
    mutationFn: async (payload: ICASignPayload) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      const taxIdLast4 = payload.taxIdFull.replace(/\D/g, "").slice(-4);
      const userAgent =
        typeof navigator !== "undefined" ? navigator.userAgent : null;

      const { data, error } = await supabase
        .from("contractor_agreements")
        .insert({
          user_id: user.id,
          agreement_version: ICA_VERSION,
          agreement_language: "es",
          legal_name: payload.legalName,
          business_name: payload.businessName || null,
          tax_classification: payload.taxClassification,
          tax_id_full: payload.taxIdFull,
          tax_id_last4: taxIdLast4,
          address_line1: payload.addressLine1,
          address_line2: payload.addressLine2 || null,
          city: payload.city,
          state: payload.state.toUpperCase(),
          zip_code: payload.zipCode,
          country: "US",
          email: payload.email,
          phone: payload.phone || null,
          commission_split_student: payload.commissionSplitStudent ?? 60,
          signature_image: payload.signatureImage,
          user_agent: userAgent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-agreement"] });
    },
  });

  return {
    agreement: query.data,
    isLoading: query.isLoading,
    hasSigned: !!query.data,
    sign: signMutation.mutateAsync,
    isSigning: signMutation.isPending,
  };
}
