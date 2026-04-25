/**
 * Independent Contractor Agreement (ICA) — KLOSE LLC
 *
 * Template legal MVP en español para deal finders 1099.
 * Versión: v1.0
 *
 * IMPORTANTE: Este template fue redactado para uso interno de KLOSE LLC.
 * Antes de operar a escala (>20 contratistas) debe ser revisado por un
 * abogado con expertise en clasificación 1099 y wholesaling de RE en US.
 */

export const ICA_VERSION = "v1.0";

export type TinType = "ssn" | "itin" | "ein";

export const TIN_TYPE_LABELS: Record<TinType, string> = {
  ssn: "SSN — Social Security Number",
  itin: "ITIN — Individual Taxpayer ID (W-7)",
  ein: "EIN — Employer ID Number",
};

/**
 * Validación de formato (solo formato, no validez fiscal):
 * - SSN: 9 dígitos, no puede empezar por 9 (los que empiezan por 9 son ITIN)
 * - ITIN: 9 dígitos, empieza por 9, dígito 4 entre 50-65, 70-88, 90-92, 94-99
 * - EIN: 9 dígitos, primeros 2 son prefijo IRS válido (no validamos prefijo, solo longitud)
 */
export function validateTinFormat(value: string, type: TinType): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return false;
  if (type === "ssn") {
    return digits[0] !== "9" && digits.slice(0, 3) !== "000" && digits.slice(3, 5) !== "00" && digits.slice(5) !== "0000";
  }
  if (type === "itin") {
    if (digits[0] !== "9") return false;
    const fourth = parseInt(digits.slice(3, 5), 10);
    return (
      (fourth >= 50 && fourth <= 65) ||
      (fourth >= 70 && fourth <= 88) ||
      (fourth >= 90 && fourth <= 92) ||
      (fourth >= 94 && fourth <= 99)
    );
  }
  // EIN: 9 dígitos, no todos ceros
  return digits !== "000000000";
}

