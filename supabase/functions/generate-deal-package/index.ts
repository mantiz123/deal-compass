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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, assignment_fee, terms } = await req.json() as DealPackageRequest;
    
    if (!lead_id) {
      console.error("Missing lead_id");
      return new Response(
        JSON.stringify({ error: "lead_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating deal package for lead: ${lead_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lead with property data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      console.error("Lead not found:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const property = lead.property;
    console.log(`Found lead with property: ${property?.address}`);

    // Fetch property images
    const { data: images } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", property?.id)
      .order("is_primary", { ascending: false })
      .limit(4);

    console.log(`Found ${images?.length || 0} images`);

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Page dimensions
    const pageWidth = 612; // Letter size
    const pageHeight = 792;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Add first page
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Colors
    const primaryColor = rgb(0.06, 0.53, 0.53); // Teal
    const textColor = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const successColor = rgb(0.13, 0.55, 0.13);

    // Header
    page.drawRectangle({
      x: 0,
      y: pageHeight - 80,
      width: pageWidth,
      height: 80,
      color: primaryColor,
    });

    page.drawText("DEAL PACKAGE", {
      x: margin,
      y: pageHeight - 50,
      size: 28,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("PIW Navigator - Investment Opportunity", {
      x: margin,
      y: pageHeight - 70,
      size: 12,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Date
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    page.drawText(today, {
      x: pageWidth - margin - 120,
      y: pageHeight - 50,
      size: 10,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });

    y = pageHeight - 120;

    // Property Address Section
    page.drawText("PROPERTY ADDRESS", {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: lightGray,
    });
    y -= 20;

    page.drawText(property?.address || "N/A", {
      x: margin,
      y,
      size: 18,
      font: helveticaBold,
      color: textColor,
    });
    y -= 18;

    page.drawText(`${property?.city || ""}, ${property?.state || ""} ${property?.zip_code || ""}`, {
      x: margin,
      y,
      size: 12,
      font: helvetica,
      color: textColor,
    });
    y -= 40;

    // Financial Summary Box
    const boxHeight = 120;
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      borderColor: primaryColor,
      borderWidth: 2,
      color: rgb(0.97, 0.99, 0.99),
    });

    // Financial title
    page.drawText("FINANCIAL SUMMARY", {
      x: margin + 15,
      y: y - 25,
      size: 12,
      font: helveticaBold,
      color: primaryColor,
    });

    // Calculate financial values
    const arv = Number(property?.arv) || 0;
    const repairCost = Number(property?.repair_cost) || 0;
    const mao = property?.mao ? Number(property.mao) : (arv > 0 ? Math.round(arv * 0.7 - repairCost) : 0);
    const actualAssignmentFee = assignment_fee || Number(lead.assignment_fee) || 0;
    const acquisitionCost = Number(lead.offer_amount) || Number(lead.listing_price) || Number(property?.last_sale_price) || 0;
    const spread = mao > 0 && acquisitionCost > 0 ? mao - acquisitionCost : 0;

    // Financial grid
    const colWidth = contentWidth / 3;
    const financialData = [
      { label: "ARV", value: arv > 0 ? `$${arv.toLocaleString()}` : "TBD" },
      { label: "Repair Cost", value: repairCost > 0 ? `$${repairCost.toLocaleString()}` : "TBD" },
      { label: "MAO (70%)", value: mao > 0 ? `$${mao.toLocaleString()}` : "TBD" },
      { label: "Acquisition", value: acquisitionCost > 0 ? `$${acquisitionCost.toLocaleString()}` : "TBD" },
      { label: "Spread", value: spread !== 0 ? `$${spread.toLocaleString()}` : "TBD" },
      { label: "Assignment Fee", value: actualAssignmentFee > 0 ? `$${actualAssignmentFee.toLocaleString()}` : "Negotiable" },
    ];

    let col = 0;
    let row = 0;
    for (const item of financialData) {
      const xPos = margin + 15 + (col * colWidth);
      const yPos = y - 55 - (row * 35);
      
      page.drawText(item.label, {
        x: xPos,
        y: yPos,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      
      page.drawText(item.value, {
        x: xPos,
        y: yPos - 14,
        size: 14,
        font: helveticaBold,
        color: item.label === "Spread" && spread > 0 ? successColor : textColor,
      });
      
      col++;
      if (col >= 3) {
        col = 0;
        row++;
      }
    }

    y = y - boxHeight - 30;

    // Property Details Section
    page.drawText("PROPERTY DETAILS", {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;

    const propertyDetails = [
      ["Type", (property?.property_type || "N/A").replace("_", " ").toUpperCase()],
      ["Year Built", property?.year_built?.toString() || "N/A"],
      ["Square Feet", property?.sqft ? `${property.sqft.toLocaleString()} sqft` : "N/A"],
      ["Bedrooms", property?.bedrooms?.toString() || "N/A"],
      ["Bathrooms", property?.bathrooms?.toString() || "N/A"],
      ["Lot Size", property?.lot_size ? `${property.lot_size.toLocaleString()} sqft` : "N/A"],
    ];

    const detailColWidth = contentWidth / 3;
    col = 0;
    row = 0;
    for (const [label, value] of propertyDetails) {
      const xPos = margin + (col * detailColWidth);
      const yPos = y - (row * 30);
      
      page.drawText(label + ":", {
        x: xPos,
        y: yPos,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      page.drawText(value, {
        x: xPos + 80,
        y: yPos,
        size: 10,
        font: helveticaBold,
        color: textColor,
      });
      
      col++;
      if (col >= 3) {
        col = 0;
        row++;
      }
    }

    y = y - (Math.ceil(propertyDetails.length / 3) * 30) - 30;

    // Motivation Indicators Section
    page.drawText("MOTIVATION INDICATORS", {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 20;

    const indicators = [];
    if (property?.is_absentee_owner) indicators.push("[X] Absentee Owner");
    if (property?.tax_delinquent) indicators.push("[X] Tax Delinquent");
    if (property?.is_foreclosure) indicators.push("[X] Foreclosure");
    if (property?.is_probate) indicators.push("[X] Probate");
    if (property?.mailing_address_different) indicators.push("[X] Different Mailing Address");
    if (property?.equity_percent && property.equity_percent > 50) indicators.push(`[X] High Equity (${property.equity_percent}%)`);
    if (property?.owner_tenure_years && property.owner_tenure_years > 10) indicators.push(`[X] Long Ownership (${property.owner_tenure_years} years)`);

    if (indicators.length > 0) {
      col = 0;
      for (const indicator of indicators) {
        const xPos = margin + (col * (contentWidth / 2));
        page.drawText(indicator, {
          x: xPos,
          y,
          size: 10,
          font: helvetica,
          color: successColor,
        });
        col++;
        if (col >= 2) {
          col = 0;
          y -= 18;
        }
      }
      if (col !== 0) y -= 18;
    } else {
      page.drawText("No specific indicators available", {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      y -= 18;
    }

    y -= 20;

    // PIW Score Section
    const piwScore = lead.piw_score || 0;
    const scoreBoxWidth = 100;
    const scoreBoxHeight = 50;

    page.drawText("PIW SCORE", {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: primaryColor,
    });

    const scoreColor = piwScore >= 80 ? successColor : piwScore >= 50 ? rgb(0.8, 0.6, 0) : rgb(0.6, 0.6, 0.6);
    
    page.drawRectangle({
      x: margin + 80,
      y: y - 15,
      width: scoreBoxWidth,
      height: scoreBoxHeight,
      color: scoreColor,
    });

    page.drawText(`${piwScore}%`, {
      x: margin + 105,
      y: y + 5,
      size: 20,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    const priorityLabel = piwScore >= 80 ? "HOT LEAD" : piwScore >= 50 ? "WARM LEAD" : "COLD LEAD";
    page.drawText(priorityLabel, {
      x: margin + 190,
      y: y + 5,
      size: 14,
      font: helveticaBold,
      color: scoreColor,
    });

    y -= 70;

    // Assignment Terms Section
    if (terms || actualAssignmentFee > 0) {
      page.drawText("ASSIGNMENT TERMS", {
        x: margin,
        y,
        size: 12,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 20;

      const termsText = terms || `Assignment fee: $${actualAssignmentFee.toLocaleString()}. Subject to buyer inspection and verification of all property information. Close within 30 days of acceptance.`;
      
      // Word wrap for terms
      const words = termsText.split(" ");
      let line = "";
      const maxWidth = contentWidth;
      
      for (const word of words) {
        const testLine = line + word + " ";
        const textWidth = helvetica.widthOfTextAtSize(testLine, 10);
        
        if (textWidth > maxWidth) {
          page.drawText(line.trim(), {
            x: margin,
            y,
            size: 10,
            font: helvetica,
            color: textColor,
          });
          y -= 14;
          line = word + " ";
        } else {
          line = testLine;
        }
      }
      
      if (line.trim()) {
        page.drawText(line.trim(), {
          x: margin,
          y,
          size: 10,
          font: helvetica,
          color: textColor,
        });
        y -= 14;
      }
    }

    // Footer
    page.drawLine({
      start: { x: margin, y: 60 },
      end: { x: pageWidth - margin, y: 60 },
      color: lightGray,
      thickness: 0.5,
    });

    page.drawText("This deal package is confidential and intended for qualified buyers only.", {
      x: margin,
      y: 45,
      size: 8,
      font: helvetica,
      color: lightGray,
    });

    page.drawText("Generated by PIW Navigator", {
      x: margin,
      y: 30,
      size: 8,
      font: helveticaBold,
      color: primaryColor,
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    console.log(`PDF generated successfully, size: ${pdfBytes.length} bytes`);

    // Return PDF
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
