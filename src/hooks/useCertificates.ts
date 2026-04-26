import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CertificateType =
  | 'foundations'
  | 'closer'
  | 'scaler'
  | 'creative_finance'
  | 'master';

export interface AcademyCertificate {
  id: string;
  user_id: string;
  certificate_type: CertificateType;
  track_id: string | null;
  certificate_number: string;
  recipient_name: string;
  total_xp_earned: number;
  total_lessons_completed: number;
  pdf_path: string | null;
  pdf_url: string | null;
  issued_at: string;
  revoked_at: string | null;
}

// ---- List user's certificates ----
export function useUserCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy-certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('academy_certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademyCertificate[];
    },
    enabled: !!user?.id,
  });
}

// ---- Public certificate verification (no auth) ----
export function useVerifyCertificate(certNumber: string | undefined) {
  return useQuery({
    queryKey: ['verify-certificate', certNumber],
    queryFn: async () => {
      if (!certNumber) return null;
      const { data, error } = await supabase
        .from('academy_certificates')
        .select(
          'certificate_number, certificate_type, recipient_name, issued_at, total_lessons_completed, total_xp_earned, revoked_at'
        )
        .eq('certificate_number', certNumber)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!certNumber,
  });
}

// ---- Issue / re-check certificates (idempotent) ----
export function useIssueCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (certificateType?: CertificateType) => {
      const { data, error } = await supabase.functions.invoke('issue-certificate', {
        body: certificateType ? { certificateType } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['academy-certificates'] });
      const issued = (data?.issued ?? []) as AcademyCertificate[];
      if (issued.length > 0) {
        const masterIssued = issued.find((c) => c.certificate_type === 'master');
        if (masterIssued) {
          toast.success('🏆 Master Certificate emitido — ¡has completado toda la Academy!', {
            duration: 6000,
          });
        } else {
          toast.success(`🎓 ${issued.length} certificado(s) nuevo(s) emitido(s)`, {
            duration: 5000,
          });
        }
      }
    },
    onError: (err: any) => {
      console.error('Issue certificate error:', err);
      toast.error(err.message ?? 'No se pudo emitir el certificado');
    },
  });
}

// ---- Get a signed download URL for a certificate PDF ----
export async function getCertificateDownloadUrl(pdfPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('academy-certificates')
    .createSignedUrl(pdfPath, 60 * 60); // 1 hour
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

// ---- Metadata used by UI ----
export const CERT_TYPE_META: Record<
  CertificateType,
  { label: string; subtitle: string; emoji: string; gradient: string }
> = {
  foundations: {
    label: 'Wholesaling Fundamentals',
    subtitle: 'Foundations Track',
    emoji: '🎓',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  closer: {
    label: 'Certified Closer',
    subtitle: 'Closer Track',
    emoji: '🤝',
    gradient: 'from-emerald-500/20 to-green-500/20',
  },
  scaler: {
    label: 'Certified Scaler',
    subtitle: 'Scaler Track',
    emoji: '🚀',
    gradient: 'from-violet-500/20 to-purple-500/20',
  },
  creative_finance: {
    label: 'Creative Finance Specialist',
    subtitle: 'Creative Finance Mastery',
    emoji: '💎',
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
  master: {
    label: 'Master of Creative Finance & Wholesaling',
    subtitle: 'Highest Distinction',
    emoji: '🏆',
    gradient: 'from-amber-500/30 via-yellow-500/30 to-amber-600/30',
  },
};
