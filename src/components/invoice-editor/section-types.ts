export type PaperSize = 'A4' | 'A5';

export type InvoiceType = 'proforma' | 'factura' | 'recibo' | 'orcamento';

export type SectionType = 
  | 'header' 
  | 'client' 
  | 'invoice_info' 
  | 'services' 
  | 'totals' 
  | 'payment' 
  | 'signatures' 
  | 'footer';

export interface SectionSettings {
  // Header
  logoPosition?: 'left' | 'center' | 'right';
  showNuit?: boolean;
  showPhone?: boolean;
  showAddress?: boolean;
  showSlogan?: boolean;
  slogan?: string;
  showEmail?: boolean;
  
  // Invoice Info
  invoiceType?: InvoiceType;
  showDueDate?: boolean;
  showValidity?: boolean;
  showTotalInHeader?: boolean;
  
  // Client
  showClientEmail?: boolean;
  showClientPhone?: boolean;
  showClientAddress?: boolean;
  showClientNuit?: boolean;
  
  // Services Table
  showQuantity?: boolean;
  showUnitPrice?: boolean;
  showRowNumbers?: boolean;
  
  // Totals
  showSubtotal?: boolean;
  showTax?: boolean;
  notesPosition?: 'left' | 'bottom';
  showNotes?: boolean;
  
  // Payment
  showPaymentProvider?: boolean;
  showPaymentAccount?: boolean;
  showPaymentRecipient?: boolean;
  showMultiplePaymentMethods?: boolean;
  paymentMethods?: Array<{
    provider: string;
    account: string;
  }>;
  
  // Signatures
  showClientSignature?: boolean;
  showAgencySignature?: boolean;
  clientSignatureLabel?: string;
  agencySignatureLabel?: string;
  
  // Footer
  footerText?: string;
  footerLegalText?: string;
  showThreeColumnFooter?: boolean;
}

export interface InvoiceSection {
  id: string;
  type: SectionType;
  label: string;
  description: string;
  order: number;
  visible: boolean;
  settings: SectionSettings;
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  proforma: 'PROFORMA',
  factura: 'FACTURA',
  recibo: 'RECIBO',
  orcamento: 'ORÇAMENTO',
};

export const DEFAULT_SECTIONS: InvoiceSection[] = [
  {
    id: 'header',
    type: 'header',
    label: 'Cabeçalho da Agência',
    description: 'Logo, nome, NUIT, slogan e contactos',
    order: 0,
    visible: true,
    settings: {
      logoPosition: 'right',
      showNuit: true,
      showPhone: true,
      showAddress: true,
      showSlogan: true,
      slogan: 'A sua agência de marketing digital',
      showEmail: true,
    },
  },
  {
    id: 'invoice_info',
    type: 'invoice_info',
    label: 'Informações da Factura',
    description: 'Tipo, número, data e validade',
    order: 1,
    visible: true,
    settings: {
      invoiceType: 'proforma',
      showDueDate: true,
      showValidity: true,
      showTotalInHeader: true,
    },
  },
  {
    id: 'client',
    type: 'client',
    label: 'Dados do Cliente',
    description: 'Nome, NUIT, contactos do cliente',
    order: 2,
    visible: true,
    settings: {
      showClientEmail: false,
      showClientPhone: false,
      showClientAddress: true,
      showClientNuit: true,
    },
  },
  {
    id: 'services',
    type: 'services',
    label: 'Tabela de Serviços',
    description: 'Lista numerada de serviços',
    order: 3,
    visible: true,
    settings: {
      showQuantity: true,
      showUnitPrice: true,
      showRowNumbers: true,
    },
  },
  {
    id: 'totals',
    type: 'totals',
    label: 'Notas e Totais',
    description: 'Notas à esquerda, totais à direita',
    order: 4,
    visible: true,
    settings: {
      showSubtotal: true,
      showTax: true,
      notesPosition: 'left',
      showNotes: true,
    },
  },
  {
    id: 'payment',
    type: 'payment',
    label: 'Dados de Pagamento',
    description: 'Múltiplos métodos de pagamento',
    order: 5,
    visible: true,
    settings: {
      showPaymentProvider: true,
      showPaymentAccount: true,
      showPaymentRecipient: true,
      showMultiplePaymentMethods: true,
    },
  },
  {
    id: 'signatures',
    type: 'signatures',
    label: 'Assinaturas',
    description: 'Campo para assinatura',
    order: 6,
    visible: true,
    settings: {
      showClientSignature: false,
      showAgencySignature: true,
      agencySignatureLabel: 'O Responsável',
    },
  },
  {
    id: 'footer',
    type: 'footer',
    label: 'Rodapé',
    description: 'Rodapé em 3 colunas',
    order: 7,
    visible: true,
    settings: {
      footerText: 'Obrigado pela preferência!',
      footerLegalText: 'Este documento não é válido para efeitos fiscais.',
      showThreeColumnFooter: true,
    },
  },
];
