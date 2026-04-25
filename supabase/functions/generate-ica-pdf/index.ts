// Generate Independent Contractor Agreement PDF + SHA-256 hash, upload to private bucket.
// Auth: requires user JWT; only the owner of the agreement (or super admin) can trigger generation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TAX_LABELS: Record<string, string> = {
  individual: "Individual / Persona Natural",
  sole_proprietor: "Propietario Único (Sole Proprietor)",
  single_member_llc: "LLC de un solo miembro",
  c_corporation: "C Corporation",
  s_corporation: "S Corporation",
  partnership: "Partnership",
  trust_estate: "Trust / Estate",
  llc_c: "LLC tributada como C Corp",
  llc_s: "LLC tributada como S Corp",
  llc_p: "LLC tributada como Partnership",
  other: "Otra",
};

const TIN_LABELS: Record<string, string> = {
  ssn: "SSN — Social Security Number",
  itin: "ITIN — Individual Taxpayer ID (W-7)",
  ein: "EIN — Employer ID Number",
};

interface Agreement {
  id: string;
  user_id: string;
  agreement_version: string;
  legal_name: string;
  business_name: string | null;
  tax_classification: string;
  tin_type: string;
  tax_id_last4: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  email: string;
  phone: string | null;
  commission_split_student: number;
  signature_image: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

function buildSections(a: Agreement): Array<{ title: string; body: string[] }> {
  const today = new Date(a.signed_at).toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const klosePct = (100 - Number(a.commission_split_student)).toFixed(0);
  const studentPct = Number(a.commission_split_student).toFixed(0);
  const fullAddress = [
    a.address_line1,
    a.address_line2,
    `${a.city}, ${a.state} ${a.zip_code}`,
  ]
    .filter(Boolean)
    .join(", ");
  const tinDisplay =
    a.tin_type === "ein" ? `XX-XXX${a.tax_id_last4}` : `XXX-XX-${a.tax_id_last4}`;

  return [
    {
      title: "1. Partes del Acuerdo",
      body: [
        `Este Acuerdo de Contratista Independiente ("Acuerdo") se celebra el ${today} entre:`,
        `KLOSE LLC, una sociedad de responsabilidad limitada constituida en Wyoming, EIN 41-4409334, en adelante "KLOSE" o "la Compañía".`,
        `Y ${a.legal_name}${a.business_name ? ` operando como "${a.business_name}"` : ""}, con dirección en ${fullAddress}, email ${a.email}${a.phone ? `, teléfono ${a.phone}` : ""}, en adelante "el Contratista" o "Deal Finder".`,
      ],
    },
    {
      title: "2. Naturaleza de la Relación — NO ES EMPLEO",
      body: [
        "El Contratista reconoce y acepta expresamente que:",
        "• Es un contratista independiente (1099), NO un empleado, agente, socio ni representante de KLOSE.",
        "• NO recibirá salario, beneficios médicos, vacaciones pagadas, seguro de desempleo, workers' compensation, ni ningún beneficio reservado para empleados.",
        "• Es responsable del 100% de sus impuestos federales, estatales, locales y de self-employment tax.",
        "• KLOSE NO retendrá impuestos. Recibirá un Formulario 1099-NEC al cierre del año fiscal si sus pagos totales superan $600 USD.",
        "• Determina su propio horario, métodos de trabajo, ubicación y herramientas, sujeto solo a estándares de calidad y compliance de KLOSE.",
      ],
    },
    {
      title: "3. Servicios del Contratista",
      body: [
        "El Contratista proveerá los siguientes servicios a KLOSE:",
        "• Identificar propietarios motivados a vender por debajo del valor de mercado (leads).",
        "• Recolectar y verificar información de contacto, condición de la propiedad, motivación de venta y precio aspiracional.",
        "• Cargar dicha información en la plataforma SaaS de KLOSE (goklose.com).",
        "• NO firmar contratos en nombre de KLOSE ni representarse como agente, broker, ni licenciado de bienes raíces.",
        "• NO negociar términos finales con sellers o buyers; esa función es exclusiva de KLOSE.",
      ],
    },
    {
      title: "4. Modelo Económico — Comisión 60/40",
      body: [
        `Cuando un lead aportado por el Contratista resulte en un deal cerrado por KLOSE (assignment fee cobrado al buyer), la compensación se distribuirá:`,
        `• ${studentPct}% para el Contratista (Deal Finder).`,
        `• ${klosePct}% para KLOSE (cubre infraestructura, legal, software, riesgo y closing).`,
        `Pago: KLOSE pagará al Contratista dentro de los 7 días hábiles posteriores al recibo del assignment fee, vía ACH, Zelle, Wire o método mutuamente acordado.`,
        `El Contratista NO tiene derecho a comisión sobre deals cerrados antes de la firma de este Acuerdo, ni sobre leads que no resulten en cierre.`,
      ],
    },
    {
      title: "5. Confidencialidad y Propiedad Intelectual",
      body: [
        "Todos los buyers, contratos, scripts, materiales de la Academy, software, datos, K-Score, KCFY workflow y cualquier información comercial son propiedad exclusiva de KLOSE LLC.",
        "El Contratista NO podrá: (a) compartir buyers o contratos con terceros, (b) competir directamente con KLOSE usando los buyers o procesos aprendidos por 12 meses tras la terminación, (c) distribuir, copiar o revender materiales educativos.",
      ],
    },
    {
      title: "6. Compliance Legal",
      body: [
        "El Contratista declara y acepta que:",
        "• Cumplirá con TCPA (Telephone Consumer Protection Act), incluyendo respeto a listas DNC y obtención de consentimiento para SMS.",
        "• NO se representará como agente licenciado de bienes raíces si no posee licencia.",
        "• NO firmará contratos AB ni BC en nombre propio sobre propiedades referidas a KLOSE.",
        "• Reportará a KLOSE cualquier comunicación con autoridades regulatorias o quejas.",
        "• Es responsable de obtener cualquier licencia comercial local o registro fiscal requerido por su jurisdicción.",
      ],
    },
    {
      title: "7. Información Fiscal (Equivalente al W-9)",
      body: [
        `Nombre legal: ${a.legal_name}`,
        a.business_name ? `Nombre comercial / DBA: ${a.business_name}` : "Sin nombre comercial / DBA.",
        `Clasificación fiscal: ${TAX_LABELS[a.tax_classification] ?? a.tax_classification}`,
        `Tipo de identificación fiscal: ${TIN_LABELS[a.tin_type] ?? a.tin_type}`,
        `${a.tin_type === "ein" ? "EIN" : a.tin_type.toUpperCase()} (últimos 4 dígitos): ${tinDisplay}`,
        `Dirección fiscal: ${fullAddress}`,
        `El Contratista certifica bajo pena de perjurio que: (1) el TIN provisto es correcto y emitido por el IRS, (2) no está sujeto a backup withholding, y (3) es ciudadano, residente fiscal de EE.UU., o entidad estadounidense con TIN válido. El status migratorio es irrelevante mientras tenga TIN válido.`,
      ],
    },
    {
      title: "8. Terminación",
      body: [
        "Cualquiera de las partes puede terminar este Acuerdo en cualquier momento, con o sin causa, mediante aviso escrito (email es suficiente).",
        "Tras la terminación: (a) los pagos sobre deals YA cerrados se respetarán según cronograma, (b) el Contratista perderá acceso a la plataforma, (c) las obligaciones de confidencialidad sobreviven 12 meses.",
      ],
    },
    {
      title: "9. Indemnización y Limitación de Responsabilidad",
      body: [
        "El Contratista indemnizará y mantendrá indemne a KLOSE frente a cualquier reclamo derivado de: (a) violaciones a TCPA o leyes de licenciamiento de RE, (b) tergiversación de información, (c) actuación más allá del scope autorizado.",
        "La responsabilidad máxima de KLOSE se limita al monto total pagado al Contratista en los 12 meses anteriores al reclamo.",
      ],
    },
    {
      title: "10. Ley Aplicable y Resolución de Disputas",
      body: [
        "Este Acuerdo se rige por las leyes del Estado de Wyoming, EE.UU.",
        "Cualquier disputa será resuelta por arbitraje vinculante administrado por la AAA en Cheyenne, Wyoming.",
        "Las partes renuncian al juicio por jurado y a class actions.",
      ],
    },
    {
      title: "11. Aceptación Electrónica",
      body: [
        "El Contratista acepta que su firma electrónica, junto con IP, user-agent y timestamp, constituye firma legalmente vinculante bajo el ESIGN Act (15 U.S.C. § 7001) y UETA.",
        `Fecha de aceptación: ${today}.`,
        `IP: ${a.ip_address ?? "N/A"}`,
        `User-Agent: ${(a.user_agent ?? "N/A").slice(0, 120)}`,
      ],
    },
  ];
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function buildPdf(a: Agreement): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const sections = buildSections(a);

  const PAGE_W = 612; // Letter
  const PAGE_H = 792;
  const MARGIN_X = 56;
  const MARGIN_Y = 56;
  const LINE_HEIGHT = 13;
  const SECTION_GAP = 10;
  const MAX_CHARS = 92;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_Y;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN_Y) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN_Y;
    }
  };

  // Header
  page.drawText("INDEPENDENT CONTRACTOR AGREEMENT", {
    x: MARGIN_X, y, size: 14, font: fontBold, color: rgb(0, 0, 0),
  });
  y -= 18;
  page.drawText(`KLOSE LLC · 1099 Deal Finder · Versión ${a.agreement_version}`, {
    x: MARGIN_X, y, size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 22;

  // Sections
  for (const s of sections) {
    ensureSpace(LINE_HEIGHT * 2);
    page.drawText(s.title, {
      x: MARGIN_X, y, size: 10, font: fontBold, color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT + 2;

    for (const para of s.body) {
      const lines = wrapText(para, MAX_CHARS);
      for (const line of lines) {
        ensureSpace(LINE_HEIGHT);
        page.drawText(line, {
          x: MARGIN_X, y, size: 9, font, color: rgb(0.15, 0.15, 0.15),
        });
        y -= LINE_HEIGHT;
      }
      y -= 4;
    }
    y -= SECTION_GAP;
  }

  // Signature block
  ensureSpace(140);
  y -= 10;
  page.drawText("FIRMA DEL CONTRATISTA", {
    x: MARGIN_X, y, size: 10, font: fontBold, color: rgb(0, 0, 0),
  });
  y -= 16;

  // Embed signature image (data URL: data:image/png;base64,...)
  try {
    const sig = a.signature_image;
    const commaIdx = sig.indexOf(",");
    const meta = sig.slice(0, commaIdx);
    const b64 = sig.slice(commaIdx + 1);
    const isPng = meta.includes("png");
    const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const sigImg = isPng ? await pdf.embedPng(sigBytes) : await pdf.embedJpg(sigBytes);
    const sigW = 220;
    const sigH = (sigImg.height / sigImg.width) * sigW;
    ensureSpace(sigH + 30);
    page.drawImage(sigImg, { x: MARGIN_X, y: y - sigH, width: sigW, height: sigH });
    y -= sigH + 6;
  } catch (e) {
    page.drawText("[Firma no embebida]", { x: MARGIN_X, y, size: 9, font });
    y -= LINE_HEIGHT;
  }

  page.drawText(a.legal_name, { x: MARGIN_X, y, size: 10, font: fontBold });
  y -= LINE_HEIGHT;
  page.drawText(
    `Firmado: ${new Date(a.signed_at).toISOString()} · IP: ${a.ip_address ?? "N/A"}`,
    { x: MARGIN_X, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) },
  );

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const agreementId = String(body?.agreement_id ?? "");
    if (!agreementId || agreementId.length < 10) {
      return new Response(JSON.stringify({ error: "agreement_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: agreement, error: aErr } = await admin
      .from("contractor_agreements")
      .select("*")
      .eq("id", agreementId)
      .maybeSingle();

    if (aErr || !agreement) {
      return new Response(JSON.stringify({ error: "Agreement not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (agreement.user_id !== userId) {
      // Allow super admin override
      const { data: isSuper } = await admin.rpc("is_klose_super_admin", {
        _user_id: userId,
      });
      if (!isSuper) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (agreement.signed_pdf_path && agreement.signed_pdf_hash) {
      // Already generated
      return new Response(
        JSON.stringify({
          ok: true,
          already_generated: true,
          path: agreement.signed_pdf_path,
          hash: agreement.signed_pdf_hash,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pdfBytes = await buildPdf(agreement as Agreement);
    const hash = await sha256Hex(pdfBytes);
    const path = `${agreement.user_id}/${agreement.id}.pdf`;

    const { error: upErr } = await admin.storage
      .from("contractor-agreements")
      .upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      console.error("[generate-ica-pdf] upload error", upErr);
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("contractor_agreements")
      .update({
        signed_pdf_path: path,
        signed_pdf_hash: hash,
      })
      .eq("id", agreement.id);

    return new Response(
      JSON.stringify({ ok: true, path, hash, bytes: pdfBytes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-ica-pdf] fatal", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
