const fs = require('fs');
let file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/text-blue-600/g, 'text-[#b81d24]');
code = code.replace(/bg-blue-600/g, 'bg-[#b81d24]');
code = code.replace(/hover:bg-blue-700/g, 'hover:bg-red-800');
code = code.replace(/border-blue-600/g, 'border-[#b81d24]');
code = code.replace(/ring-blue-600/g, 'ring-[#b81d24]');
code = code.replace(/bg-blue-50/g, 'bg-red-50');
code = code.replace(/border-blue-500/g, 'border-red-500');
code = code.replace(/border-blue-200/g, 'border-red-200');
code = code.replace(/text-blue-900/g, 'text-red-900');
code = code.replace(/text-blue-950/g, 'text-red-950');
code = code.replace(/text-blue-100/g, 'text-red-100');
code = code.replace(/text-blue-800/g, 'text-red-800');
code = code.replace(/text-blue-200/g, 'text-red-200');
code = code.replace(/text-blue-700/g, 'text-red-700');
code = code.replace(/hover:bg-blue-100/g, 'hover:bg-red-100');
code = code.replace(/bg-blue-100/g, 'bg-red-100');

fs.writeFileSync(file, code);
console.log('Unified colors in StatusBatchPengirimanManagement.tsx');
