const fs = require('fs');
let content = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// 1. Add state for downloading invoice
const stateRegex = /const \[generating, setGenerating\] = useState\(false\);/;
content = content.replace(stateRegex, "const [generating, setGenerating] = useState(false);\n  const [downloadingInvoiceData, setDownloadingInvoiceData] = useState<any>(null);");

// 2. Add useEffect for triggering download
const useEffectImportRegex = /import \{ useState, useEffect \} from 'react';/;
if (!useEffectImportRegex.test(content)) {
    // Should already be there but just in case
}

const calculateTotalsStr = 'const calculateTotals = () => {';
content = content.replace(calculateTotalsStr, `
  useEffect(() => {
    const triggerDownload = async () => {
      if (downloadingInvoiceData) {
        toast({ title: 'A gerar PDF', description: 'Por favor, aguarde enquanto o documento é preparado...' });
        try {
          // Wait a tick for the DOM to render the hidden component
          await new Promise(resolve => setTimeout(resolve, 500));
          await generateHtmlPDF('history-printable-invoice', \`Factura-\${downloadingInvoiceData.invoiceNumber}.pdf\`, templateSettings?.paper_size || 'A4');
        } catch (error) {
          console.error('Download error:', error);
          toast({ title: 'Erro', description: 'Ocorreu um erro ao gerar o PDF.', variant: 'destructive' });
        } finally {
          setDownloadingInvoiceData(null);
        }
      }
    };
    triggerDownload();
  }, [downloadingInvoiceData, templateSettings]);

  const calculateTotals = () => {`);

// 3. Replace handleDownloadInvoice
const handleDownloadRegex = /const handleDownloadInvoice = \(invoice: Invoice\) => \{[\s\S]*?\}\);[\s\n]*\};/;
const newHandleDownload = `const handleDownloadInvoice = (invoice: Invoice) => {
    if (!agencyInfo) return;

    setDownloadingInvoiceData({
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
    });
  };`;
content = content.replace(handleDownloadRegex, newHandleDownload);

// 4. Add the hidden container for history
const hiddenContainerRegex = /<\/DialogContent>/;
const newHiddenContainer = `
      {downloadingInvoiceData && (
        <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none z-[-1] bg-white" style={{ width: '794px' }}>
          <div id="history-printable-invoice" className="w-full h-full bg-white">
            <PrintableInvoice 
              invoiceData={downloadingInvoiceData}
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
      )}
      </DialogContent>`;
content = content.replace(hiddenContainerRegex, newHiddenContainer);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', content);
console.log('Successfully updated ServiceInvoiceModal to handle history downloads with HTML to PDF!');
