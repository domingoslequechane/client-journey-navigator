const fs = require('fs');
let c = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// 1. Fix imports - replace old imports with new ones
c = c.replace(
  "import { downloadInvoicePDF, generateInvoicePDF } from '@/lib/invoice-pdf-generator';",
  `import { PrintableInvoice } from '../invoice-editor/PrintableInvoice';
import { DEFAULT_SECTIONS, LayoutModel } from '../invoice-editor/section-types';
import { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';`
);

// 2. Add layout_model and font_family to TemplateSettings interface
c = c.replace(
  "  footer_text?: string;\n}",
  "  footer_text?: string;\n  layout_model?: string;\n  font_family?: string;\n}"
);

// 3. Fix DB query to fetch layout_model and font_family
c = c.replace(
  ".select('template_style, primary_color, show_watermark, custom_layout, paper_size, footer_text')",
  ".select('template_style, primary_color, show_watermark, custom_layout, paper_size, footer_text, layout_model, font_family')"
);

// 4. Fix templateSettings state setting to include layout_model and font_family
c = c.replace(
  `          footer_text: templateData.footer_text || undefined,\n        });`,
  `          footer_text: templateData.footer_text || undefined,\n          layout_model: templateData.layout_model || 'letterhead',\n          font_family: templateData.font_family || 'Inter',\n        });`
);
c = c.replace(
  `          show_watermark: false,\n        });`,
  `          show_watermark: false,\n          layout_model: 'letterhead',\n          font_family: 'Inter',\n        });`
);

// 5. Remove old generateInvoicePDF preview logic and replace with just setShowPreview(true)
c = c.replace(
  /const handleGeneratePreview[\s\S]*?setGeneratingPreview\(false\);\n    \}\n  \};/,
  `const handleGeneratePreview = () => {
    if (!agencyInfo) {
      toast({ title: 'Erro', description: 'Informações da organização não encontradas', variant: 'destructive' });
      return;
    }
    const validServices = formServices.filter(s => s.description && s.total > 0);
    if (validServices.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um serviço válido', variant: 'destructive' });
      return;
    }
    setShowPreview(true);
  };`
);

// 6. Replace old downloadInvoicePDF call in handleGenerateInvoice with HTML to PDF
c = c.replace(
  /\/\/ Generate and download PDF\n      downloadInvoicePDF\(\{[\s\S]*?\}\);/,
  `// Generate and download PDF from template
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        await generateHtmlPDF('new-invoice-printable', \`Factura-\${invoiceNumber}.pdf\`, templateSettings?.paper_size || 'A4');
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
      }`
);

// 7. Replace the entire preview rendering section (iframe) with live InvoicePreview
c = c.replace(
  `{previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title="Pré-visualização da Factura"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Clique em "Actualizar" para gerar o preview</p>
                      </div>
                    </div>
                  )}`,
  `<div className="w-full h-full overflow-y-auto overflow-x-hidden bg-gray-100 p-2">
                    <PrintableInvoice
                      invoiceData={{
                        invoiceNumber: 'PRV-000',
                        issueDate: new Date().toISOString().split('T')[0],
                        dueDate: dueDate || undefined,
                        client: { companyName: client.companyName, contactName: client.contactName, email: client.email, phone: client.phone, address: client.address },
                        agency: agencyInfo as any,
                        services: formServices.filter(s => s.description && s.total > 0),
                        subtotal,
                        taxPercentage,
                        taxAmount,
                        total,
                        currency: agencyInfo?.currency || 'MZN',
                        notes: notes || undefined,
                        invoiceType: 'factura' as any,
                      }}
                      sections={templateSettings?.custom_layout || DEFAULT_SECTIONS}
                      paperSize={(templateSettings?.paper_size as any) || 'A4'}
                      primaryColor={templateSettings?.primary_color || '#C5E86C'}
                      templateStyle={templateSettings?.template_style || 'onix'}
                      layoutModel={(templateSettings?.layout_model as LayoutModel) || 'letterhead'}
                      fontFamily={templateSettings?.font_family || 'Inter'}
                      agency={agencyInfo as any}
                      showWatermark={templateSettings?.show_watermark}
                    />
                  </div>`
);

// 8. Add hidden invoice for new invoice PDF generation
c = c.replace(
  `      {downloadingInvoiceData && (`,
  `      {/* Hidden invoice for new invoice PDF generation */}
      <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none z-[-1] bg-white" style={{ width: '794px' }}>
        <div id="new-invoice-printable" className="w-full bg-white">
          <PrintableInvoice
            invoiceData={{
              invoiceNumber: 'FAC-GEN',
              issueDate: new Date().toISOString().split('T')[0],
              dueDate: dueDate || undefined,
              client: { companyName: client.companyName, contactName: client.contactName, email: client.email, phone: client.phone, address: client.address },
              agency: agencyInfo as any,
              services: formServices.filter(s => s.description && s.total > 0),
              subtotal, taxPercentage, taxAmount, total,
              currency: agencyInfo?.currency || 'MZN',
              notes: notes || undefined,
              invoiceType: 'factura' as any,
            }}
            sections={templateSettings?.custom_layout || DEFAULT_SECTIONS}
            paperSize={(templateSettings?.paper_size as any) || 'A4'}
            primaryColor={templateSettings?.primary_color || '#C5E86C'}
            templateStyle={templateSettings?.template_style || 'onix'}
            layoutModel={(templateSettings?.layout_model as LayoutModel) || 'letterhead'}
            fontFamily={templateSettings?.font_family || 'Inter'}
            agency={agencyInfo as any}
            showWatermark={templateSettings?.show_watermark}
          />
        </div>
      </div>

      {downloadingInvoiceData && (`
);

// 9. Update downloadingInvoiceData PrintableInvoice to use layout_model and font_family too
c = c.replace(
  `              layoutModel={(templateSettings as any)?.layout_model || 'classic'}
              agency={agencyInfo as any}
              showWatermark={templateSettings?.show_watermark}
            />
          </div>
        </div>
      )}`,
  `              layoutModel={(templateSettings?.layout_model as LayoutModel) || 'letterhead'}
              fontFamily={templateSettings?.font_family || 'Inter'}
              agency={agencyInfo as any}
              showWatermark={templateSettings?.show_watermark}
            />
          </div>
        </div>
      )}`
);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', c);
console.log('Done!');
