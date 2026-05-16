// ============================================================
// AGENTE 1 — PROPWIRE PROSPECTOR
// Cron diario 8 AM | process-propwire-import
//
// FLUJO:
//   1. Lee el CSV más reciente de Supabase Storage → bucket "propwire-imports"
//   2. Filtra: Birmingham AL, equity ≥30%, valor $40K-$120K
//   3. Calcula MAO 65% Alabama, PIW score (rule-based), buyer match
//   4. Verifica duplicados → importa leads nuevos en status "captacion"
//   5. Llama Claude Haiku para generar email resumen en español
//   6. Envía email a sergio@goklose.com via Resend
//   7. Registra el run en propwire_import_log
//
// REQUIRED SECRETS (Supabase Dashboard → Settings → Edge Functions):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  ← ya configurados
//   RESEND_API_KEY                            ← ya configurado
//   ANTHROPIC_API_KEY                         ← nuevo, agregar
//
// SETUP MANUAL (una sola vez):
//   1. Supabase Storage → New bucket → "propwire-imports" (private)
//   2. Exportar CSV de Propwire → subir al bucket
//   3. La función procesa el más reciente no procesado
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const BUCKET = "propwire-imports";
const NOTIFY_EMAIL = "sergio@goklose.com";
const FROM_EMAIL = "KLOSE Imports <imports@goklose.com>";

// ── Filters ─────────────────────────────────────────────────
const FILTER_CITY = "birmingham";
const FILTER_STATE = "al";
const FILTER_MIN_EQUITY_PCT = 30;
const FILTER_MIN_VALUE = 40_000;
const FILTER_MAX_VALUE = 120_000;

// ── Types ────────────────────────────────────────────────────
interface PropwireRow {
  address: string;
  city: string;
  state: string;
  zip: string;
  owner_name: string;
  estimated_value: string;
  equity_pct: string;
  mortgage_balance: string;
  property_type: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  year_built: string;
  is_absentee_owner: string;
  is_foreclosure: string;
  tax_delinquent: string;
  is_vacant: string;
  owner_phone: string;
  phone_2: string;
  phone_3: string;
  owner_email: string;
}

interface ImportedLead {
  address: string;
  city: string;
  arv: number;
  mao: number;
  piwScore: number;
  distress: string[];
  milan: boolean;
  juan: boolean;
}

// ── CSV parser (handles quoted fields, escaped quotes) ───────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headers = parseCSVLine(lines[0] || "");
  const rows = lines.slice(1).filter(l => l.trim()).map(parseCSVLine);
  return { headers, rows };
}

// ── Propwire column aliases (handles different export formats) ──
const COL_ALIASES: Record<keyof PropwireRow, string[]> = {
  address:          ["Property Address", "Address", "Street Address", "Street"],
  city:             ["City", "Property City"],
  state:            ["State", "Property State"],
  zip:              ["Zip Code", "Zip", "ZIP", "Postal Code"],
  owner_name:       ["Owner Name", "Full Name", "Owner Full Name"],
  estimated_value:  ["Estimated Value", "Est. Value", "AVM", "Property Value", "Estimated ARV", "Estimated Market Value"],
  equity_pct:       ["Estimated Equity %", "Equity %", "Equity Percent", "Est. Equity %", "Equity Percentage"],
  mortgage_balance: ["Estimated Mortgage Balance", "Open Mortgage Balance", "Mortgage Balance", "Est. Mortgage Balance"],
  property_type:    ["Property Type", "Type", "Land Use"],
  bedrooms:         ["Bedrooms", "Beds", "BD", "Bed", "# Bedrooms", "Bedroom Count"],
  bathrooms:        ["Bathrooms", "Baths", "BA", "Bath", "# Bathrooms", "Bathroom Count"],
  sqft:             ["Square Footage", "Sq Ft", "Living Sq Ft", "Sqft", "Square Feet", "Living Area Sq Ft"],
  year_built:       ["Year Built", "YearBuilt", "Year_Built", "Built Year"],
  is_absentee_owner:["Absentee Owner", "Out Of State Owner", "Absentee", "Absentee Indicator"],
  is_foreclosure:   ["Pre-Foreclosure", "Foreclosure", "In Foreclosure", "Pre Foreclosure", "Foreclosure Indicator"],
  tax_delinquent:   ["Tax Delinquent", "Delinquent Taxes", "Tax_Delinquent", "Tax Delinquent Indicator"],
  is_vacant:        ["Vacant", "Vacant Property", "Vacancy", "Vacant Indicator"],
  owner_phone:      ["Phone 1", "Primary Phone", "Phone", "Tel 1", "Owner Phone"],
  phone_2:          ["Phone 2", "Secondary Phone", "Tel 2"],
  phone_3:          ["Phone 3", "Tel 3"],
  owner_email:      ["Email 1", "Email", "Owner Email", "Contact Email"],
};

function buildColMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const normalizedHeaders = headers.map(h => h.trim());
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalizedHeaders.findIndex(h => h.toLowerCase() === alias.toLowerCase());
      if (idx !== -1) { map[field] = idx; break; }
    }
  }
  return map;
}

function getField(row: string[], colMap: Record<string, number>, field: string): string {
  const idx = colMap[field];
  return idx !== undefined ? (row[idx] || "") : "";
}

function mapRow(row: string[], colMap: Record<string, number>): PropwireRow {
  const g = (f: string) => getField(row, colMap, f);
  return {
    address: g("address"), city: g("city"), state: g("state"), zip: g("zip"),
    owner_name: g("owner_name"), estimated_value: g("estimated_value"),
    equity_pct: g("equity_pct"), mortgage_balance: g("mortgage_balance"),
    property_type: g("property_type"), bedrooms: g("bedrooms"),
    bathrooms: g("bathrooms"), sqft: g("sqft"), year_built: g("year_built"),
    is_absentee_owner: g("is_absentee_owner"), is_foreclosure: g("is_foreclosure"),
    tax_delinquent: g("tax_delinquent"), is_vacant: g("is_vacant"),
    owner_phone: g("owner_phone"), phone_2: g("phone_2"),
    phone_3: g("phone_3"), owner_email: g("owner_email"),
  };
}

// ── Value helpers ────────────────────────────────────────────
function csvBool(val: string): boolean {
  const s = (val || "").trim().toLowerCase();
  return s === "y" || s === "yes" || s === "1" || s === "true" || s === "x";
}

function csvNum(val: string): number | null {
  if (!val || !val.trim()) return null;
  const n = parseFloat(val.replace(/[$,%\s,]/g, ""));
  return isNaN(n) ? null : n;
}

function mapPropertyType(raw: string): "single_family" | "multi_family" | "condo" | "townhouse" | "land" | "commercial" {
  const s = (raw || "").toLowerCase();
  if (s.includes("single") || s.includes("sfr") || s.includes("residential")) return "single_family";
  if (s.includes("multi") || s.includes("duplex") || s.includes("triplex") || s.includes("quadplex")) return "multi_family";
  if (s.includes("condo") || s.includes("condominium")) return "condo";
  if (s.includes("town")) return "townhouse";
  if (s.includes("land") || s.includes("lot") || s.includes("vacant land")) return "land";
  if (s.includes("commercial")) return "commercial";
  return "single_family";
}

// ── Alabama MAO ──────────────────────────────────────────────
function calcMao(arv: number | null, repairs: number | null): number | null {
  if (!arv || arv <= 0) return null;
  const r = repairs && repairs > 0 ? repairs : 0;
  const mao = Math.round(arv * 0.65 - r);
  return mao > 0 ? mao : null;
}

