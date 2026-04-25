const fs = require('fs');
let c = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Force replace handleGeneratePreview
const newPreviewHandler = `  const handleGeneratePreview = async () => {
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
      // Simular um pequeno delay para feedback visual
      await new Promise(r => setTimeout(r, 400));
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar a pré-visualização', variant: 'destructive' });
    } finally {
      setGeneratingPreview(false);
    }
  };`;

// Find the start and end of handleGeneratePreview
const startIdx = c.indexOf('const handleGeneratePreview =');
let endIdx = -1;
if (startIdx !== -1) {
    // Find the closing bracket of the function
    let bracketCount = 0;
    let foundStart = false;
    for (let i = startIdx; i < c.length; i++) {
        if (c[i] === '{') {
            bracketCount++;
            foundStart = true;
        } else if (c[i] === '}') {
            bracketCount--;
        }
        if (foundStart && bracketCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    c = c.substring(0, startIdx) + newPreviewHandler + c.substring(endIdx);
    console.log('handleGeneratePreview replaced!');
}

// 2. Force replace handleGenerateInvoice
const startInvIdx = c.indexOf('const handleGenerateInvoice = async () => {');
let endInvIdx = -1;
if (startInvIdx !== -1) {
    let bracketCount = 0;
    let foundStart = false;
    for (let i = startInvIdx; i < c.length; i++) {
        if (c[i] === '{') {
            bracketCount++;
            foundStart = true;
        } else if (c[i] === '}') {
            bracketCount--;
        }
        if (foundStart && bracketCount === 0) {
            endInvIdx = i + 1;
            break;
        }
    }
}

if (startInvIdx !== -1 && endInvIdx !== -1) {
    let body = c.substring(startInvIdx, endInvIdx);
    // Replace the old download logic inside the body
    body = body.replace(
        /downloadInvoicePDF\(\{[\s\S]*?\}\);/,
        `// Generate and download PDF using the new engine
      toast({ title: 'A gerar PDF...', description: 'Por favor aguarde.' });
      // Pequeno delay para garantir que o DOM oculto está pronto
      await new Promise(r => setTimeout(r, 800));
      try {
        await generateHtmlPDF('hidden-new-invoice', \`Factura-\${invoiceNumber}.pdf\`, (templateSettings?.paper_size || 'A4') as any);
      } catch (pdfErr) {
        console.error('PDF Generation error:', pdfErr);
        toast({ title: 'Erro no PDF', description: 'Ocorreu um erro ao gerar o arquivo PDF', variant: 'destructive' });
      }`
    );
    c = c.substring(0, startInvIdx) + body + c.substring(endInvIdx);
    console.log('handleGenerateInvoice updated!');
}

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', c);
console.log('Final Handlers Patch Applied!');
