const fs = require('fs');
let content = fs.readFileSync('src/components/invoice-editor/PrintableInvoice.tsx', 'utf8');

// Fix Services mapping
content = content.replace(
  /\{\[1, 2, 3\]\.map\(\(i\) => \([\s\S]*?\}\)/g,
  `{(invoiceData?.services || [{ description: "Serviço de exemplo", quantity: 1, unit_price: 650, total: 650 }]).map((service: any, i: number) => (
                   <tr key={i} className="border-b border-gray-100">
                    {servicesSection.settings.showRowNumbers && (
                      <td className="py-0.5 text-[6px] text-gray-400">{i + 1}.</td>
                    )}
                    <td className="py-0.5 text-[6px]">{service.description}</td>
                    {servicesSection.settings.showQuantity && (
                      <td className="py-0.5 text-[6px] text-center">{service.quantity}</td>
                    )}
                    {servicesSection.settings.showUnitPrice && (
                      <td className="py-0.5 text-[6px] text-right">{service.unit_price} {invoiceData?.currency || 'mt'}</td>
                    )}
                    <td className="py-0.5 text-[6px] text-right">{service.total} {invoiceData?.currency || 'mt'}</td>
                  </tr>
                ))}`
);

// Fix onix_hero totals
content = content.replace(
  /<span className="text-white font-black">4\.600 mt<\/span>/g,
  '<span className="text-white font-black">{invoiceData ? `${invoiceData.subtotal} ${invoiceData.currency}` : "4.600 mt"}</span>'
);
content = content.replace(
  /<span className="text-white font-black">736 mt<\/span>/g,
  '<span className="text-white font-black">{invoiceData ? `${invoiceData.taxAmount} ${invoiceData.currency}` : "736 mt"}</span>'
);

// Fix default totals (sub-total)
content = content.replace(
  /<span className="w-12">4\.600 mt<\/span>/g,
  '<span className="w-12">{invoiceData ? `${invoiceData.subtotal.toLocaleString()} ${invoiceData.currency}` : "4.600 mt"}</span>'
);
// Fix default totals (tax)
content = content.replace(
  /<span className="text-gray-500">IVA 16%:</g,
  '<span className="text-gray-500">IVA {invoiceData?.taxPercentage || 16}%:'
);
content = content.replace(
  /<span className="w-12">736 mt<\/span>/g,
  '<span className="w-12">{invoiceData ? `${invoiceData.taxAmount.toLocaleString()} ${invoiceData.currency}` : "736 mt"}</span>'
);

// Fix notes content
content = content.replace(
  /Esta é uma factura enviada ao cliente informando os preços antes da venda\./g,
  "{invoiceData?.notes || 'Esta é uma factura enviada ao cliente informando os preços antes da venda.'}"
);

// Ensure invoiceData.currency is properly displayed in notes if it has prices? Notes usually don't have prices.

fs.writeFileSync('src/components/invoice-editor/PrintableInvoice.tsx', content);
console.log('Fixed services and totals!');
