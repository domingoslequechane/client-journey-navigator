const fs = require('fs');
let c = fs.readFileSync('src/components/invoice-editor/PrintableInvoice.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Fix the broken services loop that uses [1, 2, 3].map but references 'service'
// This was likely a placeholder that didn't get fully replaced
const oldTableBody = `              <tbody>
                {[1, 2, 3].map((i) => (
                   <tr key={i} className="border-b border-gray-100">
                    {servicesSection.settings.showRowNumbers && (
                      <td className="py-0.5 text-[6px] text-gray-400">{i}.</td>
                    )}
                    <td className="py-0.5 text-[6px]">Serviço de exemplo {i}</td>
                    {servicesSection.settings.showQuantity && (
                      <td className="py-0.5 text-[6px] text-center">{service?.quantity || 1}</td>
                    )}
                    {servicesSection.settings.showUnitPrice && (
                      <td className="py-0.5 text-[6px] text-right">650 mt</td>
                    )}
                    <td className="py-0.5 text-[6px] text-right">650 mt</td>
                  </tr>
                ))}
              </tbody>`;

const newTableBody = `              <tbody>
                {(invoiceData?.services || []).length > 0 ? (invoiceData?.services || []).map((service, index) => (
                   <tr key={index} className="border-b border-gray-100">
                    {servicesSection.settings.showRowNumbers && (
                      <td className="py-0.5 text-[6px] text-gray-400">{index + 1}.</td>
                    )}
                    <td className="py-0.5 text-[6px]">{service.description}</td>
                    {servicesSection.settings.showQuantity && (
                      <td className="py-0.5 text-[6px] text-center">{service.quantity}</td>
                    )}
                    {servicesSection.settings.showUnitPrice && (
                      <td className="py-0.5 text-[6px] text-right">{service.unit_price.toLocaleString()} {invoiceData?.currency || 'MZN'}</td>
                    )}
                    <td className="py-0.5 text-[6px] text-right">{service.total.toLocaleString()} {invoiceData?.currency || 'MZN'}</td>
                  </tr>
                )) : [1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {servicesSection.settings.showRowNumbers && (
                      <td className="py-0.5 text-[6px] text-gray-400">{i}.</td>
                    )}
                    <td className="py-0.5 text-[6px]">Serviço de exemplo {i}</td>
                    {servicesSection.settings.showQuantity && (
                      <td className="py-0.5 text-[6px] text-center">1</td>
                    )}
                    {servicesSection.settings.showUnitPrice && (
                      <td className="py-0.5 text-[6px] text-right">0 {invoiceData?.currency || 'MZN'}</td>
                    )}
                    <td className="py-0.5 text-[6px] text-right">0 {invoiceData?.currency || 'MZN'}</td>
                  </tr>
                ))}
              </tbody>`;

if (c.includes('{[1, 2, 3].map((i) => (')) {
    // Find the tbody start and end to be safe
    const startIdx = c.indexOf('<tbody>');
    const endIdx = c.indexOf('</tbody>') + '</tbody>'.length;
    if (startIdx !== -1 && endIdx !== -1) {
        const result = c.substring(0, startIdx) + newTableBody + c.substring(endIdx);
        fs.writeFileSync('src/components/invoice-editor/PrintableInvoice.tsx', result);
        console.log('Fixed services table loop!');
    }
} else {
    console.log('Target not found in PrintableInvoice.tsx');
}
