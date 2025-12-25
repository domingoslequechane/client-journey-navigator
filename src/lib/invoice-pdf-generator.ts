import jsPDF from 'jspdf';
import { InvoiceSection, INVOICE_TYPE_LABELS, InvoiceType } from '@/components/invoice-editor/section-types';

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
  validityDate?: string;
  invoiceType?: InvoiceType;
  client: {
    companyName: string;
    contactName: string;
    email?: string;
    phone?: string;
    address?: string;
    nuit?: string;
  };
  agency: {
    name: string;
    nuit?: string;
    headquarters?: string;
    phone?: string;
    email?: string;
    slogan?: string;
    paymentProviderName?: string;
    paymentAccountNumber?: string;
    paymentRecipientName?: string;
    paymentMethods?: Array<{ provider: string; account: string }>;
  };
  services: InvoiceService[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  templateStyle?: 'modern' | 'classic' | 'minimal' | 'onix';
  primaryColor?: string;
  showWatermark?: boolean;
  customLayout?: InvoiceSection[];
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [197, 232, 108]; // Default lime green (Onix style)
}

// Lighten a color
function lightenColor(rgb: [number, number, number], factor: number): [number, number, number] {
  return [
    Math.min(255, rgb[0] + (255 - rgb[0]) * factor),
    Math.min(255, rgb[1] + (255 - rgb[1]) * factor),
    Math.min(255, rgb[2] + (255 - rgb[2]) * factor),
  ] as [number, number, number];
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // Dynamic colors based on template
  const primaryColor = hexToRgb(data.primaryColor || '#C5E86C');
  const primaryColorLight = lightenColor(primaryColor, 0.7);
  const textColor: [number, number, number] = [33, 33, 33];
  const mutedColor: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [245, 245, 245];
  const borderColor: [number, number, number] = [200, 200, 200];

  const style = data.templateStyle || 'onix';

  // Helper functions
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${data.currency}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Get section settings from custom layout
  const getSection = (type: string) => data.customLayout?.find((s) => s.type === type && s.visible);

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

  if (style === 'onix') {
    // ============= ONIX STYLE =============
    const headerSection = getSection('header');
    const invoiceInfoSection = getSection('invoice_info');
    const clientSection = getSection('client');
    const servicesSection = getSection('services');
    const totalsSection = getSection('totals');
    const paymentSection = getSection('payment');
    const signaturesSection = getSection('signatures');
    const footerSection = getSection('footer');

    // ============= HEADER - Two columns =============
    // Left: Invoice Type
    doc.setTextColor(...mutedColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Factura', margin, y);
    
    y += 8;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const invoiceType = data.invoiceType || 'proforma';
    doc.text(INVOICE_TYPE_LABELS[invoiceType], margin, y);
    
    y += 7;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${data.invoiceNumber}`, margin, y);

    // Right: Agency Info
    const rightX = pageWidth - margin;
    let rightY = 15;
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(data.agency.name.toUpperCase(), rightX, rightY, { align: 'right' });
    
    rightY += 5;
    if (data.agency.slogan) {
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(data.agency.slogan, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    
    if (data.agency.nuit) {
      doc.text(`NUIT: ${data.agency.nuit}`, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    if (data.agency.headquarters) {
      doc.text(data.agency.headquarters, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    if (data.agency.phone) {
      doc.text(`Tel: ${data.agency.phone}`, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    if (data.agency.email) {
      doc.text(data.agency.email, rightX, rightY, { align: 'right' });
    }

    // ============= CLIENT + DATES BOX =============
    y += 15;
    const boxHeight = 35;
    
    // Draw colored background
    doc.setFillColor(...primaryColorLight);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');
    
    // Left: Client Info
    let clientY = y + 8;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.text('Para a:', margin + 5, clientY);
    
    clientY += 5;
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.client.companyName, margin + 5, clientY);
    
    clientY += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    
    if (data.client.nuit) {
      doc.text(`NUIT: ${data.client.nuit}`, margin + 5, clientY);
      clientY += 4;
    } else {
      doc.text('NUIT: -', margin + 5, clientY);
      clientY += 4;
    }
    
    if (data.client.address) {
      doc.text(`Endereço: ${data.client.address}`, margin + 5, clientY);
    }

    // Right: Dates + Total (with vertical line)
    const dateX = margin + contentWidth * 0.6;
    let dateY = y + 8;
    
    // Vertical divider line
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(dateX - 5, y + 5, dateX - 5, y + boxHeight - 5);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.text('Data:', dateX, dateY);
    doc.setTextColor(...textColor);
    doc.text(formatDate(data.issueDate), dateX + 40, dateY);
    
    dateY += 5;
    if (data.validityDate) {
      doc.setTextColor(...mutedColor);
      doc.text('Validade:', dateX, dateY);
      doc.setTextColor(...textColor);
      doc.text(formatDate(data.validityDate), dateX + 40, dateY);
      dateY += 5;
    }
    
    if (data.dueDate) {
      doc.setTextColor(...mutedColor);
      doc.text('Vencimento:', dateX, dateY);
      doc.setTextColor(...textColor);
      doc.text(formatDate(data.dueDate), dateX + 40, dateY);
      dateY += 5;
    }
    
    // Horizontal line before total
    doc.setDrawColor(...borderColor);
    doc.line(dateX, dateY, pageWidth - margin - 5, dateY);
    dateY += 6;
    
    // Total in header
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', dateX, dateY);
    doc.text(formatCurrency(data.total), pageWidth - margin - 5, dateY, { align: 'right' });

    // ============= SERVICES TABLE =============
    y += boxHeight + 10;
    
    // Table Header
    const showRowNumbers = servicesSection?.settings.showRowNumbers ?? true;
    const showQty = servicesSection?.settings.showQuantity ?? true;
    const showUnitPrice = servicesSection?.settings.showUnitPrice ?? true;
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    let colX = margin;
    if (showRowNumbers) {
      doc.text('Nº', colX, y);
      colX += 10;
    }
    doc.text('DESCRIÇÃO', colX, y);
    
    if (showQty) {
      doc.text('QNT.', margin + 110, y);
    }
    if (showUnitPrice) {
      doc.text('P. UNIT.', margin + 130, y);
    }
    doc.text('QUANTIA', pageWidth - margin, y, { align: 'right' });
    
    y += 3;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 7;
    
    // Table Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    
    data.services.forEach((service, index) => {
      colX = margin;
      
      if (showRowNumbers) {
        doc.setTextColor(...mutedColor);
        doc.text(`${index + 1}.`, colX, y);
        colX += 10;
      }
      
      doc.setTextColor(...textColor);
      doc.text(service.description.substring(0, 50), colX, y);
      
      if (showQty) {
        doc.text(String(service.quantity), margin + 115, y, { align: 'center' });
      }
      if (showUnitPrice) {
        doc.text(formatCurrency(service.unit_price), margin + 145, y, { align: 'right' });
      }
      doc.text(formatCurrency(service.total), pageWidth - margin, y, { align: 'right' });
      
      y += 7;
      
      // Subtle row separator
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 2, pageWidth - margin, y - 2);
    });

    // ============= NOTES + TOTALS (Side by side) =============
    y += 10;
    const notesY = y;
    
    // Left: Notes
    if (data.notes && totalsSection?.settings.notesPosition === 'left') {
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Nota:', margin, y);
      
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      const splitNotes = doc.splitTextToSize(data.notes, contentWidth * 0.5);
      doc.text(splitNotes, margin, y);
    }

    // Right: Totals
    const totalsX = margin + contentWidth * 0.55;
    let totalsY = notesY;
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.text('Sub-Total:', totalsX, totalsY);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.subtotal), pageWidth - margin, totalsY, { align: 'right' });
    
    totalsY += 6;
    if (data.taxPercentage > 0) {
      doc.setTextColor(...mutedColor);
      doc.text(`IVA ${data.taxPercentage}%:`, totalsX, totalsY);
      doc.setTextColor(...textColor);
      doc.text(formatCurrency(data.taxAmount), pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 6;
    }
    
    // Total box
    totalsY += 2;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(totalsX, totalsY, pageWidth - margin, totalsY);
    
    totalsY += 7;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', totalsX, totalsY);
    doc.text(formatCurrency(data.total), pageWidth - margin, totalsY, { align: 'right' });
    
    y = Math.max(y + 20, totalsY + 15);

    // ============= FOOTER - Three columns =============
    const footerY = pageHeight - 40;
    
    // Top border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    const colWidth = contentWidth / 3;
    
    // Column 1: Payment Info
    let col1Y = footerY;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Nº de Conta', margin, col1Y);
    
    col1Y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    if (data.agency.paymentMethods && data.agency.paymentMethods.length > 0) {
      data.agency.paymentMethods.forEach((method) => {
        doc.setTextColor(...mutedColor);
        doc.text(`${method.provider}: `, margin, col1Y);
        doc.setTextColor(...textColor);
        doc.text(method.account, margin + 25, col1Y);
        col1Y += 4;
      });
    } else {
      if (data.agency.paymentProviderName) {
        doc.setTextColor(...mutedColor);
        doc.text(`${data.agency.paymentProviderName}: `, margin, col1Y);
        doc.setTextColor(...textColor);
        doc.text(data.agency.paymentAccountNumber || '', margin + 25, col1Y);
        col1Y += 4;
      }
    }
    
    // Column 2: Legal text + Thanks
    const col2X = margin + colWidth;
    let col2Y = footerY;
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    const legalText = footerSection?.settings.footerLegalText || 'Este documento não é válido para efeitos fiscais sem carimbo e assinatura.';
    const splitLegal = doc.splitTextToSize(legalText, colWidth - 10);
    doc.text(splitLegal, col2X, col2Y, { align: 'left' });
    
    col2Y += splitLegal.length * 4 + 3;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const thanksText = footerSection?.settings.footerText || 'Obrigado pela preferência!';
    doc.text(thanksText, col2X + (colWidth - 10) / 2, col2Y, { align: 'center' });
    
    // Column 3: Signature
    const col3X = margin + colWidth * 2;
    
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(col3X + 5, footerY + 10, pageWidth - margin - 5, footerY + 10);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const signatureLabel = signaturesSection?.settings.agencySignatureLabel || 'O Responsável';
    doc.text(signatureLabel, col3X + 5 + (pageWidth - margin - 5 - col3X - 5) / 2, footerY + 15, { align: 'center' });

  } else {
    // ============= OTHER STYLES (modern, classic, minimal) =============
    // Keep existing code for other styles
    
    if (style === 'modern') {
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
      
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + contentWidth, y);
      y += 10;
    }

    // Invoice Title
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA DE PRESTAÇÃO DE SERVIÇOS', margin, y);
    
    // Invoice Details Box
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

    // Client Info
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

    // Services Table
    y += 10;
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

    // Totals Section
    y += 8;
    const totalsWidth = 80;
    const totalsX = pageWidth - margin - totalsWidth;
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.text('Subtotal:', totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: 'right' });
    
    if (data.taxPercentage > 0) {
      y += 7;
      doc.setTextColor(...mutedColor);
      doc.text(`IVA (${data.taxPercentage}%):`, totalsX, y);
      doc.setTextColor(...textColor);
      doc.text(formatCurrency(data.taxAmount), pageWidth - margin, y, { align: 'right' });
    }
    
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

    // Payment Information
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

    // Notes
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

    // Signature Area
    y = pageHeight - 55;
    
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    
    doc.line(margin, y, margin + 70, y);
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Cliente', margin, y + 5);
    
    doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
    doc.text('Assinatura da Agência', pageWidth - margin - 70, y + 5);

    // Footer
    const footerY = pageHeight - 12;
    
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.text('Documento gerado electronicamente  •  Página 1 de 1', pageWidth / 2, footerY, { align: 'center' });
  }

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData, filename?: string): void {
  const doc = generateInvoicePDF(data);
  const name = filename || `Factura_${data.invoiceNumber}_${data.client.companyName.replace(/\s+/g, '_')}.pdf`;
  doc.save(name);
}
