// Intelligent column mapping for PropWire / PropStream imports
// Handles CSV and XLSX, variations in column names, casing, and common abbreviations
import * as XLSX from 'xlsx';

export interface PropertyField {
  key: string;
  label: string;
  aliases: string[];
  required: boolean;
  transform?: (value: string) => any;
}

// Normalize string for comparison: lowercase, remove spaces/underscores/dashes/parentheses
const normalize = (str: string): string => {
  return str.toLowerCase().replace(/[\s_\-\.\(\)#]/g, '').trim();
};

// Property fields with their aliases for intelligent matching
export const propertyFields: PropertyField[] = [
  {
    key: 'address',
    label: 'Dirección',
    aliases: ['address', 'propertyaddress', 'streetaddress', 'street', 'direccion', 'situsaddress', 'situs'],
    required: true,
  },
  {
    key: 'city',
    label: 'Ciudad',
    aliases: ['city', 'ciudad', 'situscity', 'propertycity'],
    required: true,
  },
  {
    key: 'state',
    label: 'Estado',
    aliases: ['state', 'estado', 'situsstate', 'propertystate', 'st'],
    required: true,
  },
  {
    key: 'zip_code',
    label: 'Código Postal',
    aliases: ['zip', 'zipcode', 'postalcode', 'zip5', 'situszip', 'propertyzip', 'codigopostal'],
    required: true,
  },
  {
    key: 'owner_first_name',
    label: 'Nombre del Propietario',
    aliases: ['owner1firstname', 'ownerfirstname', 'firstname', 'ownername', 'owner', 'propietario'],
    required: false,
  },
  {
    key: 'owner_last_name',
    label: 'Apellido del Propietario',
    aliases: ['owner1lastname', 'ownerlastname', 'lastname', 'apellido'],
    required: false,
  },
  {
    key: 'owner_phone',
    label: 'Teléfono',
    aliases: ['phone1', 'phone', 'ownerphone', 'phonenumber', 'tel', 'telefono', 'mobile', 'cell'],
    required: false,
  },
  {
    key: 'owner_email',
    label: 'Email',
    aliases: ['email1', 'email', 'owneremail', 'emailaddress', 'correo', 'mail'],
    required: false,
  },
  {
    key: 'property_type',
    label: 'Tipo de Propiedad',
    aliases: ['propertytype', 'type', 'proptype', 'landuse', 'usetype', 'tipo', 'tipopropiedad'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      if (normalized.includes('single') || normalized.includes('sfr') || normalized.includes('sfd') || normalized.includes('singlefamilyresidence') || normalized.includes('singlefamilyresidential')) return 'single_family';
      if (normalized.includes('multi') || normalized.includes('duplex') || normalized.includes('triplex') || normalized.includes('2units')) return 'multi_family';
      if (normalized.includes('condo')) return 'condo';
      if (normalized.includes('town')) return 'townhouse';
      if (normalized.includes('land') || normalized.includes('lot')) return 'land';
      if (normalized.includes('commercial') || normalized.includes('retail') || normalized.includes('office')) return 'commercial';
      return 'single_family';
    },
  },
  {
    key: 'bedrooms',
    label: 'Habitaciones',
    aliases: ['bedrooms', 'beds', 'bed', 'br', 'habitaciones', 'recamaras', 'bedroomcount'],
    required: false,
    transform: (value: string) => parseInt(value) || null,
  },
  {
    key: 'bathrooms',
    label: 'Baños',
    aliases: ['totalbathrooms', 'bathrooms', 'baths', 'bath', 'ba', 'banos', 'bathroomcount', 'fullbaths'],
    required: false,
    transform: (value: string) => parseFloat(value) || null,
  },
  {
    key: 'sqft',
    label: 'Pies Cuadrados',
    aliases: ['buildingsqft', 'sqft', 'squarefeet', 'sqfeet', 'livingsquarefeet', 'livingarea', 'buildingarea', 'grossarea', 'area', 'size'],
    required: false,
    transform: (value: string) => parseInt(value.replace(/,/g, '')) || null,
  },
  {
    key: 'lot_size',
    label: 'Tamaño del Lote',
    aliases: ['lotsizesqft', 'lotacres', 'lotsize', 'lotsqft', 'lotarea', 'landarea', 'acreage', 'acres'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/,/g, '')) || null,
  },
  {
    key: 'year_built',
    label: 'Año de Construcción',
    aliases: ['effectiveyearbuilt', 'yearbuilt', 'year', 'built', 'yrbuilt', 'constructionyear', 'anoconstruccion'],
    required: false,
    transform: (value: string) => {
      const year = parseInt(value);
      return year > 1800 && year <= new Date().getFullYear() ? year : null;
    },
  },
  {
    key: 'arv',
    label: 'ARV (Valor Estimado)',
    // CRITICAL: "estvalue" matches PropStream "Est. Value". 
    // DO NOT include "assessedvalue" or "totalassessedvalue" — those are tax assessments, not market value.
    aliases: ['arv', 'estvalue', 'estimatedvalue', 'marketvalue', 'avm', 'fairmarketvalue'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/[$,]/g, '')) || null,
  },
  {
    key: 'equity_percent',
    label: 'Porcentaje de Equity',
    aliases: ['estimatedequitypercent', 'equitypercent', 'equitypct', 'estequitypercent', 'equitypercentage'],
    required: false,
    transform: (value: string) => {
      const num = parseFloat(value.replace(/%/g, ''));
      if (isNaN(num)) return null;
      if (num > 100) return null;
      return num;
    },
  },
  {
    key: 'est_ltv',
    label: 'Loan-to-Value Estimado',
    // PropStream: "Est. Loan-to-Value" → normalize → "estloantovalue"
    aliases: ['estloantovalue', 'loantovalue', 'ltv', 'ltvpercent', 'estltv', 'estimatedltv', 'estimatedloantovalue'],
    required: false,
    transform: (value: string) => {
      const num = parseFloat(value.replace(/%/g, ''));
      if (isNaN(num) || num < 0) return null;
      return num;
    },
  },
  {
    key: 'est_equity_dollars',
    label: 'Equity Estimado ($)',
    // PropStream: "Est. Equity" → normalize → "estequity"
    aliases: ['estequity', 'estimatedequity', 'equitydollars'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/[$,]/g, '')) || null,
  },
  {
    key: 'owner_tenure_months',
    label: 'Tiempo de Tenencia (Meses)',
    aliases: ['ownershiplengthmonths', 'tenuremonths', 'ownertenure', 'monthsowned'],
    required: false,
    transform: (value: string) => {
      const months = parseInt(value);
      return !isNaN(months) ? Math.floor(months / 12) : null;
    },
  },
  {
    key: 'owner_type',
    label: 'Tipo de Propietario',
    aliases: ['ownertype', 'ownershiptype', 'entitytype'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      if (normalized === 'individual' || normalized === 'person') return 'individual';
      if (normalized === 'company' || normalized === 'llc' || normalized === 'corporation' || normalized === 'corp') return 'corporation';
      if (normalized === 'trust') return 'trust';
      if (normalized === 'estate') return 'estate';
      return null;
    },
  },
  {
    key: 'is_absentee_owner',
    label: 'Propietario Ausente',
    aliases: ['absentee', 'absenteeowner', 'outofstate', 'outofarea', 'ausente'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      if (normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1' || normalized === 'absentee') return true;
      if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0' || normalized === '') return false;
      return null;
    },
  },
  {
    key: 'owner_occupied',
    label: 'Ocupado por Propietario',
    aliases: ['owneroccupied', 'owneroccupancy', 'occupied'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      if (normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1') return false;
      if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0' || normalized === '') return true;
      return null;
    },
  },
  {
    key: 'tax_delinquent',
    label: 'Impuestos Atrasados',
    aliases: ['taxdelinquent', 'delinquent', 'taxlien', 'taxdefault', 'impuestosatrasados', 'istaxdelinquent', 'taxdelinquentflag', 'taxstatus'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      return normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1';
    },
  },
  {
    key: 'is_foreclosure',
    label: 'En Foreclosure',
    aliases: ['foreclosure', 'preforeclosure', 'reo', 'bankowned', 'foreclosing', 'nod', 'lis', 'inforeclosure', 'isforeclosure', 'foreclosurestatus'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      return normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1';
    },
  },
  {
    key: 'foreclosure_factor',
    label: 'Factor de Foreclosure',
    // PropStream: "Foreclosure Factor" → normalize → "foreclosurefactor"
    aliases: ['foreclosurefactor', 'foreclosurescore', 'foreclosurerisk'],
    required: false,
    transform: (value: string) => {
      if (!value || value.trim() === '') return null;
      return value.trim();
    },
  },
  {
    key: 'is_probate',
    label: 'Probate/Herencia',
    aliases: ['probate', 'inheritance', 'deceased', 'herencia'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      return normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1';
    },
  },
  {
    key: 'last_sale_date',
    label: 'Última Fecha de Venta',
    aliases: ['lastsalerecordingdate', 'lastsaledate', 'saledate', 'solddate', 'transferdate', 'fechaventa'],
    required: false,
    transform: (value: string) => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    },
  },
  {
    key: 'last_sale_price',
    label: 'Último Precio de Venta',
    aliases: ['lastsaleamount', 'lastsaleprice', 'saleprice', 'soldprice', 'lastprice', 'precioventa', 'saleamount'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/[$,]/g, '')) || null,
  },
  {
    key: 'mailing_address_different',
    label: 'Dirección de Correo Diferente',
    aliases: ['mailingdifferent', 'differentmailing', 'mailaddressdifferent'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      return normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1';
    },
  },
  {
    key: 'tax_debt',
    label: 'Deuda de Impuestos',
    aliases: ['taxdebt', 'taxowed', 'taxbalance', 'delinquentamount', 'deudaimpuestos', 'lienamount'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/[$,]/g, '')) || null,
  },
  {
    key: 'owner_mailing_state',
    label: 'Estado Correo del Propietario',
    aliases: ['mailingstate', 'ownermailingstate', 'mailstate'],
    required: false,
  },
  {
    key: 'owner_mailing_city',
    label: 'Ciudad Correo del Propietario',
    aliases: ['mailingcity', 'ownermailingcity', 'mailcity'],
    required: false,
  },
  {
    key: 'is_vacant',
    label: 'Vacante',
    aliases: ['vacant', 'isvacant', 'vacante', 'vacancy', 'propertystatus'],
    required: false,
    transform: (value: string) => {
      const normalized = normalize(value);
      return normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1';
    },
  },
  {
    key: 'ownership_months',
    label: 'Tenencia en Meses',
    aliases: ['ownershiplengthmonths', 'ownershipmonths', 'tenuremonths', 'monthsowned', 'ownershiplength'],
    required: false,
    transform: (value: string) => parseInt(value) || null,
  },
  {
    key: 'days_on_market',
    label: 'Días en el Mercado',
    aliases: ['daysonmarket', 'dom', 'daysonmls', 'marketdays', 'cdom'],
    required: false,
    transform: (value: string) => parseInt(value) || null,
  },
  {
    key: 'mls_status',
    label: 'Estado MLS',
    // PropStream: "MLS Status" → normalize → "mlsstatus"
    aliases: ['mlsstatus', 'listingstatus', 'mlslistingstatus'],
    required: false,
    transform: (value: string) => {
      if (!value || value.trim() === '') return null;
      return value.trim().toUpperCase();
    },
  },
  {
    key: 'mls_date',
    label: 'Fecha MLS',
    // PropStream: "MLS Date" → normalize → "mlsdate"
    aliases: ['mlsdate', 'listingdate', 'mlslistingdate'],
    required: false,
    transform: (value: string) => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    },
  },
  {
    key: 'mls_amount',
    label: 'Precio MLS',
    // PropStream: "MLS Amount" → normalize → "mlsamount"
    aliases: ['mlsamount', 'mlsprice', 'listingprice', 'listprice', 'askingprice'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/[$,]/g, '')) || null,
  },
  {
    key: 'total_open_loans',
    label: 'Préstamos Abiertos',
    aliases: ['totalopenloans', 'openloans', 'numberofloans', 'loancount'],
    required: false,
    transform: (value: string) => parseInt(value) || null,
  },
  {
    key: 'est_remaining_balance',
    label: 'Balance Restante Estimado',
    aliases: ['estremainingbalanceofopenloans', 'remainingbalance', 'mortgagebalance', 'loanbalance', 'estremainingbalance', 'openmortgagebalance', 'openmortgagebal', 'estremainingbal', 'estimatedremainingbalance', 'totalloansbalance', 'estimatedremainingbalanceofopenloans', 'estremainingbalancetotal'],
    required: false,
    transform: (value: string) => parseFloat(value.replace(/[$,]/g, '')) || null,
  },
  {
    key: 'auction_date',
    label: 'Fecha de Subasta',
    aliases: ['auctiondate', 'foreclosuresaledate', 'saledateforeclosure', 'trusteedatesale', 'sheriffsaledate', 'foreclosureauctiondate', 'trusteesaledate', 'foreclosuresale'],
    required: false,
    transform: (value: string) => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    },
  },
  // === Multi-phone support (PropStream exports Phone 1-5) ===
  {
    key: 'phone_2',
    label: 'Teléfono 2',
    aliases: ['phone2'],
    required: false,
  },
  {
    key: 'phone_3',
    label: 'Teléfono 3',
    aliases: ['phone3'],
    required: false,
  },
  {
    key: 'phone_4',
    label: 'Teléfono 4',
    aliases: ['phone4'],
    required: false,
  },
  {
    key: 'phone_5',
    label: 'Teléfono 5',
    aliases: ['phone5'],
    required: false,
  },
  // === DNC flags ===
  {
    key: 'phone_1_dnc',
    label: 'Phone 1 DNC',
    aliases: ['phone1dnc'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'dnc' || n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  {
    key: 'phone_2_dnc',
    label: 'Phone 2 DNC',
    aliases: ['phone2dnc'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'dnc' || n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  {
    key: 'phone_3_dnc',
    label: 'Phone 3 DNC',
    aliases: ['phone3dnc'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'dnc' || n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  {
    key: 'phone_4_dnc',
    label: 'Phone 4 DNC',
    aliases: ['phone4dnc'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'dnc' || n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  {
    key: 'phone_5_dnc',
    label: 'Phone 5 DNC',
    aliases: ['phone5dnc'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'dnc' || n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  // === Property Condition ===
  {
    key: 'property_condition',
    label: 'Condición General',
    aliases: ['totalcondition', 'propertycondition', 'overallcondition', 'condition'],
    required: false,
  },
  {
    key: 'exterior_condition',
    label: 'Condición Exterior',
    aliases: ['exteriorcondition'],
    required: false,
  },
  // === Compliance flags ===
  {
    key: 'is_litigator',
    label: 'Litigante',
    aliases: ['litigator', 'islitigator'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  {
    key: 'do_not_mail',
    label: 'Do Not Mail',
    aliases: ['donotmail', 'dnm', 'nomailing'],
    required: false,
    transform: (value: string) => {
      const n = normalize(value);
      return n === 'yes' || n === 'y' || n === 'true' || n === '1';
    },
  },
  // === Property identification ===
  {
    key: 'county',
    label: 'Condado',
    aliases: ['county', 'condado'],
    required: false,
  },
  {
    key: 'apn',
    label: 'APN (Parcel Number)',
    aliases: ['apn', 'parcelnumber', 'parcelid', 'assessorparcelnumber'],
    required: false,
  },
];

export interface ColumnMapping {
  csvColumn: string;
  propertyField: string | null;
  confidence: number;
}

// Find the best matching property field for a CSV column
export const findBestMatch = (csvColumn: string): { field: string | null; confidence: number } => {
  const normalizedColumn = normalize(csvColumn);
  
  let bestMatch: { field: string | null; confidence: number } = { field: null, confidence: 0 };
  
  for (const field of propertyFields) {
    // Check exact match with key
    if (normalizedColumn === normalize(field.key)) {
      return { field: field.key, confidence: 100 };
    }
    
    // Check aliases
    for (const alias of field.aliases) {
      const normalizedAlias = normalize(alias);
      
      // Exact alias match
      if (normalizedColumn === normalizedAlias) {
        return { field: field.key, confidence: 100 };
      }
      
      // Partial match - alias is contained in column or vice versa
      if (normalizedColumn.includes(normalizedAlias) || normalizedAlias.includes(normalizedColumn)) {
        const confidence = Math.min(normalizedAlias.length, normalizedColumn.length) / 
                          Math.max(normalizedAlias.length, normalizedColumn.length) * 80;
        if (confidence > bestMatch.confidence) {
          bestMatch = { field: field.key, confidence };
        }
      }
    }
  }
  
  return bestMatch;
};

// Auto-map all CSV columns to property fields
export const autoMapColumns = (csvColumns: string[]): ColumnMapping[] => {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();
  
  for (const csvColumn of csvColumns) {
    const { field, confidence } = findBestMatch(csvColumn);
    
    // Only use the mapping if confidence is high enough and field hasn't been used
    if (field && confidence >= 50 && !usedFields.has(field)) {
      mappings.push({ csvColumn, propertyField: field, confidence });
      usedFields.add(field);
    } else {
      mappings.push({ csvColumn, propertyField: null, confidence: 0 });
    }
  }
  
  return mappings;
};

// Transform a CSV row to a property object using the mappings
export const transformRow = (
  row: Record<string, string>,
  mappings: ColumnMapping[]
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const mapping of mappings) {
    if (mapping.propertyField) {
      const field = propertyFields.find(f => f.key === mapping.propertyField);
      const rawValue = row[mapping.csvColumn];
      
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        result[mapping.propertyField] = field?.transform 
          ? field.transform(rawValue) 
          : rawValue.trim();
      }
    }
  }
  
  return result;
};

// Validate that required fields are mapped
export const validateMappings = (mappings: ColumnMapping[]): string[] => {
  const errors: string[] = [];
  const mappedFields = new Set(mappings.filter(m => m.propertyField).map(m => m.propertyField));
  
  for (const field of propertyFields) {
    if (field.required && !mappedFields.has(field.key)) {
      errors.push(`Campo requerido no mapeado: ${field.label}`);
    }
  }
  
  return errors;
};

// Parse CSV text to array of objects
export const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Detect delimiter (comma, semicolon, or tab)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : 
                   firstLine.includes(';') ? ';' : ',';
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  return { headers, rows };
};

// Parse XLSX/XLS binary data to array of objects
export const parseXLSX = (data: Uint8Array): { headers: string[]; rows: Record<string, string>[] } => {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Get raw JSON with all values as strings
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
  
  if (jsonData.length === 0) return { headers: [], rows: [] };
  
  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map(row => {
    const stringRow: Record<string, string> = {};
    for (const key of headers) {
      const val = row[key];
      stringRow[key] = val !== null && val !== undefined ? String(val) : '';
    }
    return stringRow;
  });
  
  return { headers, rows };
};
