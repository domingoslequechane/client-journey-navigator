const fs = require('fs');
let content = fs.readFileSync('src/components/invoice-editor/PrintableInvoice.tsx', 'utf8');

// Fix the nested fallback
content = content.replace(/\{invoiceData\?\.client\?\.companyName \|\| \{invoiceData\?\.client\?\.companyName \|\| "Quadrado Mágico"\}\}/g, '{invoiceData?.client?.companyName || "Quadrado Mágico"}');

fs.writeFileSync('src/components/invoice-editor/PrintableInvoice.tsx', content);
console.log('Fixed nested object!');
