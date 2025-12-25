export type PaperSize = 'A4' | 'A5';

export interface EditorElement {
  id: string;
  type: 'text' | 'variable' | 'image' | 'table' | 'line' | 'qrcode' | 'signature';
  variableKey?: string;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface TemplateLayout {
  paperSize: PaperSize;
  elements: EditorElement[];
}

export interface InvoiceVariable {
  key: string;
  label: string;
  category: 'agency' | 'client' | 'invoice' | 'misc';
  sampleValue: string;
}

export const INVOICE_VARIABLES: InvoiceVariable[] = [
  // Agency
  { key: 'agency_name', label: 'Nome da Agência', category: 'agency', sampleValue: 'Minha Agência, Lda' },
  { key: 'agency_nuit', label: 'NUIT', category: 'agency', sampleValue: '123456789' },
  { key: 'agency_phone', label: 'Telefone', category: 'agency', sampleValue: '+258 84 123 4567' },
  { key: 'agency_address', label: 'Sede', category: 'agency', sampleValue: 'Maputo, Moçambique' },
  { key: 'agency_representative', label: 'Representante', category: 'agency', sampleValue: 'João Silva' },
  { key: 'agency_position', label: 'Cargo do Representante', category: 'agency', sampleValue: 'Director Geral' },
  
  // Payment
  { key: 'payment_provider', label: 'Provedora de Pagamento', category: 'agency', sampleValue: 'M-Pesa' },
  { key: 'payment_account', label: 'Conta de Pagamento', category: 'agency', sampleValue: '84 123 4567' },
  { key: 'payment_recipient', label: 'Destinatário', category: 'agency', sampleValue: 'Agência XYZ, Lda' },
  
  // Client
  { key: 'client_company', label: 'Empresa do Cliente', category: 'client', sampleValue: 'Cliente ABC' },
  { key: 'client_contact', label: 'Nome do Contacto', category: 'client', sampleValue: 'Maria Santos' },
  { key: 'client_email', label: 'Email do Cliente', category: 'client', sampleValue: 'maria@cliente.com' },
  { key: 'client_phone', label: 'Telefone do Cliente', category: 'client', sampleValue: '+258 82 987 6543' },
  { key: 'client_address', label: 'Endereço do Cliente', category: 'client', sampleValue: 'Av. 25 de Setembro, Maputo' },
  
  // Invoice
  { key: 'invoice_number', label: 'Número da Factura', category: 'invoice', sampleValue: 'FAC-001' },
  { key: 'invoice_date', label: 'Data de Emissão', category: 'invoice', sampleValue: '25/12/2025' },
  { key: 'invoice_due_date', label: 'Data de Vencimento', category: 'invoice', sampleValue: '25/01/2026' },
  { key: 'invoice_subtotal', label: 'Subtotal', category: 'invoice', sampleValue: '15.000,00 MZN' },
  { key: 'invoice_tax', label: 'IVA', category: 'invoice', sampleValue: '2.400,00 MZN' },
  { key: 'invoice_total', label: 'Total', category: 'invoice', sampleValue: '17.400,00 MZN' },
  { key: 'invoice_notes', label: 'Observações', category: 'invoice', sampleValue: 'Pagamento via M-Pesa' },
  
  // Misc
  { key: 'current_date', label: 'Data Actual', category: 'misc', sampleValue: '25/12/2025' },
  { key: 'page_number', label: 'Número de Página', category: 'misc', sampleValue: '1' },
  { key: 'qrcode', label: 'Código QR', category: 'misc', sampleValue: '' },
  { key: 'signature_client', label: 'Assinatura do Cliente', category: 'misc', sampleValue: '_______________' },
  { key: 'signature_agency', label: 'Assinatura da Agência', category: 'misc', sampleValue: '_______________' },
];

export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number; label: string }> = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
};

// Scale factor to convert mm to pixels (at 96 DPI)
export const MM_TO_PX = 3.78;
