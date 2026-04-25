const fs = require('fs');
let c = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// 1. Update handleGeneratePreview to just show the live preview
c = c.replace(
    /const handleGeneratePreview = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\} finally \{[\s\S]*?setGeneratingPreview\(false\);?\n    \}/,
    `const handleGeneratePreview = async () => {
    setGeneratingPreview(true);
    // Simular um pequeno delay para feedback visual
    await new Promise(r => setTimeout(r, 400));
    setShowPreview(true);
    setGeneratingPreview(false);
  };`
);

// 2. Update handleGenerateInvoice to use the new HTML-to-PDF engine
c = c.replace(
    /\/\/ Generate and download PDF\n      downloadInvoicePDF\(\{[\s\S]*?\}\);/,
    `// Generate and download PDF using the new engine
      toast({ title: 'A gerar PDF...', description: 'Por favor aguarde.' });
      // Pequeno delay para garantir que o DOM oculto está pronto
      await new Promise(r => setTimeout(r, 600));
      await generateHtmlPDF('hidden-new-invoice', \`Factura-\${invoiceNumber}.pdf\`, (templateSettings?.paper_size || 'A4') as any);`
);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', c);
console.log('Handlers updated successfully!');
