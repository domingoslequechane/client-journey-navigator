import { useEffect, useRef } from 'react';
import { InvoiceSection, PaperSize, INVOICE_TYPE_LABELS, TemplateStyle, LayoutModel } from './section-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InvoicePreviewProps {
  sections: InvoiceSection[];
  paperSize: PaperSize;
  primaryColor: string;
  showWatermark?: boolean;
  templateStyle?: TemplateStyle;
  layoutModel?: LayoutModel;
  agency?: {
    name: string | null;
    logo_url: string | null;
    nuit: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  fontFamily?: string;
}

export function InvoicePreview({ 
  sections, 
  paperSize, 
  primaryColor, 
  showWatermark, 
  templateStyle = 'onix', 
  layoutModel = 'classic',
  agency,
  fontFamily = 'Inter'
}: InvoicePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!containerRef.current) return;
    
    // Create a PDF of the current view
    const element = containerRef.current;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Fatura_Digital_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  useEffect(() => {
    // Basic defensive fonts that don't need Google Fonts
    const standardFonts = ['Inter', 'Roboto', 'Arial', 'system-ui', 'monospace', 'serif', 'sans-serif'];
    if (fontFamily && !standardFonts.includes(fontFamily) && !fontFamily.includes(',')) {
      const linkId = `google-font-${fontFamily.replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    }
  }, [fontFamily]);

  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const aspectRatio = paperSize === 'A4' ? '210 / 297' : '148 / 210';

  // Mock agency data using Qualify brand for demonstration
  const mockAgency = {
    name: agency?.name || "QUALIFY",
    logo_url: agency?.logo_url || "/splash-logo.png",
    logo_white_url: agency?.logo_url || "/splash-logo-white.png", // Fallback to custom logo if available
    nuit: agency?.nuit || "400123987",
    address: agency?.address || "Av. 25 de Setembro, 147 - Maputo",
    phone: agency?.phone || "+258 84 000 0000",
    email: agency?.email || "info@qualify.mz"
  };

  // Get section by type
  const getSection = (type: string) => visibleSections.find((s) => s.type === type);

  const headerSection = getSection('header');
  const invoiceInfoSection = getSection('invoice_info');
  const clientSection = getSection('client');
  const servicesSection = getSection('services');
  const totalsSection = getSection('totals');
  const paymentSection = getSection('payment');
  const signaturesSection = getSection('signatures');
  const footerSection = getSection('footer');

  const isDark = ['cyber_neo', 'luxury_gold', 'retro_80s', 'space_odyssey'].includes(templateStyle);

  return (
    <div className="relative group w-full h-full min-h-[500px]">
      {/* Floating Action Button for PDF - Hidden on print */}
      <div className="absolute top-4 right-4 z-[100] no-print opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Button 
          onClick={downloadPDF}
          size="sm"
          className="bg-primary/95 text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 rounded-full px-4 h-9 backdrop-blur-sm"
        >
          <Download className="w-4 h-4" />
          <span className="text-[11px] font-bold">Baixar PDF</span>
        </Button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "bg-white shadow-2xl overflow-hidden border relative transition-colors duration-500 invoice-preview-container",
          isDark && "text-white border-white/10"
        )}
        style={{
          aspectRatio,
          maxHeight: '100%',
          width: '100%',
          backgroundColor: templateStyle === 'cyber_neo' ? '#0a0a0f' : 
                          templateStyle === 'luxury_gold' ? '#121212' : 
                          templateStyle === 'retro_80s' ? '#240b36' :
                          templateStyle === 'space_odyssey' ? '#1a1c2c' :
                          templateStyle === 'blueprint' ? '#004e92' :
                          templateStyle === 'eco_friendly' ? '#fdfaf5' :
                          templateStyle === 'kawaii' ? '#fff5f8' :
                          'white',
        }}
      >
        {/* Force font application for all children */}
        <style dangerouslySetInnerHTML={{ __html: `
          .invoice-preview-container, .invoice-preview-container * {
            font-family: "${fontFamily}", sans-serif !important;
          }
        `}} />

      {/* Background Patterns */}
      {templateStyle === 'blueprint' && (
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      )}
      {templateStyle === 'space_odyssey' && (
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:40px_40px]" />
      )}
      {templateStyle === 'cyber_neo' && (
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 blur-[128px] pointer-events-none" />
      )}

      {/* Watermark */}
      {showWatermark && (
        <div className={cn(
          "absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden h-full w-full",
          isDark ? "opacity-[0.05]" : "opacity-[0.03]"
        )}>
          <div className="text-[60px] font-black uppercase -rotate-45 select-none whitespace-nowrap">
            ORIGINAL • ORIGINAL • ORIGINAL
          </div>
        </div>
      )}

      <div className={cn(
        "h-full flex relative z-10",
        isDark ? "text-gray-100" : "text-gray-800",
        layoutModel === 'sidebar_vertical' ? "flex-row" : "flex-col px-4 pt-4 pb-2",
        templateStyle === 'spanish_vibe' && "font-sans"
      )}>
        {layoutModel === 'sidebar_vertical' && (
          <div className="w-[12%] flex items-center justify-center border-r border-gray-100 min-h-full bg-white relative overflow-hidden">
             <div className="rotate-[-90deg] whitespace-nowrap flex items-center gap-4">
                <span className="text-[12px] font-medium tracking-[0.3em] uppercase opacity-20 text-gray-400">Documento</span>
                <span className="text-[24px] font-black uppercase" style={{ color: primaryColor }}>
                   {INVOICE_TYPE_LABELS[invoiceInfoSection?.settings?.invoiceType || 'proforma']} 25-0043
                </span>
             </div>
          </div>
        )}
        
        <div className={cn(
          "flex-1 flex flex-col h-full",
          layoutModel === 'sidebar_vertical' && "p-8"
        )}>
        {/* LAYOUT-SPECIFIC HEADER (COMPACT & PRO) */}
        {layoutModel === 'onix_hero' ? (
          <div className="relative mb-2 overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100">
             {/* Gradient/Vibrant Banner - Compacted */}
             <div className="p-4 flex justify-between items-center relative min-h-[90px] bg-[#bef264]">
                <div className="z-10 animate-fade-in">
                   <div className="text-[#1a1a1a] font-bold text-[8px] opacity-60 uppercase tracking-[0.4em] block mb-0.5">Factura</div>
                   <div className="text-[#1a1a1a] font-black text-[22px] uppercase leading-none tracking-[-0.04em]">
                      {INVOICE_TYPE_LABELS[invoiceInfoSection?.settings.invoiceType || 'proforma']}
                   </div>
                   <div className="flex items-center gap-1.5 mt-1.5 text-[#1a1a1a]/80">
                      <div className="h-0.5 w-3 bg-current opacity-40" />
                      <div className="font-black text-[10px] tracking-tight italic">Ref. 25-0043</div>
                   </div>
                </div>
                
                <div className="text-right z-10 flex flex-col items-end">
                   <div className="w-14 h-14 flex items-center justify-center p-2 rounded-2xl bg-white shadow-lg mb-2">
                     <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
                   </div>
                   <div className="flex flex-col items-end text-right mt-1.5 space-y-0.5">
                       <span className="text-[#1a1a1a] font-black text-[10px] uppercase tracking-tighter leading-none mb-0.5">{mockAgency.name}</span>
                       <span className="font-bold text-[5px] opacity-60 uppercase tracking-widest leading-none">{mockAgency.nuit}</span>
                       <span className="font-bold text-[5px] opacity-60 uppercase tracking-widest leading-none">{mockAgency.phone}</span>
                       <span className="font-bold text-[5px] opacity-60 uppercase tracking-widest leading-none max-w-[140px]">{mockAgency.address}</span>
                       <span className="font-bold text-[5px] opacity-60 uppercase tracking-widest leading-none">{mockAgency.email}</span>
                    </div>
                </div>
                
                {/* Patterns - Scaled Down */}
                <div className="absolute right-[-2%] top-[-5%] w-32 h-32 border-[15px] border-[#1a1a1a]/5 rounded-full pointer-events-none" />
                <div className="absolute left-[-5%] bottom-[-10%] w-40 h-40 border-[20px] border-white/10 rounded-full pointer-events-none" />
             </div>
             
             {/* Data Bar - Compacted Grid */}
             <div className="bg-[#1a1a1b] px-4 py-2.5 text-white grid grid-cols-4 items-center gap-4">
                <div className="col-span-2 border-r border-white/10 pr-4">
                   <div className="text-white/60 text-[5px] uppercase tracking-[0.2em] mb-1 font-black">Cliente</div>
                   <div className="font-black text-[9px] uppercase tracking-tighter text-[#bef264] leading-none mb-1">Quadrado Mágico</div>
                   <div className="text-white/80 text-[6px] font-bold space-y-0.5">
                      <p>Av. de Moçambique, 123 • Maputo</p>
                      <p>NUIT: 401 223 334</p>
                   </div>
                </div>
                
                <div className="border-r border-white/10 px-4 flex flex-col gap-1.5 items-end justify-center h-full text-right">
                   <div>
                      <div className="text-white/60 text-[5px] uppercase font-bold tracking-widest leading-none mb-0.5">Emissão</div>
                      <div className="font-black text-[8px] whitespace-nowrap">22 SET 25</div>
                   </div>
                   <div>
                      <div className="text-white/60 text-[5px] uppercase font-bold tracking-widest leading-none mb-0.5">Vencimento</div>
                      <div className="font-black text-[8px] text-red-400 whitespace-nowrap">06 OUT 25</div>
                   </div>
                </div>
                <div className="flex flex-col justify-center h-full items-end text-right pl-6">
                    <div className="text-white/30 text-[5px] uppercase font-black tracking-[0.2em] mb-1">Total</div>
                    <div className="font-black text-[14px] text-[#bef264] leading-none whitespace-nowrap">5.336 mt</div>
                 </div>
             </div>
          </div>
        ) : layoutModel === 'borcelle_navy' ? (
          /* BORCELLE NAVY - Organic Blue Curves & Centered Logo */
          <div className="relative mb-2 pb-4 overflow-hidden">
             {/* Top Curves Decoration */}
             <div className="absolute top-0 right-0 left-0 h-24 -z-0 pointer-events-none">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full opacity-100">
                   <path d="M0,80 C150,150 350,0 500,80 L500,0 L0,0 Z" fill="#1e3a8a" />
                   <path d="M0,60 C180,110 320,20 500,60 L500,0 L0,0 Z" fill="#2563eb" opacity="0.6" />
                </svg>
             </div>
             
             <div className="relative z-10 pt-4 flex flex-col items-center">
                {/* Centered Logo Box */}
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex items-center justify-center mb-6 animate-scale-in">
                   <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
                </div>
                
                <div className="w-full grid grid-cols-2 gap-8 px-8">
                   {/* Left: Client Data Area */}
                   <div className="animate-fade-in-left">
                      <div className="text-[#1a1a1b] font-black text-[7px] uppercase tracking-[0.3em] mb-2">Dados do Cliente</div>
                      <div className="space-y-0.5">
                         <div className="text-[10px] font-black uppercase text-gray-800 tracking-tight leading-none mb-1">Quadrado Mágico</div>
                         <div className="text-[6px] text-gray-500 font-bold uppercase leading-tight space-y-0.5">
                            <p>Av. de Moçambique, 123 • Maputo</p>
                            <p>NUIT: 401 223 334</p>
                            <p>{clientSection?.settings.showClientEmail && "vendas@quadrado.africa"}</p>
                         </div>
                      </div>
                   </div>
                   
                   {/* Right: Agency Data Area */}
                   <div className="text-right animate-fade-in-right">
                      <div className="text-[#1a1a1b] font-black text-[7px] uppercase tracking-[0.3em] mb-2">Dados da Empresa</div>
                      <div className="space-y-0.5">
                         <div className="text-[10px] font-black uppercase text-gray-800 tracking-tight leading-none mb-1" style={{ color: primaryColor }}>{mockAgency.name}</div>
                         <div className="text-[6px] text-gray-500 font-bold uppercase leading-tight space-y-0.5">
                            <p>{mockAgency.address}</p>
                            <p>NUIT: {mockAgency.nuit}</p>
                            <p>{mockAgency.phone} • {mockAgency.email}</p>
                         </div>
                      </div>
                   </div>
                </div>
                
                {/* Date Row */}
                <div className="mt-4 pt-2 border-t border-gray-100 w-full px-8 flex justify-between items-center">
                   <div className="text-[6px] font-black uppercase tracking-widest text-[#1e3a8a]">
                      Data Documento: <span className="text-gray-900 ml-1">25 MAR 2025</span>
                   </div>
                   <div className="bg-[#1e3a8a] text-white px-3 py-1 rounded-full text-[6px] font-black uppercase tracking-widest">
                      {INVOICE_TYPE_LABELS[invoiceInfoSection?.settings.invoiceType || 'proforma']} #25-0043
                   </div>
                </div>
             </div>
          </div>
        ) : layoutModel === 'orange_geometric' ? (
          /* ORANGE GEOMETRIC - Bold Angular Accents */
          <div className="relative mb-2 overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm">
             {/* Geometric Header Header Design */}
             <div className="relative h-16 flex items-stretch">
                <div className="flex-1 bg-white p-4 flex items-center gap-3">
                   <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg p-1.5 shadow-sm">
                     <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
                   </div>
                   <div>
                      <div className="font-black text-[10px] uppercase tracking-tighter leading-none" style={{ color: primaryColor }}>{mockAgency.name}</div>
                      <div className="text-[5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{mockAgency.nuit}</div>
                   </div>
                </div>
                
                {/* The Red/Orange Angular Accents */}
                <div className="absolute top-0 right-[25%] bottom-0 w-8 bg-[#fb923c] -skew-x-[25deg] shadow-lg z-10" />
                <div className="w-1/3 bg-[#1a1a1b] flex items-center justify-center pl-4 -skew-x-[25deg] transform translate-x-4">
                   <div className="skew-x-[25deg] text-white text-[16px] font-black uppercase tracking-widest pr-4">
                      INVOICE
                   </div>
                </div>
             </div>
             
             {/* Data Rows below geometric header */}
             <div className="p-4 grid grid-cols-2 gap-8 bg-gray-50/30">
                <div className="flex flex-col gap-1">
                   <div className="text-[5px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5 border-b border-gray-200 pb-0.5">Invoice To:</div>
                   <div className="font-black text-[10px] uppercase text-gray-800 leading-tight">Quadrado Mágico</div>
                   <div className="text-[6px] text-gray-600 font-bold uppercase tracking-tight max-w-[150px]">
                      {clientSection?.settings.showClientAddress && "Av. de Moçambique, 123 • Maputo"}
                   </div>
                </div>
                
                <div className="text-right flex flex-col items-end gap-1">
                   <div className="text-[5px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5 border-b border-gray-200 pb-0.5 w-full">Details:</div>
                   <div className="flex justify-between w-full text-[6px] pt-1">
                      <span className="text-gray-500 font-bold uppercase">No. :</span>
                      <span className="font-black text-gray-900">25-0043</span>
                   </div>
                   <div className="flex justify-between w-full text-[6px]">
                      <span className="text-gray-500 font-bold uppercase">Data :</span>
                      <span className="font-black text-gray-900">25 SET 2025</span>
                   </div>
                </div>
             </div>
          </div>
        ) : layoutModel === 'purple_angular' ? (
          /* PURPLE ANGULAR - Modern Tech Approach */
          <div className="relative mb-2 overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
             <div className="flex items-stretch min-h-[80px]">
                <div className="flex-1 p-4 bg-white">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 p-2 bg-white rounded-xl shadow-lg border border-purple-50 flex items-center justify-center">
                         <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
                      </div>
                      <div>
                        <div className="font-black text-[11px] uppercase text-[#7c3aed] tracking-tight leading-none mb-0.5">{mockAgency.name}</div>
                        <div className="text-[5px] text-gray-600 font-black tracking-[0.3em] uppercase opacity-90">Creative Design Studio</div>
                      </div>
                   </div>
                </div>
                
                <div className="w-1/2 relative">
                   <div 
                      className="absolute inset-0 bg-[#0f172a] transform -skew-x-[15deg] translate-x-12 z-0" 
                      style={{ borderLeft: "4px solid #7c3aed" }} 
                   />
                   <div className="absolute inset-0 flex flex-col items-end justify-center px-6 z-10 text-white text-right">
                      <div className="text-[20px] font-black uppercase tracking-widest leading-none mb-1">INVOICE</div>
                      <div className="flex items-center gap-2 text-[6px] font-bold text-[#7c3aed]">
                         <span className="opacity-50 text-white uppercase tracking-widest">Metodo Pagamento:</span>
                         <span className="uppercase">Transferência</span>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Info Bar with Purple accents */}
             <div className="px-6 py-3 border-t border-gray-50 flex justify-between bg-gray-50/50">
                <div className="flex flex-col gap-0.5">
                   <div className="text-[9px] font-black text-gray-900 uppercase leading-none mb-1 tracking-tight">Quadrado Mágico</div>
                   <div className="text-[6px] text-gray-600 font-bold uppercase flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#7c3aed] rounded-full" />
                      <span>Av. de Moçambique, 123 • Maputo</span>
                   </div>
                   <div className="text-[6px] text-gray-600 font-bold uppercase flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#7c3aed] rounded-full" />
                      <span>NUIT: 401 223 334</span>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-right">
                   <div>
                      <div className="text-[4px] text-gray-400 font-black uppercase tracking-widest mb-0.5 opacity-50">Emitido em</div>
                      <div className="text-[7px] font-black text-gray-800">25 SET 25</div>
                   </div>
                   <div>
                      <div className="text-[4px] text-[#7c3aed] font-black uppercase tracking-widest mb-0.5 opacity-50">Vencimento em</div>
                      <div className="text-[7px] font-black text-[#7c3aed]">05 OUT 25</div>
                   </div>
                </div>
             </div>
          </div>
        ) : layoutModel === 'centered' ? (
          <div className="grid grid-cols-3 items-center mb-2 pb-3 border-b border-gray-100">
            <div className="text-left">
              <div className="uppercase tracking-[0.3em] font-black text-[6px] opacity-40 mb-1">Doc.</div>
              <div className="font-black text-[12px] leading-none" style={{ color: primaryColor }}>
                {INVOICE_TYPE_LABELS[invoiceInfoSection?.settings.invoiceType || 'proforma']}
              </div>
              <div className="text-gray-400 font-bold text-[6px] mt-0.5">#25-0043</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-1 flex items-center justify-center p-2 rounded-xl bg-white shadow-md border border-gray-50">
                <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
              </div>
              <div className="font-black text-[10px] uppercase truncate max-w-full" style={{ color: primaryColor }}>{mockAgency.name}</div>
            </div>

            <div className="text-right">
               <div className="text-gray-400 font-bold text-[5px] uppercase leading-tight line-clamp-2">
                  {mockAgency.address}
               </div>
               <div className="font-bold text-[5px] opacity-60 uppercase tracking-widest leading-none mt-1">{mockAgency.nuit}</div>
               <div className="text-[6px] font-black mt-1" style={{ color: primaryColor }}>{mockAgency.phone}</div>
            </div>
          </div>
        ) : layoutModel === 'sidebar' ? (
          <div className="grid grid-cols-[auto_1fr] gap-0 mb-2 border border-gray-100 rounded-lg overflow-hidden bg-muted/5">
            <div className="bg-white p-3 border-r border-gray-100 min-w-[100px]">
               <div className="text-gray-500 text-[5px] uppercase font-black tracking-widest mb-1">ID</div>
               <div className="font-black text-[12px] leading-tight mb-0.5 tracking-tighter" style={{ color: primaryColor }}>25-0043</div>
               <div className="text-gray-600 font-bold text-[5px] uppercase">{INVOICE_TYPE_LABELS[invoiceInfoSection?.settings.invoiceType || 'proforma']}</div>
               <div className="h-px w-full bg-gray-50 my-2" />
               <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <span className="text-gray-600 text-[5px] font-bold">ORIGINAL</span>
               </div>
            </div>
            
            <div className="p-3 flex justify-between items-center bg-white/50">
               <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white rounded-lg p-2 shadow-sm border border-gray-50 flex items-center justify-center">
                     <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
                  </div>
                  <div className="flex flex-col">
                    <div className="font-black text-[10px] uppercase tracking-tight leading-none mb-0.5" style={{ color: primaryColor }}>{mockAgency.name}</div>
                    <div className="text-gray-600 text-[6px] font-bold uppercase tracking-widest">{mockAgency.nuit}</div>
                  </div>
               </div>
               <div className="text-right flex flex-col items-end">
                  <div className="font-bold text-[6px] uppercase text-gray-700 leading-tight mb-0.5 max-w-[120px]">{mockAgency.address}</div>
                  <div className="font-black text-[7px]" style={{ color: primaryColor }}>{mockAgency.email}</div>
                  <div className="text-gray-600 text-[6px] mt-0.5 font-bold">{mockAgency.phone}</div>
               </div>
            </div>
          </div>
        ) : layoutModel === 'letterhead' ? (
          <div className="relative mb-2">
             <div className="h-10 w-full flex items-center justify-between px-4 text-white relative overflow-hidden rounded-t-lg" style={{ backgroundColor: primaryColor }}>
                <div className="flex items-center gap-2 z-10">
                   <div className="w-7 h-7 bg-white/10 backdrop-blur rounded p-1.5 flex items-center justify-center">
                     <img src={mockAgency.logo_white_url} className="w-full h-full object-contain" alt="Logo" />
                   </div>
                   <div className="flex flex-col">
                     <span className="font-black text-[10px] uppercase leading-none">{mockAgency.name}</span>
                     <span className="text-[6px] opacity-90 truncate max-w-[100px] font-black">{mockAgency.address}</span>
                   </div>
                </div>
                <div className="flex gap-2 items-center z-10 border-l border-white/20 pl-4 h-6">
                   <div className="text-right flex flex-col">
                      <div className="text-[5px] uppercase opacity-80 font-black">Contato</div>
                      <div className="text-[7px] font-black leading-none">{mockAgency.phone}</div>
                      <div className="text-[5px] font-black opacity-80 uppercase leading-none mt-1">NUIT: {mockAgency.nuit}</div>
                   </div>
                   <div className="text-right flex flex-col">
                      <div className="text-[5px] uppercase opacity-80 font-black">Email / Endereço</div>
                      <div className="text-[7px] font-black leading-none">{mockAgency.email}</div>
                      <div className="text-[5px] font-black opacity-80 uppercase truncate max-w-[80px] leading-none mt-1">{mockAgency.address}</div>
                   </div>
                </div>
             </div>
             <div className="h-0.5 w-full bg-black/5" />
          </div>
        ) : layoutModel === 'compact' ? (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-50 bg-gray-50/10 px-2 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white shadow-sm overflow-hidden flex items-center justify-center border border-gray-100 p-1">
                <img src={mockAgency.logo_url} className="w-full h-full object-contain" alt="Logo" />
              </div>
              <div className="flex flex-col">
                 <span className="font-black text-[9px] uppercase tracking-tight" style={{ color: primaryColor }}>{mockAgency.name}</span>
                 <span className="text-[4px] text-gray-400 font-bold tracking-widest">{mockAgency.nuit}</span>
              </div>
            </div>
            {invoiceInfoSection && (
              <div className="text-right px-2 py-0.5 rounded-full border border-gray-100 bg-white">
                 <span className="text-[6px] font-black uppercase text-gray-600">
                    {INVOICE_TYPE_LABELS[invoiceInfoSection.settings.invoiceType || 'proforma']}
                 </span>
                 <span className="text-[6px] text-gray-400 font-bold ml-2 pl-2 border-l">#25-0043</span>
              </div>
            )}
          </div>
        ) : (
          /* CLASSIC / PROFESSIONAL DEFAULT - REFACTORED TO GRID (SCALED) */
          <div className="grid grid-cols-2 gap-2 mb-2 pb-4 border-b border-gray-100">
             <div className="flex flex-col justify-end">
                {mockAgency.logo_url && (
                   <div className="w-16 h-10 flex items-center justify-start mb-3">
                     <img src={mockAgency.logo_url} className="h-full object-contain" alt="Logo" />
                   </div>
                )}
                <div className="space-y-0.5">
                   <div className="text-gray-500 text-[5px] font-black uppercase tracking-[0.3em] mb-1">Empresa :</div>
                   <div className="font-black text-[11px] text-gray-800 leading-tight uppercase tracking-tighter" style={{ color: primaryColor }}>{mockAgency.name}</div>
                   <div className="text-gray-700 text-[6px] font-bold uppercase tracking-widest leading-none">NUIT: {mockAgency.nuit}</div>
                </div>
             </div>

             <div className="flex flex-col items-end justify-start text-right">
                <div className="mb-2">
                   <div className="text-gray-600 text-[6px] font-black uppercase tracking-[0.4em] mb-0.5">Documento</div>
                   <div className="font-black text-[20px] leading-none uppercase" style={{ color: primaryColor }}>
                     {invoiceInfoSection ? INVOICE_TYPE_LABELS[invoiceInfoSection.settings.invoiceType || 'proforma'] : 'Factura'}
                   </div>
                   <div className="text-[#1a1a1a] font-bold text-[6px] opacity-80 uppercase tracking-widest mt-1">Ref. 25-0043</div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-gray-50 pt-2 mt-1 w-full max-w-[140px]">
                   <div>
                      <div className="text-[5px] font-black text-gray-500 uppercase tracking-widest">Emissão</div>
                      <div className="text-[7px] font-black text-gray-700">25 MAR 25</div>
                   </div>
                   <div>
                      <div className="text-[5px] font-black text-gray-500 uppercase tracking-widest">Vencimento</div>
                      <div className="text-[7px] font-black text-gray-700 font-mono">08 ABR 25</div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* CLIENT + DATES SECTION (ADAPTIVE GAPS) - Hide for all-in-one layouts */}
        {layoutModel !== 'onix_hero' && 
         layoutModel !== 'borcelle_navy' && 
         layoutModel !== 'orange_geometric' && 
         layoutModel !== 'purple_angular' && 
         (clientSection || invoiceInfoSection) && (
          <div className={cn(
            "mb-2",
            layoutModel === 'modern_split' ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"
          )}>
            {layoutModel === 'modern_split' ? (
              <>
                <div className="rounded-xl p-3 border border-border bg-muted/5 shadow-sm">
                   <div className="text-[5px] font-bold text-primary uppercase tracking-widest mb-1 opacity-80">Cliente</div>
                   <div className="font-black text-[10px] mb-0.5 text-foreground uppercase tracking-tight">Quadrado Mágico</div>
                   <div className="text-gray-700 text-[6px] leading-relaxed font-bold">
                      Av. de Moçambique, 123 • Maputo<br/>
                      NUIT: 401 223 334 • vendas@quadrado.africa
                   </div>
                </div>
                <div className="rounded-xl p-3 border border-border bg-muted/5 shadow-sm">
                   <div className="text-[5px] font-bold text-gray-600 uppercase tracking-widest mb-1">Dados do Documento</div>
                   <div className="grid grid-cols-2 gap-1 gap-y-1.5 h-full content-center">
                       <div>
                         <div className="text-[4px] text-gray-600 uppercase font-bold tracking-widest">Emissão</div>
                         <div className="text-[7px] font-black uppercase tracking-tighter text-gray-900">25 Mar 2025</div>
                       </div>
                       <div className="text-right">
                         <div className="text-[4px] text-gray-600 uppercase font-bold tracking-widest">Total</div>
                         <div className="text-[9px] font-black text-gray-900">5.336 mt</div>
                       </div>
                    </div>
                </div>
              </>
            ) : (
              /* DEFAULT / COMPACT / SIDEBAR / etc. client box */
              <div 
                className={cn(
                  "rounded-md p-2",
                  layoutModel === 'compact' ? "mb-1 border border-border bg-transparent" : "mb-2",
                )}
                style={layoutModel !== 'compact' ? { backgroundColor: `${primaryColor}20` } : {}}
              >
                <div className="flex justify-between gap-2">
                  {/* Left: Client Info */}
                  {clientSection && (
                    <div className="flex-1">
                       <div className="text-[5px] text-gray-400 mb-0.5 uppercase font-bold tracking-widest">Facturar para</div>
                       <div className="font-black text-[10px] text-gray-800 uppercase leading-none tracking-tight">Quadrado Mágico</div>
                       <div className="text-gray-500 text-[6px] mt-1 space-y-0.5 leading-tight font-medium">
                          <div>Av. de Moçambique, 123 • Maputo</div>
                          <div>NUIT: 401 223 334</div>
                          {clientSection.settings.showClientEmail && <div>vendas@quadrado.africa</div>}
                       </div>
                    </div>
                  )}

                  {/* Right: Dates + Total */}
                  {invoiceInfoSection && (
                    <div className={cn(
                      "text-right px-2",
                      layoutModel !== 'compact' && "border-l border-gray-300"
                    )}>
                      <div className="text-[5px]">
                        <span className="text-gray-500">Data: </span>
                        <span>25/12/2025</span>
                      </div>
                      {invoiceInfoSection.settings.showTotalInHeader && (
                        <div className="mt-1 pt-1 border-t border-gray-300">
                          <div className="font-bold text-[8px]" style={{ color: primaryColor }}>
                            Total: 5.336 mt
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SERVICES TABLE - Numbered rows */}
        {servicesSection && (
          <div className="mb-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2" style={{ borderColor: primaryColor }}>
                  {servicesSection.settings.showRowNumbers && (
                    <th className="py-0.5 text-[5px] text-gray-500 w-4">Nº</th>
                  )}
                  <th className="py-0.5 text-[5px] text-gray-500">DESCRIÇÃO</th>
                  {servicesSection.settings.showQuantity && (
                    <th className="py-0.5 text-[5px] text-gray-500 w-6 text-center">QNT.</th>
                  )}
                  {servicesSection.settings.showUnitPrice && (
                    <th className="py-0.5 text-[5px] text-gray-500 w-10 text-right">P. UNIT.</th>
                  )}
                  <th className="py-0.5 text-[5px] text-gray-500 w-10 text-right">QUANTIA</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                   <tr key={i} className="border-b border-gray-100">
                    {servicesSection.settings.showRowNumbers && (
                      <td className="py-0.5 text-[6px] text-gray-400">{i}.</td>
                    )}
                    <td className="py-0.5 text-[6px]">Serviço de exemplo {i}</td>
                    {servicesSection.settings.showQuantity && (
                      <td className="py-0.5 text-[6px] text-center">1</td>
                    )}
                    {servicesSection.settings.showUnitPrice && (
                      <td className="py-0.5 text-[6px] text-right">650 mt</td>
                    )}
                    <td className="py-0.5 text-[6px] text-right">650 mt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NOTES + TOTALS - Side by side */}
        {totalsSection && (
          <div className={cn(
            "flex gap-2 mb-2 mt-auto pt-2",
            layoutModel === 'onix_hero' ? "items-end" : "items-start"
          )}>
             {/* Left: Notes & Support */}
             <div className="flex-1">
                {layoutModel === 'purple_angular' ? (
                   <div className="flex flex-col gap-3">
                      <div className="bg-purple-50 p-2 rounded-lg border-l-2 border-[#7c3aed] max-w-[180px]">
                         <div className="text-[7px] font-black text-[#7c3aed] uppercase mb-1">Dúvidas ou Suporte?</div>
                         <div className="text-[5px] text-gray-400 font-bold uppercase leading-tight mb-1">
                            Se houver qualquer problema com <br/> este documento, contacte-nos:
                         </div>
                         <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                               <div className="w-2 h-2 rounded bg-[#7c3aed] flex items-center justify-center text-white text-[4px]">P</div>
                               <span className="text-[6px] font-black">{mockAgency.phone}</span>
                            </div>
                            <div className="flex items-center gap-1">
                               <div className="w-2 h-2 rounded bg-[#7c3aed] flex items-center justify-center text-white text-[4px]">E</div>
                               <span className="text-[6px] font-black uppercase text-[5px]">{mockAgency.email}</span>
                            </div>
                         </div>
                      </div>
                      <div className="text-[10px] font-medium italic text-gray-400">Obrigado pela preferência!</div>
                   </div>
                ) : layoutModel === 'borcelle_navy' ? (
                   <div className="bg-transparent pr-4">
                      <div className="text-[8px] font-black uppercase mb-1 text-[#1e3a8a]">Forma de pagamento:</div>
                      <div className="text-[7px] font-black text-gray-800 mb-2">Transferência Bancária</div>
                      <div className="text-[5px] text-gray-400 max-w-[200px] leading-relaxed italic border-l border-[#1e3a8a] pl-2 opacity-70">
                         Nota: O serviço aqui apresentado tem uma validade contratual de 30 dias após emissão.
                      </div>
                   </div>
                ) : layoutModel === 'onix_hero' ? (
                   <div className="bg-transparent pr-4">
                      <div className="text-[8px] font-black uppercase mb-1">Nota :</div>
                      <div className="text-[6px] text-gray-500 max-w-[220px] leading-relaxed">
                         Este é um documento preliminar enviado ao cliente com os preços de um produto ou serviço com o objetivo de informá-lo(a) antes da venda ser confirmada.
                      </div>
                   </div>
                ) : (
                 totalsSection.settings.showNotes && (
               <div className="flex-1">
                  <div className="text-[5px] text-gray-700 mb-0.5 font-bold">Nota:</div>
                  <div className="text-[6px] text-gray-800 font-medium">
                   Este é um documento enviado ao cliente informando os preços antes da venda.
                  </div>
               </div>
                 )
                )}
             </div>

            {/* Right: Totals */}
            <div className="text-right ml-auto">
              {layoutModel === 'onix_hero' ? (
                 <div className="bg-[#1a1a1b] rounded-xl overflow-hidden p-0 min-w-[120px] shadow-lg border border-white/5">
                    <div className="px-3 py-1.5 space-y-0.5 border-b border-white/5">
                       <div className="flex justify-between text-[5px] gap-2">
                          <span className="text-white/40 uppercase font-black tracking-widest">Sub-Total :</span>
                          <span className="text-white font-black">4.600 mt</span>
                       </div>
                       <div className="flex justify-between text-[5px] gap-2">
                          <span className="text-white/40 uppercase font-black tracking-widest">IVA 16% :</span>
                          <span className="text-white font-black">736 mt</span>
                       </div>
                    </div>
                    <div className="bg-[#bef264] px-3 py-1 flex justify-between items-center gap-2">
                       <span className="text-black font-black text-[7px] uppercase tracking-tighter">Total :</span>
                       <span className="text-black font-black text-[10px]">5.336 mt</span>
                    </div>
                 </div>
              ) : (
                <>
                  {totalsSection.settings.showSubtotal && (
                    <div className="flex justify-end gap-2 text-[6px]">
                      <span className="text-gray-500">Sub-Total:</span>
                      <span className="w-12">4.600 mt</span>
                    </div>
                  )}
                  {totalsSection.settings.showTax && (
                    <div className="flex justify-end gap-2 text-[6px]">
                      <span className="text-gray-500">IVA 16%:</span>
                      <span className="w-12">736 mt</span>
                    </div>
                  )}
                   <div 
                    className={cn(
                       "flex justify-end gap-2 text-[7px] font-bold mt-0.5 pt-0.5 border-t",
                       layoutModel === 'purple_angular' ? "bg-[#7c3aed] text-white p-2 rounded mt-2 border-none" : ""
                    )}
                    style={layoutModel === 'purple_angular' ? {} : { borderColor: primaryColor }}
                  >
                    <span className={layoutModel === 'purple_angular' ? "text-[10px] font-black tracking-widest uppercase" : ""}>Total:</span>
                    <span className={cn("w-16 text-right", layoutModel === 'purple_angular' ? "text-[12px] font-black" : "")} style={layoutModel === 'purple_angular' ? {} : { color: primaryColor }}>5.336 mt</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* FOOTER - Three columns: Payment | Legal | Signature */}
        {(paymentSection || signaturesSection || footerSection) && (
          <div 
            className={cn(
              "pt-2 border-t flex items-start gap-2",
              layoutModel === 'onix_hero' ? "border-gray-100" : ""
            )}
            style={{ borderColor: layoutModel === 'onix_hero' ? undefined : primaryColor }}
          >
             {/* Column 1: Payment */}
             {paymentSection && (
               <div className="flex-1">
                 {layoutModel === 'orange_geometric' ? (
                    <div className="flex flex-col gap-1">
                       <div className="text-[8px] font-black uppercase text-[#fb923c] mb-1">Informação Pagamento:</div>
                       <div className="space-y-0.5">
                          <div className="flex text-[6px] border-b border-gray-100 pb-0.5">
                             <span className="w-16 text-gray-400 font-bold uppercase">Banco :</span>
                             <span className="font-black uppercase">Standard Bank</span>
                          </div>
                          <div className="flex text-[6px] border-b border-gray-100 pb-0.5">
                             <span className="w-16 text-gray-400 font-bold uppercase">Conta No :</span>
                             <span className="font-black">781 092 695 001</span>
                          </div>
                          <div className="flex text-[6px]">
                             <span className="w-16 text-gray-400 font-bold uppercase">Titular :</span>
                             <span className="font-black uppercase">{mockAgency.name}</span>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <>
                      <div className="text-[8px] font-black uppercase mb-1 flex items-center gap-1.5">
                         {layoutModel === 'onix_hero' && <div className="w-1.5 h-1.5 bg-[#bef264] rounded-full" />}
                         No. de Conta
                      </div>
                      <div className="space-y-0.5 text-gray-600">
                        {paymentSection.settings.showPaymentProvider && (
                          <div className="text-[6px] flex items-center gap-1 whitespace-nowrap">
                            <span className="font-bold w-10 text-gray-400 shrink-0">BIM : </span>
                            <span className="font-mono">781 092 695</span>
                          </div>
                        )}
                        {paymentSection.settings.showPaymentAccount && (
                          <div className="text-[6px] flex items-center gap-1 whitespace-nowrap">
                            <span className="font-bold w-10 text-gray-400 shrink-0 font-sans uppercase">E-Mola : </span>
                            <span className="font-mono">(+258) 86 849 9221</span>
                          </div>
                        )}
                        {paymentSection.settings.showPaymentRecipient && (
                          <div className="text-[6px] flex items-center gap-1 whitespace-nowrap">
                             <span className="font-bold w-10 text-gray-400 shrink-0">M-Pesa : </span>
                             <span className="font-mono">(+258) 853 135 136</span>
                          </div>
                        )}
                      </div>
                    </>
                 )}
               </div>
             )}

            {/* Column 2: Legal/Thanks */}
            {footerSection && (
              <div className="flex-1 text-center pb-1">
                   {layoutModel !== 'onix_hero' && (
                      <div className="text-[5px] text-gray-400 leading-relaxed max-w-[150px] mx-auto">
                         {footerSection.settings.footerLegalText || 'Documento não válido para fins fiscais.'}
                      </div>
                   )}
                {layoutModel === 'onix_hero' ? (
                   <div className="text-[5px] mt-1 font-black uppercase opacity-80 leading-tight flex flex-col items-center text-center">
                      <span>Obrigado por confiar na {mockAgency.name}.</span>
                      <span className="text-[#84cc16]">Construímos para durar.</span>
                   </div>
                ) : (
                   <div className="text-[5px] mt-1" style={{ color: primaryColor }}>
                     {footerSection.settings.footerText || 'Obrigado pela preferência!'}
                   </div>
                )}
              </div>
            )}

            {/* Column 3: Signature */}
            {signaturesSection && signaturesSection.settings.showAgencySignature && (
              <div className="flex-1 text-right flex flex-col items-end">
                <div className="border-b border-gray-300 mb-1 h-3 w-20 ml-auto"></div>
                <div className="text-[7px] font-black uppercase mt-1">
                  {layoutModel === 'onix_hero' ? 'Domingos Lequechane' : (layoutModel === 'purple_angular' ? mockAgency.name : (signaturesSection.settings.agencySignatureLabel || 'O Responsável'))}
                </div>
                {layoutModel === 'onix_hero' && <div className="text-[5px] text-gray-400 font-bold">CEO & Fundador</div>}
              </div>
            )}
          </div>
        )}

        {/* Universal Footer Attribution */}
        <div className="mt-1 pb-0 text-center w-full relative">
           <div className="text-[5px] text-gray-300 font-bold tracking-tight uppercase opacity-50 relative z-10">
              Documento processado eletronicamente pelo Qualify.<br/>
              Termos e condições de serviço aplicáveis.
           </div>
           
           {/* Bottom Curves Decoration for Borcelle Navy */}
           {layoutModel === 'borcelle_navy' && (
              <div className="absolute -bottom-8 right-0 left-0 h-20 -z-0 pointer-events-none transform rotate-180 opacity-60">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,80 C150,150 350,0 500,80 L500,0 L0,0 Z" fill="#1e3a8a" />
                  <path d="M0,60 C180,110 320,20 500,60 L500,0 L0,0 Z" fill="#2563eb" opacity="0.4" />
                </svg>
              </div>
           )}
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
