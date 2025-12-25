export type PaperSize = 'A4' | 'A5';

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
  
  // Client
  showEmail?: boolean;
  showClientPhone?: boolean;
  showClientAddress?: boolean;
  
  // Invoice Info
  showDueDate?: boolean;
  
  // Services Table
  showQuantity?: boolean;
  showUnitPrice?: boolean;
  
  // Totals
  showSubtotal?: boolean;
  showTax?: boolean;
  
  // Payment
  showPaymentProvider?: boolean;
  showPaymentAccount?: boolean;
  showPaymentRecipient?: boolean;
  
  // Signatures
  showClientSignature?: boolean;
  showAgencySignature?: boolean;
  clientSignatureLabel?: string;
  agencySignatureLabel?: string;
  
  // Footer
  footerText?: string;
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

export const DEFAULT_SECTIONS: InvoiceSection[] = [
  {
    id: 'header',
    type: 'header',
    label: 'Cabeçalho da Agência',
    description: 'Logo, nome, NUIT e contactos da agência',
    order: 0,
    visible: true,
    settings: {
      logoPosition: 'left',
      showNuit: true,
      showPhone: true,
      showAddress: true,
    },
  },
  {
    id: 'invoice_info',
    type: 'invoice_info',
    label: 'Informações da Factura',
    description: 'Número, data de emissão e vencimento',
    order: 1,
    visible: true,
    settings: {
      showDueDate: true,
    },
  },
  {
    id: 'client',
    type: 'client',
    label: 'Dados do Cliente',
    description: 'Nome, empresa, contactos do cliente',
    order: 2,
    visible: true,
    settings: {
      showEmail: true,
      showClientPhone: true,
      showClientAddress: true,
    },
  },
  {
    id: 'services',
    type: 'services',
    label: 'Tabela de Serviços',
    description: 'Lista de serviços com descrição e valores',
    order: 3,
    visible: true,
    settings: {
      showQuantity: true,
      showUnitPrice: true,
    },
  },
  {
    id: 'totals',
    type: 'totals',
    label: 'Totais',
    description: 'Subtotal, IVA e valor total',
    order: 4,
    visible: true,
    settings: {
      showSubtotal: true,
      showTax: true,
    },
  },
  {
    id: 'payment',
    type: 'payment',
    label: 'Dados de Pagamento',
    description: 'Informações bancárias e de pagamento',
    order: 5,
    visible: true,
    settings: {
      showPaymentProvider: true,
      showPaymentAccount: true,
      showPaymentRecipient: true,
    },
  },
  {
    id: 'signatures',
    type: 'signatures',
    label: 'Assinaturas',
    description: 'Campos para assinaturas',
    order: 6,
    visible: true,
    settings: {
      showClientSignature: true,
      showAgencySignature: true,
      clientSignatureLabel: 'O Cliente',
      agencySignatureLabel: 'A Agência',
    },
  },
  {
    id: 'footer',
    type: 'footer',
    label: 'Rodapé',
    description: 'Texto personalizado no final',
    order: 7,
    visible: true,
    settings: {
      footerText: 'Obrigado pela preferência!',
    },
  },
];
