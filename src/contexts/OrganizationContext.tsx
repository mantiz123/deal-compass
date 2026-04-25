import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
  isSuperAdmin: boolean;
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'klose:current_org_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
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

    const mapped: OrgMembership[] = (data || [])
      .filter((row: any) => row.organization?.is_active)
      .map((row: any) => ({
        organization: row.organization as Organization,
        role: row.role as OrgRole,
      }));

    setMemberships(mapped);

    // Restore previously selected org or pick the first one
    const storedId = localStorage.getItem(STORAGE_KEY);
    const found = mapped.find(m => m.organization.id === storedId);
    const initial = found?.organization 
      || mapped.find(m => m.organization.is_klose_internal)?.organization
      || mapped[0]?.organization
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
    const target = memberships.find(m => m.organization.id === orgId);
    if (target) {
      setCurrentOrg(target.organization);
      localStorage.setItem(STORAGE_KEY, orgId);
      // Trigger refetch in app
      window.location.reload();
    }
  }, [memberships]);

  const isSuperAdmin = memberships.some(m => m.organization.is_klose_internal);

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      memberships,
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
