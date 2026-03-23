import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PaperSize } from '../components/invoice-editor/section-types';

export const generateInvoicePDF = async (
  elementId: string, 
  fileName: string = 'factura.pdf',
  paperSize: PaperSize = 'A4'
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemento não encontrado para geração de PDF');
  }

  // Hide elements that shouldn't be in the PDF (if any)
  const originalStyle = element.style.cssText;
  
  try {
    // Determine dimensions based on paper size
    // A4: 210mm x 297mm
    // A5: 148mm x 210mm
    const dimensions = paperSize === 'A4' 
      ? { width: 210, height: 297 } 
      : { width: 148, height: 210 };

    // Create canvas from element
    // We use a high scale for better print quality
    const canvas = await html2canvas(element, {
      scale: 3, 
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize.toLowerCase(),
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, dimensions.width, dimensions.height);
    pdf.save(fileName);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    element.style.cssText = originalStyle;
  }
};
