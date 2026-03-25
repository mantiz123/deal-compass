import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Target, 
  Phone, 
  FileText, 
  Users, 
  DollarSign,
  Upload,
  Brain,
  MessageSquare,
  Zap,
  AlertTriangle,
  TrendingUp,
  Building2,
  Search,
  Calculator,
  ClipboardCheck
} from "lucide-react";

const steps = [
  {
    phase: "Fase 1: Captación de Leads",
    icon: Search,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Encontrar propiedades con vendedores motivados",
    steps: [
      {
        title: "Descargar datos de PropWire",
        description: "Usa PropWire para descargar hasta 10,000 propiedades/mes con filtros de motivación",
        where: "PropWire → Export CSV",
        tips: [
          "Filtra por: 90+ días en MLS, $50K+ en reparaciones, urgencia de cierre",
          "Enfócate en condados de Alabama con alta actividad",
          "Busca señales: tax delinquent, probate, foreclosure, absentee owner"
        ]
      },
      {
        title: "Importar CSV a KLOSE",
        description: "Sube el archivo CSV para crear leads automáticamente",
        where: "Menú → Importar → Subir CSV",
        tips: [
          "El sistema mapea automáticamente las columnas de PropWire",
          "Se calculan K-Scores automáticamente para cada lead",
          "Se detectan duplicados por dirección + ZIP"
        ]
      },
      {
        title: "Revisar Leads del Día",
        description: "Consulta los 10 leads con mayor potencial de ganancia",
        where: "Dashboard → Leads del Día",
        tips: [
          "Ordenados por Spread (ganancia potencial) descendente",
          "K-Score ≥80% = HOT (alta probabilidad de cierre)",
          "Prioriza los que tienen más indicadores de motivación"
        ]
      }
    ]
  },
  {
    phase: "Fase 2: Calificación y Enriquecimiento",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Analizar y enriquecer datos antes de contactar",
    steps: [
      {
        title: "Enriquecer con datos de listing",
        description: "Copia/pega datos de Zillow, Realtor o Redfin para extraer información",
        where: "Lead → Pestaña Listing Parser",
        tips: [
          "El AI extrae automáticamente: precio, beds, baths, sqft, año",
          "Detecta señales de motivación en la descripción",
          "Estima costos de reparación automáticamente"
        ]
      },
      {
        title: "Agregar Comps manualmente",
        description: "Busca ventas comparables recientes para calcular ARV preciso",
        where: "Lead → Pestaña Comps",
        tips: [
          "Busca 3-5 propiedades similares vendidas en últimos 6 meses",
          "Misma zona, tamaño similar (±20% sqft), condición similar",
          "El sistema calcula promedio $/sqft automáticamente"
        ]
      },
      {
        title: "Ingresar datos de mercado",
        description: "Completa información demográfica y de vecindario",
        where: "Lead → Pestaña Mercado",
        tips: [
          "Renta estimada mensual (busca en Rentometer o Zillow)",
          "Walkability y School Scores (Walk Score, GreatSchools)",
          "Ingreso medio del área (Census.gov)"
        ]
      },
      {
        title: "Generar Análisis AI",
        description: "Obtén recomendación de inversión inteligente",
        where: "Lead → Pestaña AI Insights → Generar Análisis",
        tips: [
          "Analiza todos los datos y genera recomendación de oferta",
          "Calcula ROI, cap rate, cash flow proyectado",
          "Da veredicto: STRONG BUY, BUY, HOLD, PASS"
        ]
      }
    ]
  },
  {
    phase: "Fase 3: Contacto con Vendedor",
    icon: Phone,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description: "Llamar y registrar conversaciones",
    steps: [
      {
        title: "Preparar antes de llamar",
        description: "Revisa todos los datos del lead antes de marcar",
        where: "Lead → Vista general",
        tips: [
          "Conoce la situación: ¿foreclosure? ¿probate? ¿tax delinquent?",
          "Ten tu MAO calculado (máximo que puedes ofrecer)",
          "Prepara preguntas sobre motivación y timeline"
        ]
      },
      {
        title: "Hacer la llamada",
        description: "Contacta al vendedor y evalúa su motivación real",
        where: "Teléfono + Lead abierto",
        tips: [
          "Pregunta: ¿Por qué vende? ¿Cuándo necesita cerrar?",
          "Detecta dolor principal: deuda, divorcio, herencia, mudanza",
          "Evalúa flexibilidad de precio: ¿aceptaría oferta cash rápida?"
        ]
      },
      {
        title: "Registrar conversación",
        description: "Documenta los insights de la llamada para ajustar K-Score",
        where: "Lead → Pestaña Conversaciones → Log Llamada",
        tips: [
          "Nivel de urgencia real (bajo, moderado, alto, desesperado)",
          "Dolor principal detectado",
          "Objeción clave (si hay)",
          "Flexibilidad de precio",
          "El AI ajusta automáticamente el K-Score"
        ]
      },
      {
        title: "Mover en Pipeline",
        description: "Actualiza el estado del lead según resultado",
        where: "Pipeline → Arrastrar tarjeta",
        tips: [
          "Captación → Contacto: después de primera llamada",
          "Contacto → Bajo Contrato: cuando firma contrato",
          "Si no hay interés: considera descartar o nurture"
        ]
      }
    ]
  },
  {
    phase: "Fase 4: Bajo Contrato",
    icon: FileText,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Asegurar el deal con contrato",
    steps: [
      {
        title: "Preparar contrato de compra",
        description: "Genera el contrato con los términos acordados",
        where: "Documento externo (DocuSign/HelloSign)",
        tips: [
          "Precio de compra = tu oferta aceptada",
          "Período de inspección: 14-30 días típico",
          "Cláusula de asignación incluida"
        ]
      },
      {
        title: "Actualizar datos del deal",
        description: "Registra los términos del contrato en el sistema",
        where: "Lead → Campos: Offer Amount, Closing Date, Assignment Fee",
        tips: [
          "Offer Amount: precio acordado con vendedor",
          "Closing Date: fecha límite de cierre",
          "Assignment Fee: tu ganancia proyectada"
        ]
      },
      {
        title: "Mover a Bajo Contrato",
        description: "Actualiza el estado en el pipeline",
        where: "Pipeline → Arrastrar a 'Bajo Contrato'",
        tips: [
          "Solo mueve cuando el contrato esté firmado",
          "Empieza a buscar comprador inmediatamente"
        ]
      }
    ]
  },
  {
    phase: "Fase 5: Cesión a Comprador",
    icon: Users,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    description: "Encontrar comprador y asignar el contrato",
    steps: [
      {
        title: "Generar Deal Package",
        description: "Crea PDF profesional con todos los datos del deal",
        where: "Lead → Generar Deal Package",
        tips: [
          "Incluye fotos, financieros, indicadores de motivación",
          "Muestra Spread y ROI potencial para el comprador",
          "Listo para enviar a tu lista de compradores"
        ]
      },
      {
        title: "Enviar a compradores",
        description: "Distribuye el deal a compradores calificados",
        where: "Buyers → Enviar Deal Package",
        tips: [
          "Filtra por ZIP codes preferidos y tipo de propiedad",
          "Prioriza compradores Platinum/Gold que cierran rápido",
          "El sistema trackea opens y clicks"
        ]
      },
      {
        title: "Negociar y asignar",
        description: "Cierra con el comprador interesado",
        where: "Lead → Actualizar campos",
        tips: [
          "Confirma que el comprador tiene fondos",
          "Firma contrato de asignación",
          "Assignment Fee = tu ganancia"
        ]
      },
      {
        title: "Mover a Cesión",
        description: "Actualiza el pipeline cuando se asigne",
        where: "Pipeline → Arrastrar a 'Cesión'",
        tips: [
          "Ya tienes comprador comprometido",
          "Solo falta el cierre final"
        ]
      }
    ]
  },
  {
    phase: "Fase 6: Cierre y Cobro",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    description: "Cerrar el deal y recibir pago",
    steps: [
      {
        title: "Coordinar cierre",
        description: "Trabaja con title company para cerrar",
        where: "Comunicación externa",
        tips: [
          "Confirma que todos los documentos están listos",
          "Verifica que el comprador tiene fondos en escrow",
          "Coordina fecha de cierre con todas las partes"
        ]
      },
      {
        title: "Registrar pago",
        description: "Documenta el ingreso recibido",
        where: "Payments → Nuevo Pago",
        tips: [
          "Monto = Assignment Fee recibido",
          "Método: wire, check, etc.",
          "Vincula al lead y al Realtor si aplica"
        ]
      },
      {
        title: "Mover a Cerrado",
        description: "Marca el deal como completado",
        where: "Pipeline → Arrastrar a 'Cerrado'",
        tips: [
          "¡Felicidades! Deal completado",
          "Los stats se actualizan automáticamente"
        ]
      }
    ]
  }
];

