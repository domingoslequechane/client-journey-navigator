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
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Colors
  const primaryColor: [number, number, number] = [41, 98, 255]; // Blue
  const textColor: [number, number, number] = [51, 51, 51];
  const mutedColor: [number, number, number] = [128, 128, 128];
  const lineColor: [number, number, number] = [220, 220, 220];

  // Helper functions
  const formatCurrency = (value: number) => {
    return `${data.currency} ${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Header - Agency Info
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.agency.name.toUpperCase(), margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y = 35;
  const agencyInfo = [];
  if (data.agency.nuit) agencyInfo.push(`NUIT: ${data.agency.nuit}`);
  if (data.agency.headquarters) agencyInfo.push(data.agency.headquarters);
  if (data.agency.phone) agencyInfo.push(`Tel: ${data.agency.phone}`);
  doc.text(agencyInfo.join(' | '), margin, y);

  // Invoice Title
  y = 55;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA DE PRESTAÇÃO DE SERVIÇOS', margin, y);

  // Invoice Details Box
  y = 70;
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(pageWidth - margin - 80, y - 10, 80, 35, 3, 3, 'F');
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Factura Nº:', pageWidth - margin - 75, y);
  doc.text('Data de Emissão:', pageWidth - margin - 75, y + 10);
  if (data.dueDate) {
    doc.text('Data de Vencimento:', pageWidth - margin - 75, y + 20);
  }
  
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.invoiceNumber, pageWidth - margin - 15, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.issueDate), pageWidth - margin - 15, y + 10, { align: 'right' });
  if (data.dueDate) {
    doc.text(formatDate(data.dueDate), pageWidth - margin - 15, y + 20, { align: 'right' });
  }

  // Client Info
  y = 75;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.text('FACTURAR A:', margin, y);
  
  y += 8;
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.companyName, margin, y);
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Att: ${data.client.contactName}`, margin, y);
  
  y += 5;
  if (data.client.phone) {
    doc.text(`Tel: ${data.client.phone}`, margin, y);
    y += 5;
  }
  if (data.client.email) {
    doc.text(`Email: ${data.client.email}`, margin, y);
    y += 5;
  }
  if (data.client.address) {
    doc.text(data.client.address, margin, y);
  }

  // Services Table
  y = 130;
  
  // Table Header
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, contentWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  const colWidths = [90, 25, 35, 35];
  let x = margin + 3;
  doc.text('Descrição', x, y + 7);
  x += colWidths[0];
  doc.text('Qtd.', x, y + 7);
  x += colWidths[1];
  doc.text('Preço Unit.', x, y + 7);
  x += colWidths[2];
  doc.text('Total', x, y + 7);

  y += 10;
  
  // Table Body
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  
  data.services.forEach((service, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, contentWidth, 10, 'F');
    }
    
    x = margin + 3;
    doc.text(service.description.substring(0, 45), x, y + 7);
    x += colWidths[0];
    doc.text(String(service.quantity), x, y + 7);
    x += colWidths[1];
    doc.text(formatCurrency(service.unit_price), x, y + 7);
    x += colWidths[2];
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(service.total), x, y + 7);
    doc.setFont('helvetica', 'normal');
    
    y += 10;
  });

  // Totals
  y += 5;
  doc.setDrawColor(...lineColor);
  doc.line(margin, y, margin + contentWidth, y);
  
  y += 10;
  const totalsX = pageWidth - margin - 80;
  
  // Subtotal
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.text('Subtotal:', totalsX, y);
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin - 5, y, { align: 'right' });
  
  // Tax
  if (data.taxPercentage > 0) {
    y += 8;
    doc.setTextColor(...mutedColor);
    doc.text(`IVA (${data.taxPercentage}%):`, totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.taxAmount), pageWidth - margin - 5, y, { align: 'right' });
  }
  
  // Total
  y += 12;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(totalsX - 5, y - 6, 90, 14, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, y + 3);
  doc.text(formatCurrency(data.total), pageWidth - margin - 5, y + 3, { align: 'right' });

  // Payment Information
  y += 30;
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, y - 5, contentWidth, 45, 3, 3, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DE PAGAMENTO', margin + 5, y + 5);
  
  y += 15;
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (data.agency.paymentProviderName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Nome da Provedora:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.agency.paymentProviderName, margin + 55, y);
    y += 8;
  }
  
  if (data.agency.paymentAccountNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('Número de Conta:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.agency.paymentAccountNumber, margin + 55, y);
    y += 8;
  }
  
  if (data.agency.paymentRecipientName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Nome do Destinatário:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.agency.paymentRecipientName, margin + 55, y);
  }

  // Notes
  if (data.notes) {
    y += 25;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Observações:', margin, y);
    y += 6;
    doc.setTextColor(...textColor);
    const splitNotes = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(splitNotes, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(...lineColor);
  doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado electronicamente', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData, filename?: string): void {
  const doc = generateInvoicePDF(data);
  const name = filename || `Factura_${data.invoiceNumber}_${data.client.companyName.replace(/\s+/g, '_')}.pdf`;
  doc.save(name);
}