// ── Rule-based PIW score (free, no AI — user can click Recalcular later) ──
function calcPiwScore(row: PropwireRow): { score: number; factors: Record<string, unknown> } {
  const isForeclosure = csvBool(row.is_foreclosure);
  const isTaxDelinquent = csvBool(row.tax_delinquent);
  const isVacant = csvBool(row.is_vacant);
  const isAbsentee = csvBool(row.is_absentee_owner);
  const equity = csvNum(row.equity_pct) ?? 0;
  const arv = csvNum(row.estimated_value) ?? 0;

  // Seller motivation (max 40)
  let motivation = 0;
  if (isForeclosure)    motivation += 25;
  else if (isTaxDelinquent) motivation += 18;
  if (isVacant)         motivation += 12;
  if (isAbsentee)       motivation += 8;
  motivation = Math.min(motivation, 40);

  // Financial viability (max 35)
  let financial = 0;
  if (equity >= 70)           financial += 20;
  else if (equity >= 50)      financial += 15;
  else if (equity >= 30)      financial += 8;
  if (arv >= 40_000 && arv <= 80_000)  financial += 10;
  else if (arv > 80_000 && arv <= 120_000) financial += 5;
  financial = Math.min(financial, 35);

  // Closing ease (max 25)
  const distressCount = [isForeclosure, isTaxDelinquent, isVacant, isAbsentee].filter(Boolean).length;
  const closing = distressCount >= 2 ? 20 : distressCount === 1 ? 15 : 10;

  const score = Math.min(motivation + financial + closing, 100);
  return {
    score,
    factors: {
      method: "rule_based_import",
      seller_motivation_score: motivation,
      financial_viability_score: financial,
      closing_difficulty_score: closing,
      is_foreclosure: isForeclosure,
      tax_delinquent: isTaxDelinquent,
      is_vacant: isVacant,
      is_absentee_owner: isAbsentee,
      equity_pct: equity,
    },
  };
}

// ── Buyer match ──────────────────────────────────────────────
function calcBuyerMatch(row: PropwireRow, arv: number) {
  const propType = mapPropertyType(row.property_type);
  const isSFR = propType === "single_family";
  const beds = csvNum(row.bedrooms) ?? 0;
  const baths = csvNum(row.bathrooms) ?? 0;
  const sqft = csvNum(row.sqft) ?? 0;

  // Milan: SFR Birmingham, 3+ bed, 1+ bath, ≥1000 sqft, ARV $40K-$80K
  const milan = isSFR && beds >= 3 && baths >= 1 && (sqft === 0 || sqft >= 1000) && arv >= 40_000 && arv <= 80_000;

  // Juan: SFR or small multi-family, fix&flip/rental, $40K-$120K
  const juan = (isSFR || propType === "multi_family") && arv >= 40_000 && arv <= 120_000;

  return { milan, juan };
}

// ── Claude Haiku: generate Spanish summary email ─────────────
async function generateEmailBody(
  fileName: string,
  stats: { total: number; filtered: number; skipped: number; imported: number },
  topLeads: ImportedLead[]
): Promise<string> {
  if (!ANTHROPIC_KEY) {
    // Fallback: plain text summary without AI
    const topText = topLeads.map((l, i) =>
      `${i + 1}. ${l.address}, ${l.city}\n   Score: ${l.piwScore}/100 | MAO: $${l.mao.toLocaleString()} | ARV: $${l.arv.toLocaleString()}\n   Señales: ${l.distress.join(", ") || "Ninguna"}\n   Buyers: ${[l.milan && "Milan", l.juan && "Juan"].filter(Boolean).join(", ") || "Ninguno"}`
    ).join("\n\n");

    return `REPORTE DE IMPORTACIÓN — KLOSE\n\nArchivo: ${fileName}\n\nRESUMEN:\n✅ ${stats.imported} leads importados\n⏭️ ${stats.skipped} duplicados saltados\n📋 ${stats.filtered} pasaron filtros de ${stats.total} en CSV\n\nTOP ${topLeads.length} LEADS:\n\n${topText}\n\n---\nVer leads: goklose.com`;
  }

  const leadsContext = topLeads.map((l, i) =>
    `${i + 1}. ${l.address}, ${l.city} — Score: ${l.piwScore}/100 — MAO: $${l.mao.toLocaleString()} — ARV: $${l.arv.toLocaleString()} — Señales: ${l.distress.join(", ") || "Ninguna"} — Buyers: ${[l.milan && "Milan ✓", l.juan && "Juan ✓"].filter(Boolean).join(", ") || "Ninguno"}`
  ).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `Eres el asistente de importación de KLOSE LLC. Genera un email resumen BREVE y ACCIONABLE en español para Sergio.

DATOS:
Archivo: ${fileName}
Importados hoy: ${stats.imported} leads nuevos
Duplicados saltados: ${stats.skipped}
Pasaron filtros: ${stats.filtered} de ${stats.total} en CSV

TOP LEADS:
${leadsContext}

Formato deseado: texto plano (no markdown). Máximo 200 palabras. Tono directo y profesional. Termina con "Ver todos en goklose.com".`,
      }],
    }),
  });

  if (!res.ok) {
    console.error("Claude Haiku error:", res.status, await res.text());
    // Return plain fallback
    return `${stats.imported} leads importados de Propwire. Top leads:\n${leadsContext}\n\nVer todos en goklose.com`;
  }

  const json = await res.json();
  return json.content?.[0]?.text || `${stats.imported} leads importados. Ver goklose.com`;
}

