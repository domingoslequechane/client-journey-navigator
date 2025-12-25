import jsPDF from 'jspdf';

interface InvoiceService {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  client: {
    companyName: string;
    contactName: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  agency: {
    name: string;
    nuit?: string;
    headquarters?: string;
    phone?: string;
    paymentProviderName?: string;
    paymentAccountNumber?: string;
    paymentRecipientName?: string;
  };
  services: InvoiceService[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  templateStyle?: 'modern' | 'classic' | 'minimal';
  primaryColor?: string;
  showWatermark?: boolean;
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [41, 98, 255]; // Default blue
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // Dynamic colors based on template
  const primaryColor = hexToRgb(data.primaryColor || '#2962FF');
  const textColor: [number, number, number] = [33, 33, 33];
  const mutedColor: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [245, 245, 245];
  const borderColor: [number, number, number] = [200, 200, 200];

  const style = data.templateStyle || 'modern';

  // Helper functions
  const formatCurrency = (value: number) => {
    return `${data.currency} ${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ============= WATERMARK (if enabled) =============
  if (data.showWatermark) {
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('ORIGINAL', pageWidth / 2, pageHeight / 2, { 
      align: 'center', 
      angle: 45 
    });
  }

  // ============= HEADER =============
  if (style === 'modern') {
    // Modern style - colored header bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.agency.name.toUpperCase(), margin, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const agencyInfo = [];
    if (data.agency.nuit) agencyInfo.push(`NUIT: ${data.agency.nuit}`);
    if (data.agency.headquarters) agencyInfo.push(data.agency.headquarters);
    if (data.agency.phone) agencyInfo.push(`Tel: ${data.agency.phone}`);
    doc.text(agencyInfo.join('  •  '), margin, 28);
    y = 45;
  } else if (style === 'classic') {
    // Classic style - bordered header
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 30);
    
    doc.setTextColor(...textColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.agency.name, margin + 5, y + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    const agencyInfo = [];
    if (data.agency.nuit) agencyInfo.push(`NUIT: ${data.agency.nuit}`);
    if (data.agency.headquarters) agencyInfo.push(data.agency.headquarters);
    if (data.agency.phone) agencyInfo.push(`Tel: ${data.agency.phone}`);
    doc.text(agencyInfo.join('  |  '), margin + 5, y + 22);
    y = 55;
  } else {
    // Minimal style - simple text
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(data.agency.name, margin, y + 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    y += 12;
    const agencyInfo = [];
    if (data.agency.nuit) agencyInfo.push(`NUIT: ${data.agency.nuit}`);
    if (data.agency.headquarters) agencyInfo.push(data.agency.headquarters);
    if (data.agency.phone) agencyInfo.push(`Tel: ${data.agency.phone}`);
    doc.text(agencyInfo.join('  •  '), margin, y);
    y += 10;
    
    // Thin separator line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + contentWidth, y);
    y += 10;
  }

  // ============= INVOICE TITLE =============
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA DE PRESTAÇÃO DE SERVIÇOS', margin, y);
  
  // ============= INVOICE DETAILS BOX (right side) =============
  const detailsBoxWidth = 75;
  const detailsBoxX = pageWidth - margin - detailsBoxWidth;
  const detailsBoxY = y - 8;
  
  if (style !== 'minimal') {
    doc.setFillColor(...lightGray);
    doc.roundedRect(detailsBoxX, detailsBoxY, detailsBoxWidth, data.dueDate ? 32 : 24, 2, 2, 'F');
  }
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Nº da Factura:', detailsBoxX + 3, detailsBoxY + 8);
  doc.text('Data de Emissão:', detailsBoxX + 3, detailsBoxY + 16);
  if (data.dueDate) {
    doc.text('Data de Vencimento:', detailsBoxX + 3, detailsBoxY + 24);
  }
  
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.invoiceNumber, detailsBoxX + detailsBoxWidth - 3, detailsBoxY + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.issueDate), detailsBoxX + detailsBoxWidth - 3, detailsBoxY + 16, { align: 'right' });
  if (data.dueDate) {
    doc.text(formatDate(data.dueDate), detailsBoxX + detailsBoxWidth - 3, detailsBoxY + 24, { align: 'right' });
  }

  // ============= CLIENT INFO =============
  y += 12;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURAR A:', margin, y);
  
  y += 6;
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.companyName, margin, y);
  
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Att: ${data.client.contactName}`, margin, y);
  
  y += 4;
  if (data.client.phone) {
    doc.text(`Tel: ${data.client.phone}`, margin, y);
    y += 4;
  }
  if (data.client.email) {
    doc.text(`Email: ${data.client.email}`, margin, y);
    y += 4;
  }
  if (data.client.address) {
    doc.text(data.client.address, margin, y);
    y += 4;
  }

  // ============= SERVICES TABLE =============
  y += 10;
  
  // Table Header
  const colWidths = [85, 20, 35, 35];
  
  if (style === 'modern') {
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, y, contentWidth, 10, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
  } else if (style === 'classic') {
    doc.setFillColor(...lightGray);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setDrawColor(...borderColor);
    doc.rect(margin, y, contentWidth, 10, 'S');
    doc.setTextColor(...textColor);
  } else {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 10, margin + contentWidth, y + 10);
    doc.setTextColor(...textColor);
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  let x = margin + 3;
  doc.text('DESCRIÇÃO', x, y + 7);
  x += colWidths[0];
  doc.text('QTD', x, y + 7);
  x += colWidths[1];
  doc.text('PREÇO UNIT.', x, y + 7);
  x += colWidths[2];
  doc.text('TOTAL', x, y + 7);

  y += 10;
  
  // Table Body
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  data.services.forEach((service, index) => {
    const rowHeight = 9;
    
    if (style !== 'minimal' && index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    
    if (style === 'classic') {
      doc.setDrawColor(...borderColor);
      doc.rect(margin, y, contentWidth, rowHeight, 'S');
    }
    
    x = margin + 3;
    doc.text(service.description.substring(0, 42), x, y + 6);
    x += colWidths[0];
    doc.text(String(service.quantity), x + 5, y + 6);
    x += colWidths[1];
    doc.text(formatCurrency(service.unit_price), x, y + 6);
    x += colWidths[2];
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(service.total), x, y + 6);
    doc.setFont('helvetica', 'normal');
    
    y += rowHeight;
  });

  // ============= TOTALS SECTION =============
  y += 8;
  
  const totalsWidth = 80;
  const totalsX = pageWidth - margin - totalsWidth;
  
  // Subtotal
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text('Subtotal:', totalsX, y);
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: 'right' });
  
