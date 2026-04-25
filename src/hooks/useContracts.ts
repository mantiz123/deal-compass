import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';

export type ContractType = 'AB' | 'BC' | 'AMENDMENT';
export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'completed';

export interface Contract {
  id: string;
  lead_id: string;
  contract_type: ContractType;
  status: ContractStatus;
  contract_data: Record<string, any>;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  signing_token: string;
  seller_email: string | null;
  seller_phone: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  ip_address: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  lead?: {
    id: string;
    status: string;
    property?: {
      address: string;
      city: string;
      state: string;
      county: string | null;
      owner_name: string | null;
      owner_phone: string | null;
      owner_email: string | null;
      mao: number | null;
    };
  };
}

export interface ContractSignature {
  id: string;
  contract_id: string;
  signer_name: string;
  signer_email: string | null;
  signature_image: string | null;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export function useContracts(filters?: {
  status?: string;
  contract_type?: string;
  search?: string;
}) {
  const orgId = useCurrentOrgIdSafe();
  return useQuery({
    queryKey: ['contracts', orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('*, lead:leads(id, status, property:properties(address, city, state, county, owner_name, owner_phone, owner_email, mao))')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.contract_type && filters.contract_type !== 'all') {
        query = query.eq('contract_type', filters.contract_type as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as unknown as Contract[];
      
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(c => {
          const addr = (c.lead as any)?.property?.address?.toLowerCase() || '';
          const owner = (c.lead as any)?.property?.owner_name?.toLowerCase() || '';
          return addr.includes(s) || owner.includes(s);
        });
      }
      
      return results;
    },
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contracts')
        .select('*, lead:leads(id, status, property:properties(address, city, state, county, owner_name, owner_phone, owner_email, mao))')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Contract;
    },
    enabled: !!id,
  });
}

export function useContractByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['contract-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('contracts')
        .select('*, lead:leads(id, status, property:properties(address, city, state, county, owner_name, owner_phone, owner_email, mao))')
        .eq('signing_token', token)
        .single();
      if (error) throw error;
      return data as unknown as Contract;
    },
    enabled: !!token,
  });
}

export function useContractSignatures(contractId: string | undefined) {
  return useQuery({
    queryKey: ['contract-signatures', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('contract_id', contractId)
        .order('signed_at', { ascending: true });
      if (error) throw error;
      return data as ContractSignature[];
    },
    enabled: !!contractId,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contract: {
      lead_id: string;
      contract_type: ContractType;
      contract_data: Record<string, any>;
      seller_email?: string;
      seller_phone?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contract,
          created_by: user?.id,
          status: 'draft' as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: 'Contrato creado', description: 'El contrato se ha creado como borrador.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useContractsForLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ['contracts', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Contract[];
    },
    enabled: !!leadId,
  });
}
