import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, CheckCircle2, XCircle, Sparkles, Trophy, Home } from 'lucide-react';
import { useVerifyCertificate, CERT_TYPE_META } from '@/hooks/useCertificates';
import { Skeleton } from '@/components/ui/skeleton';

export default function VerifyCertificate() {
  const { certNumber } = useParams<{ certNumber: string }>();
  const { data: cert, isLoading, error } = useVerifyCertificate(certNumber);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Award className="h-6 w-6 text-primary" />
            KLOSE Academy
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Inicio
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Verificación de Certificado
          </h1>
          <p className="text-muted-foreground">
            Validación pública de credenciales emitidas por Klose Academy
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error || !cert ? (
          <InvalidCertCard certNumber={certNumber} />
        ) : cert.revoked_at ? (
          <RevokedCertCard certNumber={cert.certificate_number} />
        ) : (
          <ValidCertCard cert={cert} />
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          ¿Necesitas reportar un certificado falsificado?{' '}
          <a href="mailto:legal@goklose.com" className="text-primary hover:underline">
            legal@goklose.com
          </a>
        </div>
      </main>
    </div>
  );
}

// =====================================================================
function ValidCertCard({ cert }: { cert: any }) {
  const meta = CERT_TYPE_META[cert.certificate_type as keyof typeof CERT_TYPE_META];
  const isMaster = cert.certificate_type === 'master';

  return (
    <Card
      className={`overflow-hidden border-2 ${
        isMaster ? 'border-amber-500/70 shadow-xl shadow-amber-500/10' : 'border-emerald-500/50'
      } bg-gradient-to-br ${meta.gradient}`}
    >
      <CardContent className="pt-8 pb-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-500/15 p-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
        </div>

        <div>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 mb-3">
            Certificado Auténtico
          </Badge>
          {isMaster && (
            <Badge className="ml-2 bg-amber-500/90 text-amber-50 border-amber-600">
              <Trophy className="h-3 w-3 mr-1" />
              Highest Distinction
            </Badge>
          )}
        </div>

        <div className="text-6xl">{meta.emoji}</div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {meta.subtitle}
          </p>
          <h2 className="text-2xl font-bold text-foreground">{meta.label}</h2>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Otorgado a</p>
          <p className="text-2xl font-serif font-bold text-foreground">{cert.recipient_name}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground border-t border-border/50 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wider">Emitido</p>
            <p className="text-foreground font-medium">
              {new Date(cert.issued_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider">Lecciones</p>
            <p className="text-foreground font-medium">{cert.total_lessons_completed}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> XP
            </p>
            <p className="text-foreground font-medium">
              {cert.total_xp_earned.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-mono pt-2">
          {cert.certificate_number}
        </div>
      </CardContent>
    </Card>
  );
}

function InvalidCertCard({ certNumber }: { certNumber: string | undefined }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="pt-8 pb-8 space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/15 p-4">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Certificado no encontrado</h2>
        <p className="text-muted-foreground">
          No existe un certificado con el número{' '}
          <span className="font-mono">{certNumber}</span>. Verifica que el número sea correcto.
        </p>
      </CardContent>
    </Card>
  );
}

function RevokedCertCard({ certNumber }: { certNumber: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="pt-8 pb-8 space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/15 p-4">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Certificado revocado</h2>
        <p className="text-muted-foreground">
          El certificado <span className="font-mono">{certNumber}</span> fue revocado por Klose
          Academy y ya no es válido.
        </p>
      </CardContent>
    </Card>
  );
}
