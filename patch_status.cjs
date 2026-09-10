const fs = require('fs');

// 1. types
let file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/export type StatusPengiriman = 'dimuat' \| 'dalam_perjalanan' \| 'diterima' \| 'dikirim';/g, "export type StatusPengiriman = 'dimuat' | 'dalam_perjalanan' | 'diterima' | 'dikirim' | 'selesai';");
fs.writeFileSync(file, code);

// 2. DashboardAnalyticView
file = 'src/components/laporan/DashboardAnalyticView.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/p\.status === 'diterima' \|\| p\.status === 'dikirim'/g, "p.status === 'diterima' || p.status === 'dikirim' || p.status === 'selesai'");
code = code.replace(/pengiriman\.status !== 'diterima' && pengiriman\.status !== 'dikirim'/g, "pengiriman.status !== 'diterima' && pengiriman.status !== 'dikirim' && pengiriman.status !== 'selesai'");
fs.writeFileSync(file, code);

// 3. StatusBatchPengirimanManagement
file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/const isSudah = item\.status === 'diterima';/g, "const isSudah = item.status === 'diterima' || item.status === 'selesai';");
fs.writeFileSync(file, code);

console.log('Patched types, dashboard, and status batch!');
