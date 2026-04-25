const fs = require('fs');
let content = fs.readFileSync('src/components/invoice-editor/PrintableInvoice.tsx', 'utf8');

// Rename component
content = content.replace(/export function InvoicePreview\(/g, 'export function PrintableInvoice(');

// Add import
content = content.replace(/interface InvoicePreviewProps \{/g, `import { InvoiceData } from '@/lib/invoice-pdf-generator';\n\nexport interface InvoicePreviewProps {\n  invoiceData?: InvoiceData;`);

// Add prop
content = content.replace(/fontFamily = 'Inter'/g, "fontFamily = 'Inter',\n  invoiceData");

// Replace mock data
content = content.replace(/>Quadrado Mágico</g, ">{invoiceData?.client?.companyName || \"Quadrado Mágico\"}<");
content = content.replace(/"Quadrado Mágico"/g, "{invoiceData?.client?.companyName || \"Quadrado Mágico\"}");

content = content.replace(/25-0043/g, "{invoiceData?.invoiceNumber || \"25-0043\"}");

content = content.replace(/401 223 334/g, "{invoiceData?.client?.nuit || \"401 223 334\"}");
content = content.replace(/vendas@quadrado\.africa/g, "{invoiceData?.client?.email || \"vendas@quadrado.africa\"}");
content = content.replace(/Av\. de Moçambique, 123 • Maputo/g, "{invoiceData?.client?.address || \"Av. de Moçambique, 123 • Maputo\"}");

// Dates
content = content.replace(/22 SET 25|25 MAR 25|25 SET 2025|25 MAR 2025|25 Mar 2025|25 SET 25/g, "{invoiceData?.issueDate ? new Date(invoiceData.issueDate).toLocaleDateString('pt-MZ') : \"25 MAR 2025\"}");
content = content.replace(/06 OUT 25|08 ABR 25|05 OUT 25/g, "{invoiceData?.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString('pt-MZ') : \"08 ABR 2025\"}");

// Totals
content = content.replace(/5\.336 mt/g, "{invoiceData ? `${invoiceData.total.toLocaleString()} ${invoiceData.currency}` : \"5.336 mt\"}");

// Services Map
content = content.replace(/\[1, 2, 3\]\.map\(\(\\_, i\) => \(/g, "(invoiceData?.services || [1, 2, 3]).map((service: any, i: number) => (");
content = content.replace(/\[1, 2, 3\]\.map\(\(_, i\) => \(/g, "(invoiceData?.services || [1, 2, 3]).map((service: any, i: number) => (");

// Replace specific service fields inside the map
content = content.replace(/>Consultoria de Marketing Digital</g, ">{service?.description || \"Consultoria de Marketing Digital\"}<");
content = content.replace(/>1</g, ">{service?.quantity || 1}<");
content = content.replace(/>1\.778 mt</g, ">{service ? `${service.unit_price} ${invoiceData?.currency || 'mt'}` : \"1.778 mt\"}<");
content = content.replace(/>5\.334 mt</g, ">{service ? `${service.total} ${invoiceData?.currency || 'mt'}` : \"5.334 mt\"}<");

// Subtotal & IVA
content = content.replace(/>5\.334 mt</g, ">{invoiceData ? `${invoiceData.subtotal} ${invoiceData.currency}` : \"5.334 mt\"}<");
content = content.replace(/>1\.122 mt</g, ">{invoiceData ? `${invoiceData.taxAmount} ${invoiceData.currency}` : \"1.122 mt\"}<");
content = content.replace(/\(16%\)/g, "({invoiceData?.taxPercentage || 16}%)");


// Mock Agency
content = content.replace(/agency\?\.name \|\| "QUALIFY"/g, "invoiceData?.agency?.name || agency?.name || \"QUALIFY\"");
content = content.replace(/agency\?\.nuit \|\| "400123987"/g, "invoiceData?.agency?.nuit || agency?.nuit || \"400123987\"");
content = content.replace(/agency\?\.address \|\| "Av\. 25 de Setembro, 147 - Maputo"/g, "invoiceData?.agency?.address || agency?.address || \"Av. 25 de Setembro, 147 - Maputo\"");
content = content.replace(/agency\?\.phone \|\| "\+258 84 000 0000"/g, "invoiceData?.agency?.phone || agency?.phone || \"+258 84 000 0000\"");
content = content.replace(/agency\?\.email \|\| "info@qualify\.mz"/g, "invoiceData?.agency?.email || agency?.email || \"info@qualify.mz\"");

fs.writeFileSync('src/components/invoice-editor/PrintableInvoice.tsx', content);
console.log('Script done!');
