const fs = require('fs');
let content = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// Imports
content = content.replace(
  "import { downloadInvoicePDF, generateInvoicePDF } from '@/lib/invoice-pdf-generator';",
  "import { downloadInvoicePDF } from '@/lib/invoice-pdf-generator';\nimport { PrintableInvoice } from '../invoice-editor/PrintableInvoice';\nimport { DEFAULT_SECTIONS } from '../invoice-editor/section-types';\nimport { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';"
);

// We need an invoice data state or object
content = content.replace(
  /const handleGeneratePreview = async \(\) => \{/g,
  `// Current invoice data constructed on the fly
  const currentInvoiceData = {
    invoiceNumber: 'FAC-XXX', // Preview dummy or real if generated
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: dueDate || undefined,
    client: {
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      address: client.address,
    },
    agency: agencyInfo || { name: '' },
    services: formServices.filter(s => s.description && s.total > 0),
    subtotal: calculateTotals().subtotal,
    taxPercentage,
    taxAmount: calculateTotals().taxAmount,
    total: calculateTotals().total,
    currency: agencyInfo?.currency || 'MZN',
    notes: notes || undefined,
    invoiceType: 'factura' as any,
  };

  const handleGeneratePreview = async () => {`
);

// Fix the preview rendering
// Instead of setting previewUrl, just set showPreview
content = content.replace(
  /const handleGeneratePreview = async \(\) => \{[\s\S]*?setGeneratingPreview\(false\);\n    \}\n  \};/g,
  `const handleGeneratePreview = async () => {
    setGeneratingPreview(true);
    setTimeout(() => {
      setShowPreview(true);
      setGeneratingPreview(false);
    }, 500); // Simulate processing so user sees loading state
  };`
);

// Fix handleGenerateInvoice
// Replace downloadInvoicePDF with generateHtmlPDF
content = content.replace(
  /\/\/ Generate and download PDF[\s\S]*?downloadInvoicePDF\(\{[\s\S]*?\}\);/g,
  `// Generate and download PDF from HTML
      await generateHtmlPDF('hidden-printable-invoice', \`\${invoiceNumber}.pdf\`, templateSettings?.paper_size || 'A4');`
);

// Render PrintableInvoice in the preview pane
content = content.replace(
  /\{previewUrl \? \([\s\S]*?<iframe[\s\S]*?title="Pré-visualização da Factura"[\s\S]*?\/>[\s\S]*?\) : \(/g,
  `{showPreview ? (
                    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-gray-100 p-4">
                       <PrintableInvoice 
                          invoiceData={{...currentInvoiceData, invoiceNumber: 'FAC-XXX'}}
                          sections={templateSettings?.custom_layout || DEFAULT_SECTIONS}
                          paperSize={templateSettings?.paper_size || 'A4'}
                          primaryColor={templateSettings?.primary_color || '#C5E86C'}
                          templateStyle={templateSettings?.template_style || 'onix'}
                          layoutModel={(templateSettings as any)?.layout_model || 'classic'}
                          agency={agencyInfo as any}
                          showWatermark={templateSettings?.show_watermark}
                       />
                    </div>
                  ) : (`
);

// Add the hidden printable invoice at the bottom of the DialogContent
content = content.replace(
  /<\/DialogContent>/g,
  `  {/* Hidden container for PDF generation */}
        <div id="hidden-printable-invoice" className="absolute left-[-9999px] top-[-9999px] w-[794px] bg-white pointer-events-none">
          <PrintableInvoice 
            invoiceData={currentInvoiceData}
            sections={templateSettings?.custom_layout || DEFAULT_SECTIONS}
            paperSize={templateSettings?.paper_size || 'A4'}
            primaryColor={templateSettings?.primary_color || '#C5E86C'}
            templateStyle={templateSettings?.template_style || 'onix'}
            layoutModel={(templateSettings as any)?.layout_model || 'classic'}
            agency={agencyInfo as any}
            showWatermark={templateSettings?.show_watermark}
          />
        </div>
      </DialogContent>`
);


fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', content);
console.log('Updated modal successfully');
