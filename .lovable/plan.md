# Pivot Plan: Wholesaling CRM → Section 8 Investment Platform

## Nueva visión
Plataforma para inversionistas latinos en real estate Section 8 en USA:
- Buscar y calificar propiedades para Section 8
- Análisis financiero (cashflow, cap rate, DSCR)
- Estimación de rentas HUD / Fair Market Rents (API gratuita)
- Datos de barrio (crime, schools, walkability)
- Estimación de arreglos
- Red de contactos DSCR lenders, PM, contractors
- Links de pago (Stripe) y bank connect (Mercury) — se conservan

---

## Auditoría: qué se queda, adapta o elimina

### ✅ SE QUEDA TAL CUAL (infra core)
- **Auth** (Supabase, roles, approval flow, org multi-tenant)
- **Stripe seamless payments** + `payment_links`, `payments`, `stripe-webhook`, `PayCheckout`, `Cobros`
- **Mercury bank** (si existe, mantener)
- **Resend emails** (`send-outreach-email`, dominio verificado goklose.com)
- **Twilio SMS** (para notificaciones a inversionistas)
- **Lovable AI Gateway** (análisis de propiedad, chat)
- **Storage buckets**: `property-images`, `lead-documents` (renombrable)
- **UI kit** (shadcn, sidebar, layout, theming dark)
- **Landing page nueva** (ya pivotada a Section 8)
- **Legal pages** (Terms, Privacy, Refund)

### 🔄 SE ADAPTA (reusar con cambios)
| Actual | Nuevo propósito |
|---|---|
| `properties` (97 cols) | Property inventory Section 8 — mantener addr, beds, baths, sqft, condition; añadir Section 8 fields |
| `PropertyDetailSheet`, `EditPropertyDialog` | Ficha de inversión con Section 8 metrics |
| `DealCalculator`, `strategyEconomics.ts` | Calculadora DSCR / cashflow / cap rate |
| `property_analyses` + `analyze-property` edge fn | Análisis IA reorientado a Section 8 viability |
| `property_comps`, `PropStreamCMAUploader` | Comps para ARV (útil para BRRRR Section 8) |
| `PropertyImageGallery` | Igual |
| `Import` / CSV importer | Import de propiedades desde MLS/Zillow exports |
| `buyers` table | Renombrar a `investors` — perfil de inversionista (capital, mercados, riesgo) |
| `interactions` + `LeadTimeline` | Timeline de comunicación con inversionista |
| `contracts` + signing wizard | Contratos de management / purchase agreement |
| `Dashboard` widgets | Widgets nuevos: pipeline propiedades, cashflow proyectado, rentas HUD |
| `Sidebar` / `Layout` | Nueva navegación |
| `notifications` | Igual |

### ❌ SE ELIMINA (wholesaling-específico)
- **Leads / wholesaling pipeline**: `leads` (29 cols), `Leads.tsx`, `Pipeline.tsx`, `KanbanBoard`, `LeadDetailSheet`, `NewLeadDialog`, `ArchiveLeadDialog`, `HotLeadsWidget`, `LeadsDelDia`, `useLeadCleanup`, `daily-lead-cleanup`
- **K-Score PIW engine**: `calculate-piw-score`, `batch-recalculate-piw`, `PIWScoreDetails`, `KScoreGauge`, `SkillBreakdown`, memorias K-Score
- **Strategy Engine wholesaling**: `strategy-engine.ts`, `StrategyBattleCard` (sub-to/wrap/novation) — reemplazar con estrategias buy-and-hold / BRRRR / turnkey
- **KCFY** (Klose Closes For You): `kcfy_requests`, `kcfy_status_events`, `AdminKCFY`, `KCFYTimeline`, `RequestKCFYDialog`, `KCFYExecutiveSheet`, edge fns relacionados
- **Deal packages a buyers**: `deal_packages`, `DealPackageGenerator`, `generate-deal-package`, `send-buyer-deal-package`, `track-deal-package`, `DealPackageTracker`, `Tracking.tsx`
- **Seller conversations / voice AI**: `seller_conversations`, `VoiceAgentSheet`, `initiate-outbound-call`, `twilio-media-stream`, `elevenlabs-conversation-token`, `process-seller-reply`, `adjust-piw-score-conversation`
- **Campañas SMS/email outreach a sellers**: `drip_campaigns`, `campaign_sequences`, `campaign_enrollments`, `Campaigns.tsx`, `send-campaign-sms`, `process-sms-sequences`, `generate-outreach-email`, `OutreachEmailGenerator`, `outreach_email_log`, `sms_outreach_log`, `lead_email_drafts`
- **Skip trace / DNC**: `useDNCCheck`, `SkipTraceInput`, `lead_cleanup_log`
- **Realtors module**: `realtors`, `Realtors.tsx`, `useRealtors`, componentes
- **Academy completa**: todas las tablas `academy_*`, `Academy.tsx`, componentes, `create-academy-checkout`, `issue-certificate`, `VerifyCertificate`, `academy-certificates` bucket
- **Training sessions**: `training_sessions`, `Training.tsx`, `analyze-training-call`, `deep-analyze-training`, `agent_demos`, `generate-agent-demo`
- **Contractor agreements / ICA**: `contractor_agreements`, `ContractorAgreement.tsx`, `generate-ica-pdf`, `useICAGuard`, `contractor-agreements` bucket, `Earnings.tsx` (comisiones estudiantes)
- **Buyer liquidity / matchmaking**: `useBuyerLiquidity`, `useBuyerMatchmaking`, `BuyerLiquidityWidget`, `reactivate-buyers`
- **PropStream / Propwire**: `propwire_import_log`, `process-propwire-import`
- **Tools**: `SubToCalculator` (creative finance)
- **Guide, Deals** (wholesaling)

