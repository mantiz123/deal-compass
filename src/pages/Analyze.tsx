import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section8UnderwritingCard } from '@/components/properties/Section8UnderwritingCard';
import { ArrowRight, Shield, TrendingUp, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Analyze() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Section 8 Deal Analyzer — Calculadora gratis | Klose</title>
        <meta
          name="description"
          content="Analiza cualquier propiedad de Section 8 en Alabama: cashflow, DSCR, cap rate y cash-on-cash en segundos. HUD FMR FY2026."
        />
        <link rel="canonical" href="https://goklose.com/analyze" />
      </Helmet>

      {/* Header público */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            KLOSE
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">
                Crear cuenta gratis <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground mb-4">
            <Shield className="h-3 w-3" /> HUD FMR FY2026 · Alabama
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            Analiza cualquier deal de <span className="text-primary">Section 8</span> en segundos
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Cashflow real, DSCR, cap rate y cash-on-cash con datos oficiales HUD y defaults de
            Alabama. Sin registro, sin costo.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 max-w-2xl">
          <MiniFeature icon={<Home className="h-4 w-4" />} title="HUD FMR" desc="Renta oficial por ZIP" />
          <MiniFeature icon={<TrendingUp className="h-4 w-4" />} title="DSCR" desc="Califica financiamiento" />
          <MiniFeature icon={<Shield className="h-4 w-4" />} title="Semáforo" desc="GO / CAUTION / PASS" />
        </div>
      </section>

      {/* Calculadora */}
      <section className="max-w-4xl mx-auto px-4 pb-10">
        <Section8UnderwritingCard />
      </section>

      {/* CTA final */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <Card variant="glass" className="p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            Guarda este análisis y compara escenarios
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-lg mx-auto">
            Crea una cuenta gratis para persistir tus análisis, comparar propiedades y desbloquear
            el buscador Section 8, comps y checklist HQS.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">
              Crear cuenta gratis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Klose LLC — Data: HUD FMR FY2026 (efectivo 1-oct-2025).
      </footer>
    </div>
  );
}

function MiniFeature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium mb-0.5">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </div>
  );
}