const keyMetrics = [
  { 
    name: "K-Score", 
    description: "Probabilidad de cierre (0-100%)", 
    interpretation: "≥80% = HOT, 60-79% = WARM, <60% = COLD",
    icon: Target
  },
  { 
    name: "ARV", 
    description: "After Repair Value - Valor después de reparaciones", 
    interpretation: "Calcula con comps o (sqft × $/sqft median)",
    icon: TrendingUp
  },
  { 
    name: "MAO", 
    description: "Maximum Allowable Offer", 
    interpretation: "ARV × 70% - Repair Cost",
    icon: Calculator
  },
  { 
    name: "Spread", 
    description: "Ganancia potencial", 
    interpretation: "MAO - Precio de adquisición",
    icon: DollarSign
  }
];

const motivationIndicators = [
  { name: "Absentee Owner", description: "Propietario no vive en la propiedad", importance: "Alta" },
  { name: "Tax Delinquent", description: "Debe impuestos de propiedad", importance: "Muy Alta" },
  { name: "Foreclosure", description: "En proceso de ejecución hipotecaria", importance: "Muy Alta" },
  { name: "Probate", description: "Herencia/sucesión", importance: "Alta" },
  { name: "Different Mailing", description: "Dirección de correo diferente", importance: "Media" },
  { name: "High Equity", description: ">50% equity en la propiedad", importance: "Alta" },
  { name: "Long Ownership", description: ">10 años como propietario", importance: "Media" }
];