---

## Nuevas features a construir

### 1. Property Intelligence Section 8
- **HUD Fair Market Rents API** (gratis, `huduser.gov`) → renta esperada por ZIP + bedrooms
- **HUD Small Area FMR** (por Census Tract, más preciso)
- **Census API** (gratis) → demografía, median income, poverty rate
- **FBI Crime Data API** (gratis) → seguridad por ciudad
- **GreatSchools** (freemium) o **SchoolDigger** → calidad escolar
- **Walk Score API** (freemium)
- Todo cacheado en tabla `property_market_data`

### 2. Análisis financiero Section 8
- Cashflow: FMR rent − (mortgage PITI + PM 8-10% + vacancy 5% + repairs 5% + capex 5%)
- **Cap rate**, **Cash-on-cash**, **DSCR** (para calificar préstamo)
- Proyección 5/10/20 años con appreciation + rent growth
- Comparación turnkey vs BRRRR

### 3. Rehab estimator Section 8
- Checklist HQS (Housing Quality Standards) — requisitos Section 8
- Estimador por categoría (roof, HVAC, plumbing, paint, flooring)
- Reusar `analyze-property` con nuevo prompt

### 4. DSCR Lender network
- Tabla `dscr_lenders` (name, states, min_loan, max_ltv, min_dscr, rate_range, contact)
- Directorio filtrable por estado/loan size

### 5. Investor pipeline
- `investors` (ex-buyers): capital disponible, mercados target, tipo (turnkey/BRRRR), status
- Match propiedades ↔ investors
- Deal room: enviar oportunidad, tracking de vistas, aceptación

### 6. Payment flow (mantener)
- Stripe payment links para earnest money, PM fees, acquisition fees
- Cobros dashboard

---

## Nueva navegación propuesta
```
Dashboard         → KPIs cashflow, propiedades activas, deals cerrados
Propiedades       → Inventario + análisis Section 8
Análisis          → Calculadora DSCR + proyección
Mercado           → HUD FMR explorer por ZIP
Inversionistas    → CRM de inversionistas
Deal Room         → Oportunidades enviadas
Lenders           → Directorio DSCR
Contratos         → PM / Purchase agreements
Cobros / Pagos    → Stripe links
Ajustes
```

---

## Ejecución por fases (aprobación por fase)

**Fase 0 — Decisiones (necesito tu input)**
1. ¿Mantener multi-tenant orgs o simplificar a un solo workspace tuyo?
2. ¿Migrar datos existentes (buyers → investors) o empezar limpio?
3. ¿Mantener Academy y KCFY archivados o borrar en firme?
4. ¿Idioma UI interno: español, inglés o bilingüe toggle?
5. ¿Enfoque geográfico inicial: solo Alabama, todo USA, o top 5 estados Section 8?

**Fase 1 — Limpieza (destructiva)**
- Drop tablas wholesaling, delete edge functions, remove pages/components/hooks obsoletos
- Backup previo de datos que quieras conservar

**Fase 2 — Data model Section 8**
- Migrations: extender `properties` con campos Section 8 (voucher_zip_fmr, hqs_status, rent_ratio), crear `investors`, `dscr_lenders`, `property_market_data`, `deal_room_sends`
- Rebrand `buyers` → `investors`

**Fase 3 — Integraciones gratis**
- Edge fn `fetch-hud-fmr` (HUD API)
- Edge fn `fetch-census-data`
- Edge fn `fetch-crime-data`
- Cache en `property_market_data`

**Fase 4 — Análisis financiero**
- Nueva calculadora Section 8 (cashflow, DSCR, cap rate, proyección)
- Reemplazar `StrategyBattleCard` con `Section8AnalysisCard`
- Rehab estimator con checklist HQS

**Fase 5 — Investor CRM + Deal Room**
- Perfil investor, matching, envío de deals, tracking

**Fase 6 — DSCR lender directory**
- Seed inicial (10-20 lenders conocidos), filtros

**Fase 7 — Dashboard nuevo + navegación**
- Widgets: pipeline propiedades, cashflow total proyectado, deals cerrados MTD, FMR heatmap

---

## Preguntas antes de arrancar
Confirma Fase 0 (5 decisiones arriba) y te propongo la migración SQL de Fase 1 para tu aprobación explícita. No borro nada sin tu OK.
