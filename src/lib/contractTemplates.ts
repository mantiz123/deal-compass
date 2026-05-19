export interface ContractField {
  key: string;
  label: string;
  source: 'auto' | 'manual';
  autoField?: string; // dot path to lead data
  defaultValue?: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export interface ContractTemplate {
  type: 'AB' | 'BC' | 'AMENDMENT' | 'DC';
  name: string;
  description: string;
  icon: string;
  fields: ContractField[];
}

export const AB_CONTRACT_FIELDS: ContractField[] = [
  { key: 'seller_name', label: 'Seller Name', source: 'auto', autoField: 'property.owner_name', required: true },
  { key: 'property_address', label: 'Property Address', source: 'auto', autoField: 'property.address', required: true },
  { key: 'property_city', label: 'City', source: 'auto', autoField: 'property.city', required: true },
  { key: 'property_county', label: 'County', source: 'auto', autoField: 'property.county' },
  { key: 'property_state', label: 'State', source: 'auto', autoField: 'property.state', required: true },
  { key: 'sale_price', label: 'Sale Price ($)', source: 'auto', autoField: 'property.mao', type: 'number', required: true },
  { key: 'title_company', label: 'Title Company', source: 'manual', required: true },
  { key: 'closing_days', label: 'Closing Days (business days)', source: 'manual', defaultValue: '30', type: 'number' },
  { key: 'due_diligence_days', label: 'Due Diligence Days', source: 'manual', defaultValue: '10', type: 'number' },
  { key: 'not_included_items', label: 'Items NOT Included', source: 'manual', defaultValue: 'None' },
  { key: 'special_provisions', label: 'Special Provisions', source: 'manual', type: 'textarea' },
  // Seller Info Worksheet fields
  { key: 'seller_dob', label: 'Date of Birth', source: 'manual', type: 'date' },
  { key: 'seller_phone', label: 'Phone Number', source: 'auto', autoField: 'property.owner_phone' },
  { key: 'seller_email', label: 'Email', source: 'auto', autoField: 'property.owner_email' },
  { key: 'marital_status', label: 'Marital Status', source: 'manual', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'] },
  { key: 'spouse_name', label: 'Spouse Name', source: 'manual' },
];

export const BC_CONTRACT_FIELDS: ContractField[] = [
  { key: 'seller_name', label: 'Seller Name', source: 'auto', autoField: 'property.owner_name', required: true },
  { key: 'property_address', label: 'Property Address (full)', source: 'auto', autoField: 'property.address', required: true },
  { key: 'property_city', label: 'City', source: 'auto', autoField: 'property.city' },
  { key: 'property_state', label: 'State', source: 'auto', autoField: 'property.state' },
  { key: 'assignee_name', label: 'Assignee Name (Buyer)', source: 'manual', required: true },
  { key: 'buyer_email', label: 'Buyer Email', source: 'manual', type: 'text', required: true },
  { key: 'buyer_phone', label: 'Buyer Phone', source: 'manual', type: 'text' },
  { key: 'total_assignment_amount', label: 'Total Assignment Amount ($)', source: 'manual', type: 'number', required: true },
  { key: 'payment_method', label: 'Payment Method', source: 'manual', type: 'select', options: ['Cash', 'Private or Hard Money Lending', 'Conventional Lending'], required: true },
  { key: 'lender_name', label: 'Lender Name', source: 'manual' },
  { key: 'lender_contact', label: 'Lender Contact Name', source: 'manual' },
  { key: 'lender_email', label: 'Lender Email', source: 'manual' },
  { key: 'lender_phone', label: 'Lender Phone', source: 'manual' },
  { key: 'option_fee', label: 'Non-Refundable Option Fee ($)', source: 'auto', type: 'number' },
  { key: 'closing_date', label: 'Closing Date', source: 'manual', type: 'date', required: true },
  { key: 'title_company', label: 'Title Company', source: 'manual', required: true },
  { key: 'exceptions', label: 'Condition Exceptions', source: 'manual', defaultValue: 'None' },
  { key: 'special_provisions', label: 'Special Provisions', source: 'manual', type: 'textarea' },
];

export const DC_CONTRACT_FIELDS: ContractField[] = [
  // Property (auto-filled from lead)
  { key: 'seller_name', label: 'Seller Name', source: 'auto', autoField: 'property.owner_name', required: true },
  { key: 'property_address', label: 'Property Address', source: 'auto', autoField: 'property.address', required: true },
  { key: 'property_city', label: 'City', source: 'auto', autoField: 'property.city' },
  { key: 'property_county', label: 'County', source: 'auto', autoField: 'property.county' },
  { key: 'property_state', label: 'State', source: 'auto', autoField: 'property.state' },
  // A→B Leg (Seller → Klose) — CONFIDENTIAL
  { key: 'ab_price', label: 'A→B Price (Klose pays Seller) — CONFIDENTIAL', source: 'auto', autoField: 'property.mao', type: 'number', required: true },
  { key: 'closing_days', label: 'Days to Close (A→B leg)', source: 'manual', defaultValue: '30', type: 'number' },
  { key: 'seller_phone', label: 'Seller Phone', source: 'auto', autoField: 'property.owner_phone' },
  { key: 'seller_email', label: 'Seller Email', source: 'auto', autoField: 'property.owner_email' },
  // B→C Leg (Klose → End Buyer)
  { key: 'buyer_name', label: 'End Buyer Name', source: 'manual', required: true },
  { key: 'buyer_email', label: 'End Buyer Email', source: 'manual', type: 'text', required: true },
  { key: 'buyer_phone', label: 'End Buyer Phone', source: 'manual', type: 'text' },
  { key: 'bc_price', label: 'B→C Price (Buyer pays Klose)', source: 'manual', type: 'number', required: true },
  { key: 'closing_date', label: 'Simultaneous Closing Date', source: 'manual', type: 'date', required: true },
  // Shared
  { key: 'title_company', label: 'Title Company', source: 'manual', required: true },
  { key: 'transactional_funding', label: 'Transactional Funding Source', source: 'manual', defaultValue: 'Self-funded / Hard Money' },
  { key: 'special_provisions', label: 'Special Provisions', source: 'manual', type: 'textarea' },
];

export const AMENDMENT_FIELDS: ContractField[] = [
  { key: 'seller_name', label: 'Seller Name', source: 'auto', autoField: 'property.owner_name', required: true },
  { key: 'property_address', label: 'Property Address (full)', source: 'auto', autoField: 'property.address', required: true },
  { key: 'binding_agreement_date', label: 'Original Agreement Date', source: 'manual', type: 'date', required: true },
  { key: 'new_purchase_price', label: 'New Purchase Price ($)', source: 'manual', type: 'number' },
  { key: 'new_closing_date', label: 'New Closing / Due Diligence Date', source: 'manual', type: 'date' },
  { key: 'additional_terms', label: 'Additional Terms', source: 'manual', type: 'textarea' },
];

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    type: 'AB',
    name: 'AB Contract (Purchase & Sale)',
    description: 'Use when buying from seller — Standard Purchase and Sale Agreement',
    icon: '📋',
    fields: AB_CONTRACT_FIELDS,
  },
  {
    type: 'BC',
    name: 'BC Contract (Assignment)',
    description: 'Use when assigning to a buyer — Assignment of Purchase Agreement',
    icon: '📤',
    fields: BC_CONTRACT_FIELDS,
  },
  {
    type: 'DC',
    name: 'Double Close (A→B / B→C)',
    description: 'Simultaneous double close — Klose buys from Seller and sells to Buyer same day. A→B price stays private.',
    icon: '🔄',
    fields: DC_CONTRACT_FIELDS,
  },
  {
    type: 'AMENDMENT',
    name: 'Amendment',
    description: 'Modifica precio, fecha de cierre o terminos de un AB Contract existente',
    icon: '✏️',
    fields: AMENDMENT_FIELDS,
  },
];

export function getFieldsForType(type: 'AB' | 'BC' | 'AMENDMENT' | 'DC'): ContractField[] {
  const template = CONTRACT_TEMPLATES.find(t => t.type === type);
  return template?.fields || [];
}

export function autoFillFields(
  fields: ContractField[],
  leadData: any,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (field.source === 'auto' && field.autoField) {
      const parts = field.autoField.split('.');
      let value = leadData;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value !== null && value !== undefined) {
        values[field.key] = String(value);
      }
    }
    if (field.defaultValue && !values[field.key]) {
      values[field.key] = field.defaultValue;
    }
    // Auto-calculate option fee for BC
    if (field.key === 'option_fee' && leadData?.property?.mao) {
      const mao = Number(leadData.property.mao);
      if (mao <= 50000) values[field.key] = '2500';
      else if (mao <= 200000) values[field.key] = '5000';
      else values[field.key] = '10000';
    }
  }
  return values;
}
