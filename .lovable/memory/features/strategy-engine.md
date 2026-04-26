---
name: Strategy Engine v1
description: Motor determinista que recomienda vehículo financiero (cash/sub-to/wrap/seller-finance/hybrid/novation/pass) por lead, con confianza 0-100 y MAO específico
type: feature
---

# Strategy Engine v1 (Fase 1)

Motor determinista en `supabase/functions/_shared/strategy-engine.ts` que evalúa 6 estrategias por lead:
- **cash** — Wholesale tradicional (70% rule MAO)
- **sub_to** — Asume hipoteca + 10% equity al seller
- **wrap** — Wrap-around (82% ARV, requiere hipoteca + equity 30-70%)
- **seller_finance** — Free & clear preferido (85% ARV)
- **hybrid** — Sub-To + seller carry segundo
- **novation** — Solo listings MLS con spread 15-35%
- **pass** — Cuando ninguna alcanza confianza ≥40

## Output por lead (en tabla `leads`)
- `recommended_strategy` (enum lead_strategy)
- `strategy_confidence` (0-100)
- `strategy_mao` (numeric)
- `strategy_reasons` (jsonb array)
- `alternative_strategies` (jsonb, top 2-3)
- `strategy_disqualifiers` (jsonb, por qué se descartaron las otras)
- `strategy_calculated_at`

## Integración
- `calculate-piw-score` — calcula strategy junto con K-Score por lead
- `batch-recalculate-piw` — recalcula strategy en bulk
- Ambos usan `runStrategyEngine(property, lead)` del módulo compartido

## Próximas fases
- Fase 2: UI "Battle Card" en LeadDetailSheet con scripts por estrategia
- Fase 3: Feedback loop — ajustar pesos según deals cerrados por estrategia