  // Tax
  if (data.taxPercentage > 0) {
    y += 7;
    doc.setTextColor(...mutedColor);
    doc.text(`IVA (${data.taxPercentage}%):`, totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.taxAmount), pageWidth - margin, y, { align: 'right' });
  }
  
  // Total Box
  y += 10;
  
  if (style === 'modern') {
    doc.setFillColor(...primaryColor);
    doc.roundedRect(totalsX - 5, y - 5, totalsWidth + 5, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
  } else if (style === 'classic') {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.rect(totalsX - 5, y - 5, totalsWidth + 5, 12, 'S');
    doc.setTextColor(...primaryColor);
  } else {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 5, y - 5, pageWidth - margin, y - 5);
    doc.line(totalsX - 5, y + 7, pageWidth - margin, y + 7);
    doc.setTextColor(...primaryColor);
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, y + 3);
  doc.text(formatCurrency(data.total), pageWidth - margin, y + 3, { align: 'right' });

  // ============= PAYMENT INFORMATION =============
  const hasPaymentInfo = data.agency.paymentProviderName || data.agency.paymentAccountNumber || data.agency.paymentRecipientName;
  
  if (hasPaymentInfo) {
    y += 20;
    
    if (style === 'modern') {
      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, y - 3, contentWidth, 40, 3, 3, 'F');
    } else if (style === 'classic') {
      doc.setDrawColor(...borderColor);
      doc.rect(margin, y - 3, contentWidth, 40, 'S');
    }
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DE PAGAMENTO', margin + 5, y + 5);
    
    y += 12;
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    
    const paymentStartX = margin + 5;
    const paymentLabelWidth = 55;
    
    if (data.agency.paymentProviderName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Nome da Provedora:', paymentStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.agency.paymentProviderName, paymentStartX + paymentLabelWidth, y);
      y += 6;
    }
    
    if (data.agency.paymentAccountNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text('Número de Conta:', paymentStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.agency.paymentAccountNumber, paymentStartX + paymentLabelWidth, y);
      y += 6;
    }
    
    if (data.agency.paymentRecipientName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Nome do Destinatário:', paymentStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.agency.paymentRecipientName, paymentStartX + paymentLabelWidth, y);
    }
  }

  // ============= NOTES =============
  if (data.notes) {
    y += 20;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const splitNotes = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(splitNotes, margin, y);
  }

  // ============= SIGNATURE AREA =============
  y = pageHeight - 55;
  
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  
  // Left signature
  doc.line(margin, y, margin + 70, y);
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Cliente', margin, y + 5);
  
  // Right signature
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
  doc.text('Assinatura da Agência', pageWidth - margin - 70, y + 5);

  // ============= FOOTER =============
  const footerY = pageHeight - 12;
  
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(7);
  doc.text('Documento gerado electronicamente  •  Página 1 de 1', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData, filename?: string): void {
  const doc = generateInvoicePDF(data);
  const name = filename || `Factura_${data.invoiceNumber}_${data.client.companyName.replace(/\s+/g, '_')}.pdf`;
  doc.save(name);
}
