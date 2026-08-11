# Fix & Flip Investment Analyzer — Alabama

Reemplazar el enfoque Section 8 / DSCR por un motor de underwriting Fix & Flip con Hard Money, alimentado por el PDF de RPR/MLS.

## Qué revisé en tu PDF (3306 Bonds Ave)

El reporte RPR de 69 páginas es altamente estructurado y extraíble. Del ejemplo saqué:

- List Price $29,000 · 3 hab · 2 baños (1 full + 1 medio) · 1,040 sqft · lote 0.42 ac · 1971 · Zoning R2
- CMA Recommended Offer $101,000 · RVM $138,120 (rango $122.9K–$153.3K) · Price to Est. Value 21%
- Jefferson County · APN 21-00-27-2-000-020.000 · Assessor Market Value $99,700 · Tax anual $999
- Señales de rehab: "No Heat" y "No Air" en listing facts vs "Forced Air Unit" en public records; foundation Wood (public) vs Crawl Space (listing) → discrepancia = red flag automático
- Comparables con Closed Price, Closed Date, Similarity Score (ej. 84), similitudes/diferencias narradas, beds/baths/sqft/lote/año → suficiente para un ARV ponderado real

Conclusión: no hace falta OCR pesado. El PDF trae texto y tablas; con extracción + IA se llenan casi todos los campos que pediste, y lo que no esté se marca `Not Available`.

## Qué se conserva de lo actual

- Auth, organizaciones, roles, aprobación de usuarios
- Stripe / links de pago / Payments / Cobros (intacto)
- Tabla `properties`, imágenes de propiedad, storage
- Contratos y firma electrónica
- Infra de Edge Functions + Lovable AI

## Qué se elimina o archiva

- `Section8UnderwritingCard` (DSCR/cap rate/semáforo Section 8) → se convierte en un módulo secundario "Buy & Hold" dentro de Exit Strategy, no la pantalla principal
- Página pública `/analyze` de Section 8 → se reemplaza por el nuevo Analyzer interno
- `DealCalculator`, `PropStreamCMAUploader`, `analyze-property` (prompt de wholesaling) → reemplazados
- Tablas `hud_fmr_alabama_fy2026`, `hud_fmr_safmr_zip`, `property_underwriting` → quedan solo como fuente opcional de renta estimada para el exit secundario

## Arquitectura nueva

### Base de datos
- `deals` — una fila por propiedad analizada: dirección, datos extraídos (jsonb con `{value, source, confidence}` por campo), pdf_path, stage (`under_analysis | offer | under_contract | rehab | listed | sold | passed`), decisión, score, notas
- `deal_comps` — comparables extraídos: precio, fecha de cierre, distancia, similarity score, beds/baths/sqft/año, status (closed/active/pending), incluido/excluido del ARV + razón
- `deal_scenarios` — cada modelo financiero guardado (Conservative / Base / Aggressive + estructuras de deal), con todos los inputs y outputs
- `deal_checklists` — due diligence, 20 ítems por deal
- Bucket privado `deal-documents` para el PDF original

### Backend
- `extract-property-pdf` — recibe el PDF, extrae texto por página, y con IA devuelve JSON estricto con cada campo etiquetado `FACT | ESTIMATE | ASSUMPTION | USER_INPUT` y su origen. Prohibido inventar: campo ausente = `null` + `Not Available`
- `estimate-rehab` — estimación preliminar por partida (Roof, HVAC, Plumbing, Electrical, Kitchen, Baths, Flooring, Paint, Windows, Doors, Exterior, Foundation, Landscaping, Appliances, Permits, Cleanup, Other) en Low/Mid/High, basada en año, sqft, descripción y condición. Siempre etiquetada "Preliminary estimate — contractor inspection required"
- `generate-investment-memo` — memo final en lenguaje simple: por qué, qué puede salir mal, qué verificar, qué ofrecer, máximo a pagar
- Motor financiero **determinista en TypeScript compartido** (`src/lib/underwriting/`), no en la IA: ARV ponderado, rehab, hard money, holding, selling, MAO, score, red flags. La IA solo extrae y redacta.