export function formatTinDisplay(value: string, type: TinType): string {
  const d = value.replace(/\D/g, "").slice(0, 9);
  if (type === "ein") {
    // XX-XXXXXXX
    return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
  }
  // SSN/ITIN: XXX-XX-XXXX
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export interface ICATemplateData {
  legalName: string;
  businessName?: string;
  taxClassification: string;
  tinType: TinType;
  taxIdLast4: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone?: string;
  commissionSplitStudent: number; // e.g. 60.00
  signedDate: string; // ISO
}

export const TAX_CLASSIFICATION_LABELS: Record<string, string> = {
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

export interface ICASection {
  title: string;
  body: string[];
}

export function buildICASections(data: ICATemplateData): ICASection[] {
  const today = new Date(data.signedDate).toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const klosePct = (100 - data.commissionSplitStudent).toFixed(0);
  const studentPct = data.commissionSplitStudent.toFixed(0);
  const fullAddress = [
    data.addressLine1,
    data.addressLine2,
    `${data.city}, ${data.state} ${data.zipCode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    {
      title: "1. Partes del Acuerdo",
      body: [
        `Este Acuerdo de Contratista Independiente ("Acuerdo") se celebra el ${today} entre:`,
        `**KLOSE LLC**, una sociedad de responsabilidad limitada constituida en Wyoming, EIN 41-4409334, en adelante "KLOSE" o "la Compañía".`,
        `Y **${data.legalName}**${data.businessName ? ` operando como "${data.businessName}"` : ""}, con dirección en ${fullAddress}, email ${data.email}${data.phone ? `, teléfono ${data.phone}` : ""}, en adelante "el Contratista" o "Deal Finder".`,
      ],
    },
    {
      title: "2. Naturaleza de la Relación — NO ES EMPLEO",
      body: [
        "El Contratista reconoce y acepta expresamente que:",
        "• Es un **contratista independiente (1099)**, NO un empleado, agente, socio ni representante de KLOSE.",
        "• NO recibirá salario, beneficios médicos, vacaciones pagadas, seguro de desempleo, workers' compensation, ni ningún beneficio reservado para empleados.",
        "• Es responsable del 100% de sus impuestos federales, estatales, locales y de self-employment tax (Social Security + Medicare).",
        "• KLOSE NO retendrá impuestos de sus pagos. Recibirá un Formulario 1099-NEC al cierre del año fiscal si sus pagos totales superan $600 USD.",
        "• Determina su propio horario, métodos de trabajo, ubicación y herramientas, sujeto únicamente a los estándares de calidad y compliance establecidos por KLOSE.",
      ],
    },
    {
      title: "3. Servicios del Contratista",
      body: [
        "El Contratista proveerá los siguientes servicios a KLOSE:",
        "• Identificar propietarios de bienes raíces motivados a vender por debajo del valor de mercado (leads).",
        "• Recolectar y verificar información de contacto, condición de la propiedad, motivación de venta y precio aspiracional.",
        "• Cargar dicha información en la plataforma SaaS de KLOSE (goklose.com).",
        "• NO firmar contratos en nombre de KLOSE ni representarse como agente, broker, ni licenciado de bienes raíces, salvo que cuente con dicha licencia y haya sido autorizado expresamente por escrito por KLOSE.",
        "• NO negociar términos finales con sellers o buyers; esa función es exclusiva de KLOSE o personal autorizado.",
      ],
    },
    {
      title: "4. Modelo Económico — Comisión 60/40",
      body: [
        `Cuando un lead aportado por el Contratista resulte en un deal cerrado por KLOSE (assignment fee cobrado por KLOSE LLC al buyer), la compensación se distribuirá:`,
        `• **${studentPct}% para el Contratista** (Deal Finder)`,
        `• **${klosePct}% para KLOSE** (cubre infraestructura, legal, software, riesgo del deal y closing).`,
        `Pago: KLOSE pagará al Contratista dentro de los 7 días hábiles posteriores al recibo del assignment fee del buyer, vía ACH, Zelle, Wire o el método mutuamente acordado.`,
        `El Contratista NO tiene derecho a comisión sobre deals cerrados antes de la firma de este Acuerdo, ni sobre leads que no resulten en cierre.`,
        `KLOSE se reserva el derecho de rechazar leads que no cumplan estándares mínimos de calidad, compliance o veracidad.`,
      ],
    },
    {
      title: "5. Confidencialidad y Propiedad Intelectual",
      body: [
        "Todos los buyers, contratos, scripts, materiales de la Academy, software, datos de propiedades enriquecidos por KLOSE, K-Score, KCFY workflow y cualquier información comercial son **propiedad exclusiva de KLOSE LLC**.",
        "El Contratista NO podrá: (a) compartir buyers o contratos con terceros, (b) competir directamente con KLOSE usando los buyers o procesos aprendidos durante este acuerdo por un período de 12 meses tras la terminación, (c) distribuir, copiar o revender materiales educativos de KLOSE.",
        "Toda data de leads ingresada en la plataforma pertenece a KLOSE y al Contratista de manera conjunta; KLOSE puede usarla para optimizar el algoritmo K-Score y entrenar modelos de IA.",
      ],
    },
    {
      title: "6. Compliance Legal",
      body: [
        "El Contratista declara y acepta que:",
        "• Cumplirá con TCPA (Telephone Consumer Protection Act), incluyendo respeto a listas DNC (Do Not Call) y obtención de consentimiento para SMS.",
        "• NO se representará como agente licenciado de bienes raíces (real estate broker/agent) si no posee dicha licencia.",
        "• NO firmará contratos AB (con sellers) ni BC (con buyers) en nombre propio sobre propiedades referidas a KLOSE; esa función es exclusiva de KLOSE LLC.",
        "• Reportará a KLOSE cualquier comunicación con autoridades reguladoras, demandas o quejas relacionadas con sus actividades.",
        "• Es responsable de obtener cualquier permiso, licencia comercial local o registro fiscal requerido por su jurisdicción.",
      ],
    },
    {
      title: "7. Información Fiscal (Equivalente al W-9)",
      body: [
        `Nombre legal: **${data.legalName}**`,
        data.businessName ? `Nombre comercial / DBA: **${data.businessName}**` : "Sin nombre comercial / DBA.",
        `Clasificación fiscal: **${TAX_CLASSIFICATION_LABELS[data.taxClassification] ?? data.taxClassification}**`,
        `Tipo de identificación fiscal: **${TIN_TYPE_LABELS[data.tinType]}**`,
        `${data.tinType === "ein" ? "EIN" : data.tinType.toUpperCase()} (últimos 4 dígitos visibles): **${data.tinType === "ein" ? `XX-XXX${data.taxIdLast4}` : `XXX-XX-${data.taxIdLast4}`}**`,
        `Dirección fiscal: ${fullAddress}`,
        `El Contratista certifica bajo pena de perjurio que: (1) el TIN provisto es correcto y emitido por el IRS, (2) no está sujeto a backup withholding, y (3) es ciudadano, residente fiscal de EE.UU., o entidad estadounidense con TIN válido (SSN, ITIN o EIN). Esta declaración satisface los requisitos del IRS Form W-9. El status migratorio del Contratista es irrelevante para este Acuerdo siempre que tenga un TIN válido.`,
      ],
    },
    {
      title: "8. Terminación",
      body: [
        "Cualquiera de las partes puede terminar este Acuerdo en cualquier momento, con o sin causa, mediante aviso escrito (email es suficiente).",
        "Tras la terminación: (a) los pagos de comisión sobre deals YA cerrados antes de la fecha de terminación se respetarán según el cronograma normal, (b) el Contratista perderá acceso a la plataforma y materiales de KLOSE, (c) las obligaciones de confidencialidad y no-competencia (Sección 5) sobreviven la terminación por 12 meses.",
      ],
    },
    {
      title: "9. Indemnización y Limitación de Responsabilidad",
      body: [
        "El Contratista indemnizará y mantendrá indemne a KLOSE, sus directores, empleados y afiliados, frente a cualquier reclamo, demanda, multa o pérdida derivada de: (a) violaciones por parte del Contratista a TCPA, leyes de licenciamiento de RE, o este Acuerdo, (b) tergiversación de información sobre propiedades o sellers, (c) actuación más allá del scope autorizado.",
        "La responsabilidad máxima de KLOSE frente al Contratista por cualquier reclamo bajo este Acuerdo se limita al monto total pagado al Contratista en los 12 meses anteriores al reclamo.",
      ],
    },
    {
      title: "10. Ley Aplicable y Resolución de Disputas",
      body: [
        "Este Acuerdo se rige por las leyes del Estado de Wyoming, EE.UU., sin atender a sus normas de conflicto de leyes.",
        "Cualquier disputa será resuelta por arbitraje vinculante administrado por la American Arbitration Association (AAA) en idioma español o inglés a elección del demandante, en Cheyenne, Wyoming.",
        "Las partes renuncian al derecho a juicio por jurado y a participar en acciones colectivas (class actions).",
      ],
    },
    {
      title: "11. Aceptación Electrónica",
      body: [
        "El Contratista acepta que su firma electrónica tipográfica, junto con el registro de su dirección IP, user-agent del navegador y timestamp, constituye una firma legalmente vinculante bajo el ESIGN Act (15 U.S.C. § 7001 et seq.) y el Uniform Electronic Transactions Act (UETA).",
        "Al hacer clic en \"Firmar y Aceptar\" abajo, el Contratista declara haber leído, comprendido y aceptado todos los términos de este Acuerdo.",
        `Fecha de aceptación: **${today}**.`,
      ],
    },
  ];
}
