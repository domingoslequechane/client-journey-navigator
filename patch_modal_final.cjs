const fs = require('fs');
let c = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// 1. Replace imports
c = c.replace(
  "import { downloadInvoicePDF, generateInvoicePDF } from '@/lib/invoice-pdf-generator';",
  `import { PrintableInvoice } from '../invoice-editor/PrintableInvoice';
import { DEFAULT_SECTIONS, LayoutModel } from '../invoice-editor/section-types';
import { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';`
);

// 2. Add layout_model & font_family to TemplateSettings interface
c = c.replace(
  "  footer_text?: string;\n}",
  "  footer_text?: string;\n  layout_model?: string;\n  font_family?: string;\n}"
);

// 3. Fix DB query to also load layout_model and font_family
c = c.replace(
  ".select('template_style, primary_color, show_watermark, custom_layout, paper_size, footer_text')",
  ".select('template_style, primary_color, show_watermark, custom_layout, paper_size, footer_text, layout_model, font_family')"
);

// 4. Add layout_model & font_family when templateData exists
c = c.replace(
  "          footer_text: templateData.footer_text || undefined,\n        });",
  "          footer_text: templateData.footer_text || undefined,\n          layout_model: (templateData as any).layout_model || 'letterhead',\n          font_family: (templateData as any).font_family || 'Inter',\n        });"
);
// Default case
c = c.replace(
  "          show_watermark: false,\n        });",
  "          show_watermark: false,\n          layout_model: 'letterhead',\n          font_family: 'Inter',\n        });"
);

