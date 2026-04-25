const fs = require('fs');
let c = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

// Replace the entire inner preview div block using index-based slicing
const oldPreviewBlock = `                <div className="border rounded-lg overflow-hidden bg-muted/30 flex-1">
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
                </div>`;

const newPreviewBlock = `                <div className="border rounded-lg overflow-auto bg-gray-100 flex-1 p-2">
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
                </div>`;

// Normalize line endings for comparison
const normalizedC = c.replace(/\r\n/g, '\n');
const normalizedOld = oldPreviewBlock.replace(/\r\n/g, '\n');
const normalizedNew = newPreviewBlock.replace(/\r\n/g, '\n');

if (normalizedC.includes(normalizedOld)) {
  const result = normalizedC.replace(normalizedOld, normalizedNew);
  fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', result);
  console.log('Preview block replaced successfully!');
} else {
  console.log('Block NOT found, dumping snippet for debug...');
  const idx = normalizedC.indexOf('previewUrl ?');
  console.log(JSON.stringify(normalizedC.substring(idx - 100, idx + 400)));
}
