const fs = require('fs');
let c = fs.readFileSync('src/components/invoice-editor/PrintableInvoice.tsx', 'utf8').replace(/\r\n/g, '\n');

// Fix all broken string-wrapped JSX expressions - pattern: && "{ ... }"
// These got wrapped in double quotes by the earlier script
const broken = new RegExp(
  /\{clientSection\.settings\?\.showClientAddress && "\{invoiceData\?\.client\?\.address \|\| "Av\. de Moçambique, 123 • Maputo"\}"\}/g
);
c = c.replace(broken, '{clientSection.settings?.showClientAddress !== false && (invoiceData?.client?.address || "Av. de Moçambique, 123 • Maputo")}');

// Also scan for any other occurrences of the pattern: && "{ ... }"
// General fix: && "{someExpression}" -> && {someExpression}
c = c.replace(/&& "\{([^"]+)\}"/g, '&& {$1}');

fs.writeFileSync('src/components/invoice-editor/PrintableInvoice.tsx', c);
console.log('Fixed!');