// ── Send email via Resend ────────────────────────────────────
async function sendSummaryEmail(subject: string, body: string): Promise<boolean> {
  if (!RESEND_KEY) {
    console.warn("RESEND_API_KEY not set — email skipped");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [NOTIFY_EMAIL],
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return false;
  }
  return true;
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = new Date().toISOString();

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetFile = body.file_name as string | undefined;

    // ── 1. Find CSV to process ────────────────────────────────
    const { data: files, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list("", { sortBy: { column: "created_at", order: "desc" }, limit: 20 });

    if (listErr) throw new Error(`Storage list error: ${listErr.message}`);

    const csvFiles = (files || []).filter(f => f.name.toLowerCase().endsWith(".csv"));
    if (csvFiles.length === 0) {
      console.log("No CSV files found in bucket — nothing to process");
      return new Response(JSON.stringify({ status: "no_files" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick target file or most recent
    const fileToProcess = targetFile
      ? csvFiles.find(f => f.name === targetFile) ?? csvFiles[0]
      : csvFiles[0];

    // Check if already processed today
    const today = new Date().toISOString().slice(0, 10);
    const { data: alreadyRan } = await supabase
      .from("propwire_import_log")
      .select("id")
      .eq("file_name", fileToProcess.name)
      .gte("imported_at", `${today}T00:00:00Z`)
      .maybeSingle();

    if (alreadyRan && !body.force) {
      console.log(`File ${fileToProcess.name} already processed today`);
      return new Response(JSON.stringify({ status: "already_processed", file: fileToProcess.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Download and parse CSV ─────────────────────────────
    const { data: fileData, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(fileToProcess.name);

    if (dlErr || !fileData) throw new Error(`Download error: ${dlErr?.message}`);
    const csvText = await fileData.text();
    const { headers: csvHeaders, rows } = parseCSV(csvText);
    const colMap = buildColMap(csvHeaders);

    console.log(`Parsing ${rows.length} rows from ${fileToProcess.name}`);

    // ── 3. Process rows ───────────────────────────────────────
    let totalInCsv = 0;
    let passedFilters = 0;
    let duplicatesSkipped = 0;
    let importedCount = 0;
    const importedLeads: ImportedLead[] = [];

    for (const row of rows) {
      if (row.length < 3) continue;
      totalInCsv++;

      const r = mapRow(row, colMap);

      // Filter: Birmingham AL
      if (r.city.toLowerCase().trim() !== FILTER_CITY) continue;
      if (r.state.toLowerCase().trim() !== FILTER_STATE) continue;
      if (!r.address.trim()) continue;

      // Filter: equity and value
      const arv = csvNum(r.estimated_value) ?? 0;
      const equity = csvNum(r.equity_pct) ?? 0;
      if (arv < FILTER_MIN_VALUE || arv > FILTER_MAX_VALUE) continue;
      if (equity < FILTER_MIN_EQUITY_PCT) continue;

      passedFilters++;

      // Dedup: check by address + zip_code
      const zip = r.zip.trim();
      const addressClean = r.address.trim().toLowerCase();
      const { count: existCount } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .ilike("address", addressClean)
        .eq("zip_code", zip);

      if ((existCount ?? 0) > 0) {
        duplicatesSkipped++;
        continue;
      }

      // ── Insert property ───────────────────────────────────
      const repairs = null; // Propwire doesn't export repair estimates
      const mao = calcMao(arv, repairs);
      const propType = mapPropertyType(r.property_type);
      const isForeclosure = csvBool(r.is_foreclosure);
      const isTaxDelinquent = csvBool(r.tax_delinquent);
      const isVacant = csvBool(r.is_vacant);
      const isAbsentee = csvBool(r.is_absentee_owner);
      const mortgageBalance = csvNum(r.mortgage_balance);
      const equityNum = csvNum(r.equity_pct);

      const propertyInsert: Record<string, unknown> = {
        address: r.address.trim(),
        city: r.city.trim(),
        state: "AL",
        zip_code: zip,
        property_type: propType,
        bedrooms: csvNum(r.bedrooms) ? Math.round(csvNum(r.bedrooms)!) : null,
        bathrooms: csvNum(r.bathrooms),
        sqft: csvNum(r.sqft) ? Math.round(csvNum(r.sqft)!) : null,
        year_built: csvNum(r.year_built) ? Math.round(csvNum(r.year_built)!) : null,
        arv: arv > 0 ? arv : null,
        mao: mao,
        equity_percent: equityNum,
        owner_name: r.owner_name.trim() || null,
        owner_phone: r.owner_phone.trim() || null,
        owner_email: r.owner_email.trim() || null,
        is_absentee_owner: isAbsentee,
        // Extended distress fields (added in later migrations)
        is_foreclosure: isForeclosure,
        is_vacant: isVacant,
        tax_delinquent: isTaxDelinquent,
        mortgage_balance: mortgageBalance,
      };

      // Include multi-phone if available
      if (r.phone_2.trim()) (propertyInsert as any).phone_2 = r.phone_2.trim();
      if (r.phone_3.trim()) (propertyInsert as any).phone_3 = r.phone_3.trim();

      const { data: newProp, error: propErr } = await supabase
        .from("properties")
        .insert(propertyInsert)
        .select("id")
        .single();

      if (propErr || !newProp) {
        console.error(`Property insert failed for ${r.address}:`, propErr?.message);
        continue;
      }

      // ── Insert lead ───────────────────────────────────────
      const { score: piwScore, factors } = calcPiwScore(r);
      const { milan, juan } = calcBuyerMatch(r, arv);

      const { error: leadErr } = await supabase.from("leads").insert({
        property_id: newProp.id,
        status: "captacion",
        piw_score: piwScore,
        piw_score_factors: {
          ...factors,
          buyer_milan: milan,
          buyer_juan: juan,
        },
        source: "propwire_import",
      });

      if (leadErr) {
        console.error(`Lead insert failed for ${r.address}:`, leadErr.message);
        // Rollback property to avoid orphans
        await supabase.from("properties").delete().eq("id", newProp.id);
        continue;
      }

      importedCount++;

      // Track for summary
      const distress: string[] = [];
      if (isForeclosure)    distress.push("Foreclosure");
      if (isTaxDelinquent)  distress.push("Tax Delinquent");
      if (isVacant)         distress.push("Vacant");
      if (isAbsentee)       distress.push("Absentee Owner");

      importedLeads.push({
        address: r.address.trim(),
        city: r.city.trim(),
        arv,
        mao: mao ?? 0,
        piwScore,
        distress,
        milan,
        juan,
      });
    }

    // ── 4. Top 3 by PIW score ─────────────────────────────────
    const topLeads = [...importedLeads]
      .sort((a, b) => b.piwScore - a.piwScore)
      .slice(0, 3);

    // ── 5 & 6. Generate + send email ──────────────────────────
    let emailSent = false;
    const today2 = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const subject = `📊 KLOSE Import ${today2}: ${importedCount} leads nuevos`;

    if (importedCount > 0 || passedFilters > 0) {
      const emailBody = await generateEmailBody(
        fileToProcess.name,
        { total: totalInCsv, filtered: passedFilters, skipped: duplicatesSkipped, imported: importedCount },
        topLeads
      );
      emailSent = await sendSummaryEmail(subject, emailBody);
    }

    // ── 7. Log the run ────────────────────────────────────────
    await supabase.from("propwire_import_log").insert({
      file_name: fileToProcess.name,
      imported_at: startedAt,
      total_in_csv: totalInCsv,
      passed_filters: passedFilters,
      duplicates_skipped: duplicatesSkipped,
      imported_count: importedCount,
      top_leads: topLeads,
      email_sent: emailSent,
    });

    const result = {
      status: "success",
      file: fileToProcess.name,
      total_in_csv: totalInCsv,
      passed_filters: passedFilters,
      duplicates_skipped: duplicatesSkipped,
      imported_count: importedCount,
      email_sent: emailSent,
      top_leads: topLeads,
    };

    console.log("Import complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("process-propwire-import fatal error:", msg);

    // Log failed run
    await supabase.from("propwire_import_log").insert({
      file_name: "unknown",
      imported_at: startedAt,
      error_message: msg,
    }).catch(() => {});

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
