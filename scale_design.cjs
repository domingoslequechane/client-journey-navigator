const fs = require('fs');
let c = fs.readFileSync('src/components/invoice-editor/PrintableInvoice.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Scale up font sizes
const replacements = [
  { from: 'text-[5px]', to: 'text-[9px]' },
  { from: 'text-[6px]', to: 'text-[10px]' },
  { from: 'text-[7px]', to: 'text-[11px]' },
  { from: 'text-[8px]', to: 'text-[12px]' },
  { from: 'text-[9px]', to: 'text-[13px]' },
  { from: 'text-[10px]', to: 'text-[14px]' },
  { from: 'text-[11px]', to: 'text-[15px]' },
  { from: 'text-[12px]', to: 'text-[16px]' },
  { from: 'text-[20px]', to: 'text-[24px]' },
];

replacements.forEach(r => {
  const escaped = r.from.replace('[', '\\[').replace(']', '\\]');
  c = c.replace(new RegExp(escaped, 'g'), r.to);
});

// 2. Adjust some paddings and gaps that might be too tight for larger fonts
c = c.replace(/gap-1/g, 'gap-1.5');
c = c.replace(/gap-2/g, 'gap-3');
c = c.replace(/p-4/g, 'p-6');
c = c.replace(/px-6/g, 'px-8');
c = c.replace(/py-3/g, 'py-4');
c = c.replace(/mb-1/g, 'mb-2');
c = c.replace(/mb-2/g, 'mb-4');

// 3. Logo scaling (if using 0.4 scale, bump to 0.6)
c = c.replace(/\* 0\.4/g, '* 0.6');
c = c.replace(/\* 0\.3/g, '* 0.5');

fs.writeFileSync('src/components/invoice-editor/PrintableInvoice.tsx', c);
console.log('Design elements scaled up successfully!');