export default function Guide() {
  return (
    <Layout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <ClipboardCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">Guía Operativa Alabama</h1>
              <p className="text-muted-foreground">
                Proceso completo para maximizar probabilidades de cerrar deals
              </p>
            </div>
          </div>
        </div>

        {/* Quick Reference Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((metric) => (
            <Card key={metric.name} className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{metric.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.description}</p>
                <p className="text-xs font-medium text-primary">{metric.interpretation}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Motivation Indicators Reference */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Indicadores de Motivación del Vendedor</CardTitle>
            </div>
            <CardDescription>
              Señales que indican alta probabilidad de venta rápida a precio reducido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {motivationIndicators.map((indicator) => (
                <div 
                  key={indicator.name} 
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-3"
                >
                  <div>
                    <p className="font-medium">{indicator.name}</p>
                    <p className="text-xs text-muted-foreground">{indicator.description}</p>
                  </div>
                  <Badge 
                    variant={indicator.importance === "Muy Alta" ? "destructive" : indicator.importance === "Alta" ? "default" : "secondary"}
                  >
                    {indicator.importance}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Process Steps */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Proceso Paso a Paso</h2>
          
          {steps.map((phase, phaseIndex) => (
            <Card key={phase.phase} className="glass-card overflow-hidden">
              <CardHeader className={phase.bgColor}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-background/80 ${phase.color}`}>
                    <phase.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{phase.phase}</CardTitle>
                    <CardDescription className="text-foreground/70">{phase.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {phase.steps.map((step, stepIndex) => (
                    <div key={step.title} className="relative">
                      {/* Step number and connector */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${phase.color} border-current bg-background font-bold text-sm`}>
                            {stepIndex + 1}
                          </div>
                          {stepIndex < phase.steps.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-2" />
                          )}
                        </div>
                        
                        {/* Step content */}
                        <div className="flex-1 pb-6">
                          <h4 className="font-semibold text-lg">{step.title}</h4>
                          <p className="text-muted-foreground mt-1">{step.description}</p>
                          
                          {/* Where in platform */}
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">{step.where}</span>
                          </div>
                          
                          {/* Tips */}
                          <div className="mt-3 space-y-1.5">
                            {step.tips.map((tip, tipIndex) => (
                              <div key={tipIndex} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Card */}
        <Card className="glass-card border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Resumen: Fórmula del Éxito</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">10,000</div>
                <p className="text-sm text-muted-foreground">Leads de PropWire/mes</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="rounded-lg bg-amber-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-amber-500">10</div>
                <p className="text-sm text-muted-foreground">Leads HOT para contactar hoy</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center">
              <Badge variant="outline" className="text-base px-4 py-1">Importar</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline" className="text-base px-4 py-1">Enriquecer</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline" className="text-base px-4 py-1">Contactar</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline" className="text-base px-4 py-1">Contratar</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline" className="text-base px-4 py-1">Asignar</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="default" className="text-base px-4 py-1">$$$</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
