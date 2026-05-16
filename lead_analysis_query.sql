-- ============================================================
-- KLOSE Lead Analysis — Alabama 65% MAO Formula
-- Corre esto en: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- INSTRUCCIONES:
--   1. Ve a supabase.com/dashboard → tu proyecto → SQL Editor
--   2. Pega este query completo y corre con "Run"
--   3. Exporta resultado con el botón CSV de la esquina derecha
--
-- Viability:
--   🟢 Verde    = assignment_fee_potential >= $8,000
--   🟡 Amarillo = $5,000 – $7,999
--   ⬜ Sin oferta = MAO calculado pero sin oferta aún
--   🔴 Rojo     = < $5,000 o sin datos suficientes
-- ============================================================

WITH buyer_milan AS (
  SELECT id, contact_name, min_arv, max_arv,
         preferred_property_types, preferred_zip_codes
  FROM buyers
  WHERE LOWER(contact_name) LIKE '%milan%'
     OR LOWER(company_name) LIKE '%milan%'
  LIMIT 1
),
buyer_juan AS (
  SELECT id, contact_name, min_arv, max_arv,
         preferred_property_types, preferred_zip_codes
  FROM buyers
  WHERE LOWER(contact_name) LIKE '%juan%'
     OR LOWER(company_name) LIKE '%juan%'
  LIMIT 1
),
lead_data AS (
  SELECT
    l.id,
    l.status,
    l.piw_score,
    l.offer_amount,
    l.assignment_fee,
    l.listing_price,
    l.last_contact_at,
    p.address,
    p.city,
    p.zip_code,
    p.arv,
    p.repair_cost,
    p.mao              AS mao_stored,
    p.equity_percent,
    p.bedrooms,
    p.bathrooms,
    p.sqft,
    p.property_type,
    p.property_condition,
    p.is_foreclosure,
    p.is_vacant,
    p.tax_delinquent,
    p.owner_name,
    -- ── Alabama MAO: 65% rule ──────────────────────────────
    CASE
      WHEN p.mao IS NOT NULL AND p.mao > 0 THEN p.mao
      WHEN p.arv IS NOT NULL AND p.arv > 0 THEN
        GREATEST(0, ROUND(p.arv * 0.65 - COALESCE(p.repair_cost, 0)))
      ELSE NULL
    END AS mao_al,
    -- ── ARV estimado desde sqft cuando no hay ARV manual ──
    CASE
      WHEN p.arv IS NOT NULL AND p.arv > 0 THEN p.arv
      WHEN p.sqft IS NOT NULL AND p.sqft > 0 THEN
        ROUND(p.sqft * CASE
          WHEN UPPER(COALESCE(p.property_condition,'')) SIMILAR TO '%(GOOD|EXCEL|RENOV|UPDATED)%' THEN 75
          WHEN UPPER(COALESCE(p.property_condition,'')) SIMILAR TO '%(FAIR|POOR|DIST|NEEDS)%'    THEN 45
          ELSE 60
        END)
      ELSE NULL
    END AS arv_eff
  FROM leads l
  LEFT JOIN properties p ON p.id = l.property_id
  WHERE l.archived_at IS NULL
    AND l.status NOT IN ('cerrado')
),
with_calcs AS (
  SELECT
    ld.*,
    -- ── Assignment fee potential ───────────────────────────
    CASE
      WHEN ld.mao_al IS NOT NULL AND ld.offer_amount IS NOT NULL AND ld.offer_amount > 0
        THEN ROUND(ld.mao_al - ld.offer_amount)
      ELSE NULL
    END AS fee_potential,
    -- ── Viability color ────────────────────────────────────
    CASE
      WHEN ld.mao_al IS NULL THEN '🔴 Rojo'
      WHEN ld.offer_amount > 0 AND (ld.mao_al - ld.offer_amount) >= 8000 THEN '🟢 Verde'
      WHEN ld.offer_amount > 0 AND (ld.mao_al - ld.offer_amount) >= 5000 THEN '🟡 Amarillo'
      WHEN ld.offer_amount > 0 THEN '🔴 Rojo'
      WHEN ld.mao_al > 0 THEN '⬜ Sin oferta'
      ELSE '🔴 Rojo'
    END AS viability,
    -- ── Buyer Milan match ──────────────────────────────────
    CASE
      WHEN bm.id IS NULL THEN '? (no encontrado)'
      WHEN (bm.preferred_property_types IS NULL OR ld.property_type::text = ANY(bm.preferred_property_types::text[]))
        AND COALESCE(ld.arv_eff, 0) BETWEEN COALESCE(bm.min_arv, 0) AND COALESCE(bm.max_arv, 9999999)
        AND (bm.preferred_zip_codes IS NULL OR ld.zip_code = ANY(bm.preferred_zip_codes))
      THEN 'SÍ ✓'
      ELSE 'No'
    END AS milan,
    -- ── Buyer Juan match ───────────────────────────────────
    CASE
      WHEN bj.id IS NULL THEN '? (no encontrado)'
      WHEN (bj.preferred_property_types IS NULL OR ld.property_type::text = ANY(bj.preferred_property_types::text[]))
        AND COALESCE(ld.arv_eff, 0) BETWEEN COALESCE(bj.min_arv, 0) AND COALESCE(bj.max_arv, 9999999)
        AND (bj.preferred_zip_codes IS NULL OR ld.zip_code = ANY(bj.preferred_zip_codes))
      THEN 'SÍ ✓'
      ELSE 'No'
    END AS juan,
    -- ── Próxima acción ─────────────────────────────────────
    CASE
      WHEN ld.status = 'captacion' AND ld.piw_score >= 75 THEN 'LLAMAR HOY — K-Score caliente'
      WHEN ld.status = 'captacion' THEN 'Enviar SMS / email outreach'
      WHEN ld.status = 'contacto'  AND ld.offer_amount IS NULL THEN 'Hacer oferta ahora'
      WHEN ld.status = 'contacto'  AND ld.offer_amount IS NOT NULL THEN 'Negociar y hacer seguimiento'
      WHEN ld.status = 'bajo_contrato' THEN '🔥 Enviar deal package a buyers'
      WHEN ld.status = 'cesion' THEN 'Coordinar cierre con título'
      ELSE 'Revisar status'
    END AS next_action
  FROM lead_data ld
  CROSS JOIN (SELECT * FROM buyer_milan) bm
  CROSS JOIN (SELECT * FROM buyer_juan)  bj
)
SELECT
  address || ', ' || COALESCE(city,'') || COALESCE(' (' || zip_code || ')','') AS propiedad,
  status,
  COALESCE(piw_score::text, '—')                                               AS k_score,
  CASE WHEN arv_eff IS NOT NULL THEN '$' || TO_CHAR(arv_eff,'FM999,999')
       ELSE '—' END
    || CASE WHEN arv IS NULL AND arv_eff IS NOT NULL THEN ' (est.)' ELSE '' END AS arv,
  CASE WHEN repair_cost IS NOT NULL THEN '$' || TO_CHAR(repair_cost,'FM999,999')
       ELSE '—' END                                                             AS repairs,
  CASE WHEN mao_al IS NOT NULL THEN '$' || TO_CHAR(mao_al,'FM999,999')
       ELSE '—' END                                                             AS mao_65pct,
  CASE WHEN offer_amount IS NOT NULL THEN '$' || TO_CHAR(offer_amount,'FM999,999')
       ELSE '—' END                                                             AS oferta,
  CASE WHEN fee_potential IS NOT NULL THEN '$' || TO_CHAR(fee_potential,'FM999,999')
       ELSE '—' END                                                             AS fee_potencial,
  viability,
  milan,
  juan,
  next_action AS proxima_accion
FROM with_calcs
ORDER BY
  CASE viability
    WHEN '🟢 Verde'     THEN 1
    WHEN '🟡 Amarillo'  THEN 2
    WHEN '⬜ Sin oferta' THEN 3
    ELSE 4
  END,
  fee_potential DESC NULLS LAST,
  k_score       DESC NULLS LAST;
