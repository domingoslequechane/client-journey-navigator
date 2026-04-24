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
    representativeName?: string;
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
  footerText?: string;
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

  // Get section settings from custom layout - ensure it's an array
  const customLayout = Array.isArray(data.customLayout) 
    ? data.customLayout 
    : (typeof data.customLayout === 'string' ? JSON.parse(data.customLayout as unknown as string) : null);
  
  const getSection = (type: string) => customLayout?.find((s: InvoiceSection) => s.type === type && s.visible);

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
    // ============= ONIX STYLE - Based on HTML Template =============
    const servicesSection = getSection('services');
    const totalsSection = getSection('totals');
    const signaturesSection = getSection('signatures');
    const footerSection = getSection('footer');

    // Colors matching the HTML template
    const limeGreen: [number, number, number] = [212, 255, 111]; // #d4ff6f
    const darkBg: [number, number, number] = [26, 26, 26]; // #1a1a1a
    const white: [number, number, number] = [255, 255, 255];
    const black: [number, number, number] = [0, 0, 0];
    const grayText: [number, number, number] = [85, 85, 85];
    const lightGrayLine: [number, number, number] = [221, 221, 221];

    // ============= HEADER - Lime Green Background =============
    const headerHeight = 45;
    
    // Green header background
    doc.setFillColor(...limeGreen);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Bottom black border
    doc.setDrawColor(...black);
    doc.setLineWidth(2);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // Left side: Invoice Type
    let leftY = 12;
    doc.setTextColor(...black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Factura', margin, leftY);
    
    leftY += 10;
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const invoiceType = data.invoiceType || 'proforma';
    doc.text(INVOICE_TYPE_LABELS[invoiceType].toUpperCase(), margin, leftY);
    
    leftY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${data.invoiceNumber}`, margin, leftY);

    // Right side: Agency Info
    const rightX = pageWidth - margin;
    let rightY = 10;
    
    // Agency name (large)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.agency.name.toUpperCase(), rightX, rightY, { align: 'right' });
    
    rightY += 5;
    if (data.agency.slogan) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(data.agency.slogan, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    if (data.agency.nuit) {
      doc.text(`NUIT: ${data.agency.nuit}`, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    if (data.agency.headquarters) {
      doc.text(data.agency.headquarters, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    if (data.agency.phone) {
      doc.text(data.agency.phone, rightX, rightY, { align: 'right' });
      rightY += 4;
    }
    if (data.agency.email) {
      doc.text(data.agency.email, rightX, rightY, { align: 'right' });
    }

    // ============= BLACK SECTION - Client + Dates + Total =============
    y = headerHeight;
    const blackSectionHeight = 40;
    
    // Black background
    doc.setFillColor(...darkBg);
    doc.rect(0, y, pageWidth, blackSectionHeight, 'F');
    
    // Bottom black border
    doc.setDrawColor(...black);
    doc.setLineWidth(2);
    doc.line(0, y + blackSectionHeight, pageWidth, y + blackSectionHeight);

    // Left: Client Info
    let clientY = y + 10;
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Para a :', margin, clientY);
    
    clientY += 6;
    doc.setFontSize(12);
    doc.text(data.client.companyName, margin, clientY);
    
    clientY += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`NUIT : ${data.client.nuit || '-'}`, margin, clientY);
    
    clientY += 5;
    doc.text(`Endereço : ${data.client.address || '-'}`, margin, clientY);

    // Right: Dates + Total (2 columns)
    const dateColX = pageWidth / 2 + 10;
    const valueColX = pageWidth / 2 + 35;
    const totalColX = pageWidth - margin - 25;
    const totalValueX = pageWidth - margin;
    
    let dateY = y + 10;
    
    // Date label
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Data :', dateColX, dateY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(data.issueDate), valueColX, dateY);
    
    // Validade label
    doc.text('Validade :', dateColX, dateY + 8);
    doc.text(data.validityDate ? formatDate(data.validityDate) : '-', valueColX, dateY + 8);
    
    // Total section (right side)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Total :', totalColX, dateY);
    doc.setFontSize(11);
    doc.text(formatCurrency(data.total), totalValueX, dateY, { align: 'right' });

    // ============= SERVICES TABLE =============
    y = headerHeight + blackSectionHeight + 10;
    
    // Table Header
    const showRowNumbers = servicesSection?.settings.showRowNumbers ?? true;
    const showQty = servicesSection?.settings.showQuantity ?? true;
    const showUnitPrice = servicesSection?.settings.showUnitPrice ?? true;
    
    doc.setTextColor(...grayText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    // Column positions
    const col1 = margin; // NO.
    const col2 = margin + 12; // DESCRIÇÃO
    const col3 = margin + 110; // QNT.
    const col4 = margin + 130; // P. UNIT.
    const col5 = pageWidth - margin; // QUANTIA
    
    if (showRowNumbers) {
      doc.text('NO.', col1, y);
    }
    doc.text('DESCRIÇÃO', col2, y);
    if (showQty) {
      doc.text('QNT.', col3, y);
    }
    if (showUnitPrice) {
      doc.text('P. UNIT.', col4, y);
    }
    doc.text('QUANTIA', col5, y, { align: 'right' });
    
    // Header bottom border (thick black line)
    y += 3;
    doc.setDrawColor(...black);
    doc.setLineWidth(1.5);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 8;
    
    // Table Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...black);
    
    data.services.forEach((service, index) => {
      if (showRowNumbers) {
        doc.setTextColor(...grayText);
        doc.text(`${index + 1}.`, col1, y);
      }
      
      doc.setTextColor(...black);
      doc.text(service.description.substring(0, 45), col2, y);
      
      if (showQty) {
        doc.text(String(service.quantity), col3 + 5, y);
      }
      if (showUnitPrice) {
        doc.text(formatCurrency(service.unit_price), col4 + 15, y);
      }
      doc.text(formatCurrency(service.total), col5, y, { align: 'right' });
      
      y += 8;
      
      // Light gray row separator
      doc.setDrawColor(...lightGrayLine);
      doc.setLineWidth(0.3);
      doc.line(margin, y - 3, pageWidth - margin, y - 3);
    });

    // Add empty dotted lines for manual filling (3 rows)
    for (let i = 0; i < 3; i++) {
      y += 8;
      doc.setDrawColor(...lightGrayLine);
      doc.setLineWidth(0.3);
      // Dotted line effect
      for (let x = margin; x < pageWidth - margin; x += 4) {
        doc.line(x, y - 3, x + 2, y - 3);
      }
    }

    // ============= NOTES + TOTALS SECTION =============
    y += 10;
    const notesTotalsY = y;
    
    // Left: Notes box
    const notesBoxWidth = contentWidth * 0.55;
    const notesBoxHeight = 35;
    
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, notesTotalsY, notesBoxWidth, notesBoxHeight, 2, 2, 'F');
    
    doc.setTextColor(...grayText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Nota :', margin + 5, notesTotalsY + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...black);
    const defaultNote = data.notes || (data.invoiceType === 'factura' || data.invoiceType === 'recibo' ? 'Agradecemos a sua preferência. O pagamento desta factura deve ser efectuado no prazo estabelecido. Documento processado por computador.' : 'Este é um documento preliminar enviado ao cliente com os preços de um produto ou serviço com o objetivo de informa-lo (a) antes da venda ser confirmada.');
    const splitNotes = doc.splitTextToSize(defaultNote, notesBoxWidth - 12);
    doc.text(splitNotes, margin + 5, notesTotalsY + 15);

    // Right: Totals box (black background)
    const totalsBoxX = margin + notesBoxWidth + 8;
    const totalsBoxWidth = contentWidth - notesBoxWidth - 8;
    const totalsBoxHeight = 35;
    
    doc.setFillColor(...darkBg);
    doc.roundedRect(totalsBoxX, notesTotalsY, totalsBoxWidth, totalsBoxHeight, 2, 2, 'F');
    
    let totalsY = notesTotalsY + 10;
    const totalsLabelX = totalsBoxX + 5;
    const totalsValueX = totalsBoxX + totalsBoxWidth - 5;
    
    // Sub-Total
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Sub-Total :', totalsLabelX, totalsY);
    doc.text(formatCurrency(data.subtotal), totalsValueX, totalsY, { align: 'right' });
    
    totalsY += 7;
    
    // IVA
    if (data.taxPercentage > 0) {
      doc.text(`IVA ${data.taxPercentage}% :`, totalsLabelX, totalsY);
      doc.text(formatCurrency(data.taxAmount), totalsValueX, totalsY, { align: 'right' });
      totalsY += 8;
    }
    
    // Total with lime green background
    const totalRowHeight = 10;
    const totalRowY = notesTotalsY + totalsBoxHeight - totalRowHeight - 3;
    
    doc.setFillColor(...limeGreen);
    doc.roundedRect(totalsBoxX + 2, totalRowY, totalsBoxWidth - 4, totalRowHeight, 1, 1, 'F');
    
    doc.setTextColor(...black);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Total :', totalsLabelX + 2, totalRowY + 7);
    doc.text(formatCurrency(data.total), totalsValueX - 2, totalRowY + 7, { align: 'right' });

    // ============= FOOTER - Three columns =============
    const footerY = pageHeight - 45;
    
    // Top border
    doc.setDrawColor(...black);
    doc.setLineWidth(1);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    const colWidth = contentWidth / 3;
    
    // Column 1: Payment Info
    let col1Y = footerY;
    doc.setTextColor(...black);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Nº de Conta', margin, col1Y);
    
    col1Y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    if (data.agency.paymentMethods && data.agency.paymentMethods.length > 0) {
      data.agency.paymentMethods.forEach((method) => {
        doc.setTextColor(...grayText);
        doc.text(`${method.provider} : `, margin, col1Y);
        doc.setTextColor(...black);
        doc.text(method.account, margin + 18, col1Y);
        col1Y += 5;
      });
    } else if (data.agency.paymentProviderName) {
      doc.setTextColor(...grayText);
      doc.text(`${data.agency.paymentProviderName} : `, margin, col1Y);
      doc.setTextColor(...black);
      doc.text(data.agency.paymentAccountNumber || '', margin + 18, col1Y);
    }
    
    // Column 2: Legal text + Thanks (centered)
    const col2X = margin + colWidth;
    let col2Y = footerY;
    
    doc.setTextColor(...grayText);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const legalText1 = 'Documento processado eletronicamente.';
    const legalText2 = 'Termos e condições de serviço aplicáveis.';
    doc.text(legalText1, col2X + colWidth / 2, col2Y, { align: 'center' });
    doc.text(legalText2, col2X + colWidth / 2, col2Y + 10, { align: 'center' });
    
    col2Y += 20;
    doc.setTextColor(...black);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const thanksText = footerSection?.settings.footerText || 'Obrigado por confiar na ' + data.agency.name + '.';
    doc.text(thanksText, col2X + colWidth / 2, col2Y, { align: 'center' });
    
    col2Y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.text('Construímos para durar.', col2X + colWidth / 2, col2Y, { align: 'center' });
    
    // Column 3: Signature
    const col3X = margin + colWidth * 2;
    const signatureLineWidth = colWidth - 10;
    
    doc.setDrawColor(...black);
    doc.setLineWidth(0.5);
    doc.line(col3X + 5, footerY + 15, col3X + 5 + signatureLineWidth, footerY + 15);
    
    doc.setTextColor(...black);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const signatureLabel = signaturesSection?.settings.agencySignatureLabel || data.agency.representativeName || 'O Responsável';
    doc.text(signatureLabel, col3X + 5 + signatureLineWidth / 2, footerY + 22, { align: 'center' });

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
