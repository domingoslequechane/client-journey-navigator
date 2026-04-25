const fs = require('fs');
let content = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// Replace handleGeneratePreview entirely
const previewStart = content.indexOf('const handleGeneratePreview = () => {');
const previewEnd = content.indexOf('const generateInvoiceNumber = async () => {');

const newPreviewContent = `const currentInvoiceData = {
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

  const handleGeneratePreview = () => {
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
    setTimeout(() => {
      setShowPreview(true);
      setGeneratingPreview(false);
    }, 500);
  };

  `;

content = content.substring(0, previewStart) + newPreviewContent + content.substring(previewEnd);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', content);
console.log('Update success');