### Motor de underwriting (código puro, testeable)
- `comps.ts` — ARV ponderado: peso por status (closed > pending > active), distancia, similarity score, ajuste por $/sqft y antigüedad de la venta. Devuelve ARV Conservative / Base / Optimistic + lista de comps usados y descartados con razón
- `rehab.ts` — partidas Low/Base/High, presets Light / Medium / Full
- `financing.ts` — Hard Money con LTV, LTC, ARV-LTV, tasa, puntos, origination, plazo, extensión, interest-only y balloon. Todo configurable, nada hardcodeado por lender
- `holding.ts` — interés + taxes + seguro + utilities + HOA + mantenimiento + seguridad + jardín, por 3/4/6/9/12 meses
- `selling.ts` — comisión, closing del vendedor, transfer tax, título, abogado, staging, fotos — cada % editable
- `deal.ts` — Total Project Cost, Gross Profit, ROI, Cash-on-Cash, Profit Margin, ROI anualizado
- `mao.ts` — MAO inverso desde ARV con profit deseado y risk buffer, regla del 70% editable, no impuesta
- `capital.ts` — Cash Required vs Cash Available ($30,000 configurable) → Fits / Shortfall
- `structures.ts` — 6 estructuras (Cash, HM purchase-only, HM purchase+rehab, HM + private money, seller financing, híbrido) comparadas lado a lado, marcando la de menor capital propio con margen sano
- `score.ts` — Investment Score 0–100 con los 9 subscores que pediste, cada uno con su justificación numérica
- `liquidity.ts` — Resale Liquidity Score con ventas cerradas, DOM, inventario activo/pendiente, rango de precio
- `redflags.ts` — reglas duras: discrepancias public vs listing (como el No Heat / No Air de esta propiedad), foundation, año, rehab desproporcionado, comps débiles, ARV irreal, capital insuficiente, gap de financiación

### Frontend
- `/deals` — pipeline por etapa con las cifras clave por tarjeta
- `/deals/new` — dropzone "Upload Property PDF" → extracción → revisión editable campo por campo con su etiqueta de origen
- `/deals/:id` — el workspace de underwriting:
  1. Verdict banner: BUY / NEGOTIATE / PASS + Investment Score
  2. KPIs: Purchase, ARV, Rehab, Total Project Cost, Cash Required, Profit, ROI, Max Offer
  3. Comps engine con tabla de comps y toggle incluir/excluir en vivo
  4. Rehab estimator editable por partida
  5. Hard Money + escenarios A/B/C
  6. Holding + Selling
  7. Deal Structure Optimizer (las 6 opciones comparadas)
  8. Capital $30K: Fits / Does Not Fit
  9. Exit strategy: Flip primario, Buy & Hold y Section 8 secundarios (Section 8 solo si hay dato real; si no, "verify with local PHA")
  10. Red Flags, Offer Strategy (Low / Target / Max), Due Diligence Checklist, Investment Memo exportable a PDF
- Diseño: dashboard financiero profesional, tarjetas densas, tablas, barras proporcionales, sin estética de chatbot

### Extensibilidad futura
Capa `src/lib/dataSources/` con interfaz `PropertyDataSource` y un solo provider hoy (`RprPdfSource`). MLS, Zillow, Redfin, crime, flood, rent, Maps y lenders se enchufan después sin tocar el motor.

## Orden de entrega

1. Esquema de BD + bucket + subida y extracción del PDF con revisión editable
2. Motor de underwriting completo en TS + tests con los números reales de 3306 Bonds Ave
3. Pantalla del deal: comps, rehab, hard money, holding, selling, deal calculator, MAO, capital
4. Score, red flags, structures, offer strategy, checklist, memo
5. Pipeline `/deals` y limpieza de Section 8 / DSCR

Cada fase se verifica con datos reales antes de pasar a la siguiente.
