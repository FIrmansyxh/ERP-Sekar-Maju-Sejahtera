const fs = require('fs');
let file = 'src/components/pengiriman/SuratJalanPrintModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<div>\s*<span className="text-gray-500 text-\[10px\] block">No\. Kontrak \/ PO:<\/span>\s*<span className="font-mono font-bold text-gray-800">\{pengiriman\.nomor_kontrak \|\| '-'\.toString\(\)\}<\/span>\s*<\/div>/g;

// Fallback regex if the one above misses
const fallbackRegex = /<div>\s*<span className="text-gray-500 text-\[10px\] block">No\. Kontrak \/ PO:<\/span>\s*<span className="font-mono font-bold text-gray-800">\{pengiriman\.nomor_kontrak \|\| '-'\}.*?<\/div>/s;

code = code.replace(fallbackRegex, "");

fs.writeFileSync(file, code);
console.log('Patched SuratJalanPrintModal.tsx');
