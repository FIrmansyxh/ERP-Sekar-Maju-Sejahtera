const fs = require('fs');
let file = 'src/components/pengiriman/SuratJalanPrintModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove the Keterangan header
code = code.replace(/<th className="p-2 border border-gray-300">Keterangan<\/th>/, '');

// Remove the Keterangan body cell
const keteranganBodyCell = /<td className="p-1\.5 border border-gray-300 text-gray-600 text-\[11px\] truncate max-w-\[130px\]">\s*\{b\.keterangan\}\s*<\/td>/;
code = code.replace(keteranganBodyCell, '');

// Remove the Keterangan footer cell and move the text into the TOTAL MUATAN text
const footerCell = /<td className="p-2 border border-gray-300 font-mono text-\[10\.5px\] text-gray-700">\s*\{totalItemsCount\} Bal \(\{\(grandTotalBerat \/ 1000\)\.toFixed\(2\)\} Ton\)\s*<\/td>/;
code = code.replace(footerCell, '');

// Update the TOTAL MUATAN text to include the bal count
const totalMuatanRegex = /TOTAL MUATAN:/;
code = code.replace(totalMuatanRegex, 'TOTAL {totalItemsCount} BAL:');

fs.writeFileSync(file, code);
console.log('Patched SuratJalanPrintModal.tsx');
