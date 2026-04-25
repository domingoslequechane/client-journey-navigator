const fs = require('fs');
let content = fs.readFileSync('src/components/clients/ServiceInvoiceModal.tsx', 'utf8');

content = content.replace(
  /variant="ghost"\s*size="icon"\s*className="h-8 w-8 text-destructive"/g,
  'variant="destructive"\n                      size="icon"\n                      className="h-8 w-8 shrink-0"'
);

fs.writeFileSync('src/components/clients/ServiceInvoiceModal.tsx', content);
console.log('Delete button updated');
