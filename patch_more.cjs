const fs = require('fs');

let file = 'src/components/laporan/LaporanPengirimanView.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/p\.status === 'diterima' \|\| p\.status === 'dikirim'/g, "p.status === 'diterima' || p.status === 'dikirim' || p.status === 'selesai'");
fs.writeFileSync(file, code);

file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/k\.status === 'diterima'/g, "k.status === 'diterima' || k.status === 'selesai'");
fs.writeFileSync(file, code);

console.log('Patched LaporanPengirimanView and StatusBatch summaries!');