// 5. Replace entire handleGeneratePreview - just sets showPreview to true
c = c.replace(
  `  const handleGeneratePreview = () => {
    if (!agencyInfo) {
      toast({ title: 'Erro', description: 'Informações da organização não encontradas', variant: 'destructive' });
      return;
    }

    const validServices = formServices.filter(s => s.description && s.total > 0);
    if (validServices.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um serviço válido', variant: 'destructive' });
      return;
    }

    setGeneratingPreview(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const issueDate = new Date().toISOString().split('T')[0];

      const pdf = generateInvoicePDF({
        invoiceNumber: 'FAC-XXX',
        issueDate,
        dueDate: dueDate || undefined,
        client: {
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address,
        },
        agency: agencyInfo,
        services: validServices,
        subtotal,
        taxPercentage,
        taxAmount,
        total,
        currency: agencyInfo.currency,
        notes: notes || undefined,
        invoiceType: 'factura',
        templateStyle: templateSettings?.template_style || 'onix',
        primaryColor: templateSettings?.primary_color || '#C5E86C',
        showWatermark: templateSettings?.show_watermark,
        customLayout: templateSettings?.custom_layout,
        footerText: templateSettings?.footer_text,
      });

      const dataUri = pdf.output('datauristring');
      setPreviewUrl(dataUri);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar a pré-visualização', variant: 'destructive' });
    } finally {
      setGeneratingPreview(false);
    }
  };`,
  `  const handleGeneratePreview = () => {
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

// 6. Replace handleGenerateInvoice PDF download call
c = c.replace(
  `      // Generate and download PDF
      downloadInvoicePDF({
        invoiceNumber,
        issueDate,
        dueDate: dueDate || undefined,
        client: {
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address,
        },
        agency: agencyInfo,
        services: validServices,
        subtotal,
        taxPercentage,
        taxAmount,
        total,
        currency: agencyInfo.currency,
        notes: notes || undefined,
        invoiceType: 'factura',
        templateStyle: templateSettings?.template_style || 'onix',
        primaryColor: templateSettings?.primary_color || '#C5E86C',
        showWatermark: templateSettings?.show_watermark,
        customLayout: templateSettings?.custom_layout,
        footerText: templateSettings?.footer_text,
      });`,
  `      // Generate and download PDF from template
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        await generateHtmlPDF('hidden-new-invoice', \`Factura-\${invoiceNumber}.pdf\`, (templateSettings?.paper_size || 'A4') as any);
      } catch (pdfErr) { console.error('PDF error', pdfErr); }`
);

// 7. Replace handleDownloadInvoice
c = c.replace(
  `  const handleDownloadInvoice = (invoice: Invoice) => {
    if (!agencyInfo) return;

    downloadInvoicePDF({
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date || undefined,
      client: {
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        address: client.address,
      },
      agency: agencyInfo,
      services: invoice.services,
      subtotal: invoice.subtotal,
      taxPercentage: invoice.tax_percentage,
      taxAmount: invoice.tax_amount,
      total: invoice.total,
      currency: agencyInfo.currency,
      notes: invoice.notes || undefined,
      invoiceType: 'factura',
      templateStyle: templateSettings?.template_style || 'onix',
      primaryColor: templateSettings?.primary_color || '#C5E86C',
      showWatermark: templateSettings?.show_watermark,
      customLayout: templateSettings?.custom_layout,
      footerText: templateSettings?.footer_text,
    });
  };`,
  `  const [downloadingInvoice, setDownloadingInvoice] = React.useState<Invoice | null>(null);
  
  React.useEffect(() => {
    if (!downloadingInvoice || !agencyInfo) return;
    const inv = downloadingInvoice;
    const run = async () => {
      toast({ title: 'A gerar PDF...', description: 'Por favor aguarde.' });
      await new Promise(r => setTimeout(r, 400));
      await generateHtmlPDF('hidden-history-invoice', \`Factura-\${inv.invoice_number}.pdf\`, (templateSettings?.paper_size || 'A4') as any);
      setDownloadingInvoice(null);
    };
    run().catch(e => { console.error(e); setDownloadingInvoice(null); });
  }, [downloadingInvoice]);

  const handleDownloadInvoice = (invoice: Invoice) => {
    setDownloadingInvoice(invoice);
  };`
);

// 8. Add React import
c = c.replace("import { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';");

// 9. Replace iframe preview with live PrintableInvoice
c = c.replace(
  `                <div className="border rounded-lg overflow-hidden bg-muted/30 flex-1">
                  {previewUrl ? (
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
                  )}
                </div>`,
  `                <div className="border rounded-lg overflow-auto bg-gray-100 flex-1 p-2">
                  <PrintableInvoice
                    invoiceData={{
                      invoiceNumber: 'PRV-000',
                      issueDate: new Date().toISOString().split('T')[0],
                      dueDate: dueDate || undefined,
                      client: { companyName: client.companyName, contactName: client.contactName, email: client.email, phone: client.phone, address: client.address },
                      agency: agencyInfo as any,
                      services: formServices.filter(s => s.description && s.total > 0).length > 0
                        ? formServices.filter(s => s.description && s.total > 0)
                        : [{ description: 'Serviço de exemplo', quantity: 1, unit_price: 100, total: 100 }],
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
                </div>`
);

// 10. Add hidden invoice containers before </DialogContent>
c = c.replace(
  '      </DialogContent>',
  `      {/* Hidden invoice for PDF generation - new */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none" style={{width:'794px',zIndex:-1,background:'white'}}>
        <div id="hidden-new-invoice">
          <PrintableInvoice
            invoiceData={{ invoiceNumber:'FAC-GEN', issueDate:new Date().toISOString().split('T')[0], dueDate:dueDate||undefined,
              client:{companyName:client.companyName,contactName:client.contactName,email:client.email,phone:client.phone,address:client.address},
              agency:agencyInfo as any, services:formServices.filter(s=>s.description&&s.total>0),
              subtotal,taxPercentage,taxAmount,total, currency:agencyInfo?.currency||'MZN', notes:notes||undefined, invoiceType:'factura' as any }}
            sections={templateSettings?.custom_layout||DEFAULT_SECTIONS} paperSize={(templateSettings?.paper_size as any)||'A4'}
            primaryColor={templateSettings?.primary_color||'#C5E86C'} templateStyle={templateSettings?.template_style||'onix'}
            layoutModel={(templateSettings?.layout_model as LayoutModel)||'letterhead'} fontFamily={templateSettings?.font_family||'Inter'}
            agency={agencyInfo as any} showWatermark={templateSettings?.show_watermark}
          />
        </div>
      </div>
      {/* Hidden invoice for PDF generation - history */}
      {downloadingInvoice && agencyInfo && (
        <div className="fixed left-[-9999px] top-0 pointer-events-none" style={{width:'794px',zIndex:-1,background:'white'}}>
          <div id="hidden-history-invoice">
            <PrintableInvoice
              invoiceData={{ invoiceNumber:downloadingInvoice.invoice_number, issueDate:downloadingInvoice.issue_date, dueDate:downloadingInvoice.due_date||undefined,
                client:{companyName:client.companyName,contactName:client.contactName,email:client.email,phone:client.phone,address:client.address},
                agency:agencyInfo as any, services:downloadingInvoice.services,
                subtotal:downloadingInvoice.subtotal, taxPercentage:downloadingInvoice.tax_percentage, taxAmount:downloadingInvoice.tax_amount, total:downloadingInvoice.total,
                currency:agencyInfo.currency, notes:downloadingInvoice.notes||undefined, invoiceType:'factura' as any }}
              sections={templateSettings?.custom_layout||DEFAULT_SECTIONS} paperSize={(templateSettings?.paper_size as any)||'A4'}
              primaryColor={templateSettings?.primary_color||'#C5E86C'} templateStyle={templateSettings?.template_style||'onix'}
              layoutModel={(templateSettings?.layout_model as LayoutModel)||'letterhead'} fontFamily={templateSettings?.font_family||'Inter'}
              agency={agencyInfo as any} showWatermark={templateSettings?.show_watermark}
            />
          </div>
        </div>
      )}
      </DialogContent>`
);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', c);
console.log('Done!');
