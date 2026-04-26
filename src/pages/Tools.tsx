import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, Lock, Sparkles, Calculator, Construction } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SubToCalculator } from '@/components/tools/SubToCalculator';
import { Link } from 'react-router-dom';

const PRO_TIERS = ['pro', 'elite', 'internal'] as const;

export default function Tools() {
  const { currentOrg } = useOrganization();
  const tier = currentOrg?.tier ?? 'free';
  const hasAccess = (PRO_TIERS as readonly string[]).includes(tier);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Wrench className="h-7 w-7 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              Herramientas
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Calculadoras y analizadores profesionales para evaluar deals creativos al instante.
            </p>
          </div>
          <Badge
            variant={hasAccess ? 'default' : 'outline'}
            className="self-start sm:self-auto"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {hasAccess ? `Plan ${tier.toUpperCase()}` : 'Plan FREE'}
          </Badge>
        </div>

        {!hasAccess ? (
          <UpgradePrompt />
        ) : (
          <div className="space-y-6">
            <SubToCalculator />

            {/* Coming soon tools */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">Próximamente</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComingSoonCard
                  icon={Calculator}
                  title="Wrap Modeler"
                  description="Modela un wrap mortgage con tasa interna, payoff y arbitrage spread."
                />
                <ComingSoonCard
                  icon={Calculator}
                  title="Seller Finance Analyzer"
                  description="Estructura nota privada con balloon, amortización y rendimiento al seller."
                />
                <ComingSoonCard
                  icon={Calculator}
                  title="Novation Profit Calc"
                  description="Calcula spread entre listing price, ARV y assignment fee en novation."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function UpgradePrompt() {
  return (
    <div className="space-y-4">
      {/* Preview blureado */}
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-60">
          <SubToCalculator />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="max-w-md mx-4 border-primary/30 shadow-xl">
            <CardContent className="pt-6 pb-6 space-y-4 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Herramientas Pro
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Las calculadoras avanzadas están disponibles en los planes{' '}
                  <strong className="text-foreground">Pro</strong> y{' '}
                  <strong className="text-foreground">Elite</strong>.
                </p>
              </div>
              <ul className="text-left text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Calculadora Sub-To completa (equity, MAO, DSCR)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Wrap Modeler & Seller Finance Analyzer</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Acceso completo a Creative Finance Mastery</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/settings">Hacer upgrade a Pro</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Calculator;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Badge variant="outline" className="text-xs">
            <Construction className="h-3 w-3 mr-1" />
            Próximamente
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
