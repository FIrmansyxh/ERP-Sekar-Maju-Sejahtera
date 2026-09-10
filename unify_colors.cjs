const fs = require('fs');
let file = 'src/components/pengiriman/PengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace standard blue tones with slate/zinc/gray where appropriate for a more unified theme
code = code.replace(/text-blue-600/g, 'text-[#b81d24]');
code = code.replace(/bg-blue-600/g, 'bg-[#b81d24]');
code = code.replace(/hover:bg-blue-700/g, 'hover:bg-red-800');
code = code.replace(/border-blue-500/g, 'border-[#b81d24]');
code = code.replace(/bg-blue-50/g, 'bg-red-50');
code = code.replace(/text-blue-900/g, 'text-red-900');
code = code.replace(/text-blue-950/g, 'text-red-950');

fs.writeFileSync(file, code);
console.log('Unified colors in PengirimanManagement.tsx');
