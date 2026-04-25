const fs = require('fs');
let content = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// Imports
content = content.replace(
  "import { downloadInvoicePDF, generateInvoicePDF } from '@/lib/invoice-pdf-generator';",
  "import { downloadInvoicePDF } from '@/lib/invoice-pdf-generator';\nimport { PrintableInvoice } from '../invoice-editor/PrintableInvoice';\nimport { DEFAULT_SECTIONS } from '../invoice-editor/section-types';\nimport { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';"
);

// handleGenerateInvoice: replace downloadInvoicePDF call with HTML-to-PDF
content = content.replace(
  /downloadInvoicePDF\(\{\s+invoiceNumber,\s+issueDate,\s+dueDate:[\s\S]*?\}\);/g,
  `await generateHtmlPDF('hidden-printable-invoice', \`Factura-\${invoiceNumber}.pdf\`, templateSettings?.paper_size || 'A4');`
);

// Preview rendering: replace the iframe with PrintableInvoice
const previewBoxStart = content.indexOf('{previewUrl ? (');
const previewBoxEnd = content.indexOf('</div>\n              </div>\n            )}');

const newPreviewBox = `{showPreview ? (
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
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Clique em "Actualizar" para gerar o preview</p>
                      </div>
                    </div>
                  )}`;

if (previewBoxStart !== -1 && previewBoxEnd !== -1) {
  content = content.substring(0, previewBoxStart) + newPreviewBox + content.substring(previewBoxEnd);
}

// Add hidden printable invoice for actual download
content = content.replace(
  /<\/DialogContent>/g,
  `  {/* Hidden container for PDF generation */}
        <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none z-[-1] bg-white" style={{ width: '794px' }}>
          <div id="hidden-printable-invoice" className="w-full h-full bg-white">
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
        </div>
      </DialogContent>`
);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', content);
console.log('Update 3 success');
