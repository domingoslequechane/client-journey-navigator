const fs = require('fs');
let c = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// 1. Add the missing state definition if not present
if (!c.includes('const [downloadingInvoice, setDownloadingInvoice]')) {
    // Find where other states are defined
    c = c.replace(
        "const [organizationId, setOrganizationId] = useState<string | null>(null);",
        "const [organizationId, setOrganizationId] = useState<string | null>(null);\n  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);"
    );
}

// 2. Add the effect for downloading if not present
if (!c.includes('useEffect(() => {\n    if (!downloadingInvoice || !agencyInfo) return;')) {
    // Find a good place for the effect, e.g., after loadData
    const effectCode = `
  useEffect(() => {
    if (!downloadingInvoice || !agencyInfo) return;
    const inv = downloadingInvoice;
    const run = async () => {
      toast({ title: 'A gerar PDF...', description: 'Por favor aguarde.' });
      await new Promise(r => setTimeout(r, 600));
      try {
        await generateHtmlPDF('hidden-history-invoice', \`Factura-\${inv.invoice_number}.pdf\`, (templateSettings?.paper_size || 'A4') as any);
      } catch (err) {
        console.error('PDF History error:', err);
      }
      setDownloadingInvoice(null);
    };
    run();
  }, [downloadingInvoice, agencyInfo, templateSettings]);
`;
    // Insert before handleServiceChange
    c = c.replace('const handleServiceChange =', effectCode + '\n  const handleServiceChange =');
}

// 3. Fix handleDownloadInvoice to use the state
c = c.replace(
    /const handleDownloadInvoice = \(invoice: Invoice\) => \{[\s\S]*?downloadInvoicePDF\(\{[\s\S]*?\}\);?\n  \};/,
    `const handleDownloadInvoice = (invoice: Invoice) => {
    setDownloadingInvoice(invoice);
  };`
);

// 4. Ensure generateHtmlPDF is imported
if (!c.includes("import { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';")) {
    c = c.replace(
        "import { downloadInvoicePDF, generateInvoicePDF } from '@/lib/invoice-pdf-generator';",
        "import { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';"
    );
}

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', c);
console.log('Final fix applied!');
