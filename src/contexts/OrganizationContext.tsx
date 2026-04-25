import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type OrgTier = 'internal' | 'free' | 'pro' | 'elite';
export type OrgRole = 'owner' | 'admin' | 'agent' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: OrgTier;
  is_klose_internal: boolean;
  logo_url: string | null;
  primary_color: string | null;
  country: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrgMembership {
  organization: Organization;
  role: OrgRole;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  memberships: OrgMembership[];
  /** Para super admins: TODAS las orgs activas del sistema. Para usuarios normales: solo sus memberships. */
  visibleOrgs: Organization[];
  isSuperAdmin: boolean;
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'klose:current_org_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setAllOrgs([]);
      setCurrentOrg(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    // 1. Fetch user memberships
    const { data: membershipData, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization:organizations!inner(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching organization memberships:', error);
      setMemberships([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    const mapped: OrgMembership[] = (membershipData || [])
      .filter((row: any) => row.organization?.is_active)
      .map((row: any) => ({
        organization: row.organization as Organization,
        role: row.role as OrgRole,
      }));

    setMemberships(mapped);

    const userIsSuperAdmin = mapped.some(m => m.organization.is_klose_internal);
    setIsSuperAdmin(userIsSuperAdmin);

    // 2. Para super admins: traer TODAS las orgs activas
    let visibleOrgs: Organization[] = mapped.map(m => m.organization);
    if (userIsSuperAdmin) {
      const { data: allOrgsData } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('is_klose_internal', { ascending: false })
        .order('created_at', { ascending: true });
      
      if (allOrgsData) {
        visibleOrgs = allOrgsData as Organization[];
      }
    }
    setAllOrgs(visibleOrgs);

    // 3. Restaurar org seleccionada
    const storedId = localStorage.getItem(STORAGE_KEY);
    const found = visibleOrgs.find(o => o.id === storedId);
    const initial = found
      || visibleOrgs.find(o => o.is_klose_internal)
      || visibleOrgs[0]
      || null;

    setCurrentOrg(initial);
    if (initial) localStorage.setItem(STORAGE_KEY, initial.id);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchMemberships();
  }, [authLoading, fetchMemberships]);

  const switchOrganization = useCallback((orgId: string) => {
    const target = allOrgs.find(o => o.id === orgId);
    if (target) {
      setCurrentOrg(target);
      localStorage.setItem(STORAGE_KEY, orgId);
      // Invalidar todas las queries para que se refetcheen con la nueva org activa
      queryClient.invalidateQueries();
    }
  }, [allOrgs, queryClient]);

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      memberships,
      visibleOrgs: allOrgs,
      isSuperAdmin,
      loading,
      switchOrganization,
      refreshOrganizations: fetchMemberships,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
}

/**
 * Convenience hook: returns the current organization_id (string).
 * Throws if no org is selected — use this in mutation functions where org is required.
 */
export function useCurrentOrgId(): string {
  const { currentOrg } = useOrganization();
  if (!currentOrg) {
    throw new Error('No organization selected. User must belong to at least one org.');
  }
  return currentOrg.id;
}

/**
 * Safe variant: returns null if no org selected (use in queries that should be disabled when no org).
 */
export function useCurrentOrgIdSafe(): string | null {
  const { currentOrg } = useOrganization();
  return currentOrg?.id ?? null;
}
