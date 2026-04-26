import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Download, ExternalLink, Sparkles, Trophy, Lock } from 'lucide-react';
import {
  useUserCertificates,
  useIssueCertificates,
  getCertificateDownloadUrl,
  CERT_TYPE_META,
  type AcademyCertificate,
  type CertificateType,
} from '@/hooks/useCertificates';

interface CertificatesTabProps {
  /** All published track ids → used to show "locked" placeholders for tracks not yet finished */
  allTrackTypes?: CertificateType[];
}

const ALL_TYPES: CertificateType[] = [
  'foundations',
  'closer',
  'scaler',
  'creative_finance',
  'master',
];

export function CertificatesTab({ allTrackTypes = ALL_TYPES }: CertificatesTabProps) {
  const { data: certificates = [], isLoading } = useUserCertificates();
  const issueMutation = useIssueCertificates();

  // On mount, run the idempotent emitter so any newly-qualified user gets their certs
  useEffect(() => {
    issueMutation.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const earnedByType = new Map(certificates.map((c) => [c.certificate_type, c]));

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Tus Certificados
          </h2>
          <p className="text-sm text-muted-foreground">
            Diplomas emitidos al completar cada track al 100%. El Master Certificate se desbloquea
            automáticamente al cerrar los cuatro tracks.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => issueMutation.mutate(undefined)}
          disabled={issueMutation.isPending}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Verificar nuevos certificados
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allTrackTypes.map((type) => {
            const cert = earnedByType.get(type);
            return cert ? (
              <CertificateCard key={type} certificate={cert} />
            ) : (
              <LockedCertificateCard key={type} type={type} />
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================================
function CertificateCard({ certificate }: { certificate: AcademyCertificate }) {
  const meta = CERT_TYPE_META[certificate.certificate_type];
  const isMaster = certificate.certificate_type === 'master';
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certificate.pdf_path) return;
    setDownloading(true);
    try {
      const url = await getCertificateDownloadUrl(certificate.pdf_path);
      if (url) {
        // Trigger download in new tab so browser handles content-disposition
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden bg-gradient-to-br ${meta.gradient} border-2 ${
        isMaster ? 'border-amber-500/60 shadow-lg shadow-amber-500/10' : 'border-border'
      }`}
    >
      {isMaster && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-amber-500/90 text-amber-50 border-amber-600">
            <Trophy className="h-3 w-3 mr-1" />
            Highest Distinction
          </Badge>
        </div>
      )}

      <CardContent className="pt-6 space-y-4">
        <div className="text-5xl">{meta.emoji}</div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {meta.subtitle}
          </p>
          <h3 className="text-lg font-bold text-foreground leading-tight mt-0.5">
            {meta.label}
          </h3>
        </div>

        <div className="text-sm space-y-1">
          <p className="text-foreground font-medium">{certificate.recipient_name}</p>
          <p className="text-muted-foreground text-xs">
            {new Date(certificate.issued_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-muted-foreground text-xs font-mono">
            {certificate.certificate_number}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {certificate.total_xp_earned.toLocaleString()} XP
          </span>
          <span>·</span>
          <span>{certificate.total_lessons_completed} lecciones</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={handleDownload}
            disabled={!certificate.pdf_path || downloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Generando...' : 'Descargar PDF'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <a
              href={`/verify/${certificate.certificate_number}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Verificar autenticidad"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================
function LockedCertificateCard({ type }: { type: CertificateType }) {
  const meta = CERT_TYPE_META[type];
  const isMaster = type === 'master';

  return (
    <Card className="relative overflow-hidden border-dashed border-border/60 bg-muted/20">
      <CardContent className="pt-6 space-y-4 opacity-60">
        <div className="text-5xl grayscale">{meta.emoji}</div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {meta.subtitle}
          </p>
          <h3 className="text-lg font-bold text-foreground leading-tight mt-0.5">
            {meta.label}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {isMaster
            ? 'Completa los 4 tracks para desbloquear el Master Certificate.'
            : 'Completa el 100% de las lecciones de este track para emitir tu certificado.'}
        </p>
        <Button size="sm" variant="outline" disabled className="w-full">
          <Lock className="h-4 w-4 mr-2" />
          Bloqueado
        </Button>
      </CardContent>
    </Card>
  );
}
