import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DealPackageRequest {
  lead_id: string;
  assignment_fee?: number;
  terms?: string;
}

function drawWrappedText(page: any, text: string, x: number, y: number, font: any, size: number, maxWidth: number, color: any) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
      page.drawText(line.trim(), { x, y: currentY, size, font, color });
      currentY -= size + 4;
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    page.drawText(line.trim(), { x, y: currentY, size, font, color });
    currentY -= size + 4;
  }
  return currentY;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, assignment_fee, terms } = await req.json() as DealPackageRequest;
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*, property:properties(*)")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const property = lead.property;
    const pdfDoc = await PDFDocument.create();
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const W = 612, H = 792, M = 50;
    const CW = W - M * 2;
    const primary = rgb(0.06, 0.53, 0.53);
    const text = rgb(0.2, 0.2, 0.2);
    const gray = rgb(0.5, 0.5, 0.5);
    const green = rgb(0.13, 0.55, 0.13);
    const red = rgb(0.7, 0.15, 0.15);
    const white = rgb(1, 1, 1);

    // ===== PAGE 1 =====
    let page = pdfDoc.addPage([W, H]);
    let y = H - M;

    // Header bar
    page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: primary });
    page.drawText("DEAL PACKAGE", { x: M, y: H - 45, size: 26, font: bold, color: white });
    page.drawText("PIW Navigator — Investment Opportunity", { x: M, y: H - 65, size: 10, font: regular, color: rgb(0.85, 0.95, 0.95) });
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    page.drawText(today, { x: W - M - bold.widthOfTextAtSize(today, 10), y: H - 45, size: 10, font: bold, color: white });

    y = H - 110;

    // Property Address
    page.drawText("PROPERTY", { x: M, y, size: 9, font: bold, color: gray });
    y -= 18;
    page.drawText(property?.address || "N/A", { x: M, y, size: 18, font: bold, color: text });
    y -= 16;
    page.drawText(`${property?.city || ""}, ${property?.state || ""} ${property?.zip_code || ""}`, { x: M, y, size: 11, font: regular, color: text });
    y -= 10;
    if (property?.county) {
      page.drawText(`County: ${property.county}`, { x: M, y, size: 9, font: regular, color: gray });
      y -= 14;
    }
    y -= 15;

    // ===== OWNER & CONTACT SECTION =====
    page.drawText("OWNER & CONTACT", { x: M, y, size: 11, font: bold, color: primary });
    y -= 18;
    
    const ownerName = property?.owner_name || "Desconocido";
    page.drawText(`Owner: ${ownerName}`, { x: M, y, size: 10, font: bold, color: text });
    if (property?.owner_type) {
      page.drawText(`(${property.owner_type})`, { x: M + bold.widthOfTextAtSize(`Owner: ${ownerName}  `, 10), y, size: 9, font: regular, color: gray });
    }
    y -= 16;

    // Phones
    const phones = [
      { num: property?.owner_phone, type: property?.phone_1_type, dnc: property?.phone_1_dnc },
      { num: property?.phone_2, type: property?.phone_2_type, dnc: property?.phone_2_dnc },
      { num: property?.phone_3, type: property?.phone_3_type, dnc: property?.phone_3_dnc },
      { num: property?.phone_4, type: property?.phone_4_type, dnc: property?.phone_4_dnc },
      { num: property?.phone_5, type: property?.phone_5_type, dnc: property?.phone_5_dnc },
    ].filter(p => p.num);

    if (phones.length > 0) {
      for (const p of phones) {
        let phoneText = `TEL: ${p.num}`;
        if (p.type) phoneText += ` (${p.type})`;
        if (p.dnc) phoneText += ` -- DNC`;
        page.drawText(phoneText, { x: M + 10, y, size: 9, font: regular, color: p.dnc ? red : text });
        y -= 14;
      }
    } else {
      page.drawText("SIN TELEFONO -- Requiere skip-tracing", { x: M + 10, y, size: 9, font: regular, color: red });
      y -= 14;
    }

    if (property?.owner_email) {
      page.drawText(`EMAIL: ${property.owner_email}`, { x: M + 10, y, size: 9, font: regular, color: text });
      y -= 14;
    }
    y -= 15;

    // ===== FINANCIAL SUMMARY =====
    const boxH = 130;
    page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, borderColor: primary, borderWidth: 2, color: rgb(0.97, 0.99, 0.99) });
    page.drawText("FINANCIAL SUMMARY", { x: M + 12, y: y - 20, size: 11, font: bold, color: primary });

    const arv = Number(property?.arv) || 0;
    const repairCost = Number(property?.repair_cost) || 0;
    const mao = property?.mao ? Number(property.mao) : (arv > 0 ? Math.round(arv * 0.7 - repairCost) : 0);
    const mortgageBalance = Number(property?.mortgage_balance) || 0;
    const netEquity = arv > 0 && mortgageBalance > 0 ? arv - mortgageBalance : 0;
    const equityPct = property?.equity_percent ? Number(property.equity_percent) : 0;
    const actualFee = assignment_fee || Number(lead.assignment_fee) || 0;
    const acqCost = Number(lead.offer_amount) || Number(lead.listing_price) || Number(property?.last_sale_price) || 0;
    const spread = mao > 0 && acqCost > 0 ? mao - acqCost : 0;
    const feeMin = spread > 0 ? Math.max(5000, Math.round(spread * 0.3)) : 0;
    const feeMax = spread > 0 ? Math.round(spread * 0.6) : 0;

    const finData = [
      { label: "ARV", value: arv > 0 ? `$${arv.toLocaleString()}` : "TBD" },
      { label: "Repairs", value: repairCost > 0 ? `$${repairCost.toLocaleString()}` : "TBD" },
      { label: "MAO (70%)", value: mao > 0 ? `$${mao.toLocaleString()}` : "TBD" },
      { label: "Mortgage", value: mortgageBalance > 0 ? `$${mortgageBalance.toLocaleString()}` : "N/A" },
      { label: "Net Equity", value: netEquity > 0 ? `$${netEquity.toLocaleString()}` : "N/A" },
      { label: "Equity %", value: equityPct > 0 ? `${equityPct}%` : "N/A" },
      { label: "Acquisition", value: acqCost > 0 ? `$${acqCost.toLocaleString()}` : "TBD" },
      { label: "Spread", value: spread !== 0 ? `$${spread.toLocaleString()}` : "TBD" },
      { label: "Fee Range", value: feeMin > 0 ? `$${(feeMin/1000).toFixed(0)}K - $${(feeMax/1000).toFixed(0)}K` : (actualFee > 0 ? `$${actualFee.toLocaleString()}` : "Negotiable") },
    ];

    let col = 0, row = 0;
    for (const item of finData) {
      const xPos = M + 12 + col * (CW / 3);
      const yPos = y - 45 - row * 30;
      page.drawText(item.label, { x: xPos, y: yPos, size: 8, font: regular, color: gray });
      const valColor = item.label === "Spread" && spread > 0 ? green : item.label === "Spread" && spread < 0 ? red : text;
      page.drawText(item.value, { x: xPos, y: yPos - 12, size: 12, font: bold, color: valColor });
      col++;
      if (col >= 3) { col = 0; row++; }
    }

    y = y - boxH - 20;

    // ===== URGENCY & MOTIVATION =====
    page.drawText("MOTIVATION & URGENCY", { x: M, y, size: 11, font: bold, color: primary });
    y -= 18;

    const signals: string[] = [];
    if (property?.is_foreclosure) signals.push("🔨 FORECLOSURE — Property in pre-foreclosure/foreclosure");
    if (property?.auction_date) {
      const days = Math.ceil((new Date(property.auction_date).getTime() - Date.now()) / (1000*60*60*24));
      if (days > 0) signals.push(`🚨 AUCTION in ${days} days (${new Date(property.auction_date).toLocaleDateString()})`);
      else signals.push(`⚠️ AUCTION EXPIRED (${new Date(property.auction_date).toLocaleDateString()})`);
    }
    if (property?.bk_date) signals.push(`⚖️ BANKRUPTCY filed ${new Date(property.bk_date).toLocaleDateString()}`);
    if (property?.divorce_date) signals.push(`💔 DIVORCE filed ${new Date(property.divorce_date).toLocaleDateString()}`);
    if (property?.is_vacant) signals.push("🏚️ VACANT — Property unoccupied");
    if (property?.tax_delinquent) signals.push(`💰 TAX DELINQUENT${property.tax_debt ? ` ($${Number(property.tax_debt).toLocaleString()})` : ""}`);
    if (property?.is_probate) signals.push("⚖️ PROBATE — Estate/inheritance");
    if (property?.is_absentee_owner) signals.push(`🏠 ABSENTEE OWNER${property.absentee_type === 'out_of_state' ? ' (Out-of-State)' : ''}`);
    if (property?.owner_tenure_years && property.owner_tenure_years > 10) signals.push(`🕐 ${property.owner_tenure_years}+ YEARS owned — ownership fatigue`);
    if (property?.days_on_market && property.days_on_market > 90) signals.push(`📉 ${property.days_on_market} DAYS ON MARKET — frustrated seller`);
    if (property?.equity_percent && Number(property.equity_percent) >= 100) signals.push("💎 FREE & CLEAR — No mortgage");
    if (property?.prefc_recording_date) signals.push(`📋 Pre-FC Recorded: ${new Date(property.prefc_recording_date).toLocaleDateString()}`);
    if (property?.lien_type) signals.push(`🔗 LIEN: ${property.lien_type}${property.lien_amount ? ` ($${Number(property.lien_amount).toLocaleString()})` : ""}`);

    if (signals.length > 0) {
      for (const s of signals) {
        page.drawText(s, { x: M + 5, y, size: 9, font: regular, color: green });
        y -= 14;
      }
    } else {
      page.drawText("No specific distress signals detected", { x: M + 5, y, size: 9, font: regular, color: gray });
      y -= 14;
    }
    y -= 10;

    // ===== PIW SCORE =====
    const piwScore = lead.piw_score || 0;
    page.drawText("PIW SCORE", { x: M, y, size: 11, font: bold, color: primary });
    const scoreColor = piwScore >= 75 ? green : piwScore >= 50 ? rgb(0.8, 0.6, 0) : gray;
    page.drawRectangle({ x: M + 80, y: y - 12, width: 80, height: 40, color: scoreColor });
    page.drawText(`${piwScore}%`, { x: M + 95, y: y + 5, size: 18, font: bold, color: white });
    const prioLabel = piwScore >= 75 ? "HOT LEAD" : piwScore >= 50 ? "WARM LEAD" : "COLD LEAD";
    page.drawText(prioLabel, { x: M + 170, y: y + 5, size: 13, font: bold, color: scoreColor });
    y -= 55;

    // ===== PROPERTY DETAILS =====
    page.drawText("PROPERTY DETAILS", { x: M, y, size: 11, font: bold, color: primary });
    y -= 18;
    const details = [
      ["Type", (property?.property_type || "N/A").replace("_", " ").toUpperCase()],
      ["Year Built", property?.year_built?.toString() || "N/A"],
      ["Sqft", property?.sqft ? `${property.sqft.toLocaleString()}` : "N/A"],
      ["Bed/Bath", `${property?.bedrooms || "?"} / ${property?.bathrooms || "?"}`],
      ["Lot", property?.lot_size ? `${Number(property.lot_size).toLocaleString()} sqft` : "N/A"],
      ["Condition", property?.property_condition || property?.exterior_condition || "N/A"],
    ];
    col = 0; row = 0;
    for (const [label, value] of details) {
      const xPos = M + col * (CW / 3);
      const yPos = y - row * 28;
      page.drawText(label + ":", { x: xPos, y: yPos, size: 9, font: regular, color: gray });
      page.drawText(value, { x: xPos + 65, y: yPos, size: 9, font: bold, color: text });
      col++;
      if (col >= 3) { col = 0; row++; }
    }
    y = y - Math.ceil(details.length / 3) * 28 - 15;

    // ===== MLS AGENT =====
    if (property?.mls_agent_name) {
      page.drawText("MLS AGENT", { x: M, y, size: 11, font: bold, color: primary });
      y -= 16;
      page.drawText(`${property.mls_agent_name}`, { x: M + 5, y, size: 9, font: bold, color: text });
      if (property.mls_agent_phone) {
        page.drawText(` | ${property.mls_agent_phone}`, { x: M + 5 + bold.widthOfTextAtSize(property.mls_agent_name, 9), y, size: 9, font: regular, color: text });
      }
      y -= 14;
      if (property.mls_agent_email) {
        page.drawText(property.mls_agent_email, { x: M + 5, y, size: 9, font: regular, color: text });
        y -= 14;
      }
      y -= 10;
    }

    // ===== WHAT TO OFFER (clear summary) =====
    if (spread > 0 || mao > 0) {
      page.drawText("RECOMMENDED OFFER STRATEGY", { x: M, y, size: 11, font: bold, color: primary });
      y -= 18;
      const offerStart = acqCost > 0 ? Math.round(acqCost * 0.75) : Math.round(mao * 0.8);
      const offerMax = mao > 0 ? mao : acqCost;
      page.drawText(`Start offer at: $${offerStart.toLocaleString()}`, { x: M + 5, y, size: 10, font: bold, color: green });
      y -= 15;
      page.drawText(`Max offer (MAO): $${offerMax.toLocaleString()}`, { x: M + 5, y, size: 10, font: regular, color: text });
      y -= 15;
      if (feeMin > 0) {
        page.drawText(`Your profit (assignment fee): $${(feeMin/1000).toFixed(0)}K - $${(feeMax/1000).toFixed(0)}K`, { x: M + 5, y, size: 10, font: bold, color: green });
        y -= 15;
      }
      if (signals.length > 0) {
        page.drawText(`Urgency leverage: ${signals.length} distress signal(s) detected`, { x: M + 5, y, size: 9, font: regular, color: text });
        y -= 15;
      }
      y -= 5;
    }

    // ===== ASSIGNMENT TERMS =====
    if (terms || actualFee > 0) {
      page.drawText("ASSIGNMENT TERMS", { x: M, y, size: 11, font: bold, color: primary });
      y -= 18;
      const termsText = terms || `Assignment fee: $${actualFee.toLocaleString()}. Subject to buyer inspection. Close within 30 days.`;
      y = drawWrappedText(page, termsText, M + 5, y, regular, 9, CW - 10, text);
      y -= 10;
    }

    // Footer
    page.drawLine({ start: { x: M, y: 55 }, end: { x: W - M, y: 55 }, color: gray, thickness: 0.5 });
    page.drawText("Confidential — For qualified buyers only.", { x: M, y: 42, size: 7, font: regular, color: gray });
    page.drawText("Generated by PIW Navigator", { x: M, y: 30, size: 7, font: bold, color: primary });

    const pdfBytes = await pdfDoc.save();

    return new Response(new Uint8Array(pdfBytes).buffer as ArrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="deal-package-${property?.address?.replace(/\s+/g, '-') || lead_id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    console.error("Error generating deal package:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate deal package";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
