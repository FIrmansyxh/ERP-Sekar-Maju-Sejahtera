const fs = require('fs');

// 1. DashboardAnalyticView
let file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

// fix completedPengiriman
code = code.replace(/p\.status === 'diterima' \|\| p\.status === 'dikirim' \|\| p\.status === 'selesai'/g, "p.status === 'diterima' || p.status === 'selesai'");

// fix activePengirimanIds (totalValuasiRupiah & stokAktifGudang)
code = code.replace(/p\.status !== 'diterima' && p\.status !== 'dikirim' && p\.status !== 'selesai'/g, "p.status !== 'diterima' && p.status !== 'selesai'");

// fix profitStats condition
code = code.replace(/pengiriman\.status !== 'diterima' && pengiriman\.status !== 'dikirim' && pengiriman\.status !== 'selesai'/g, "pengiriman.status !== 'diterima' && pengiriman.status !== 'selesai'");

fs.writeFileSync(file, code);

// 2. LaporanPengirimanView
file = 'src/components/laporan/LaporanPengirimanView.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/p\.status === 'diterima' \|\| p\.status === 'dikirim' \|\| p\.status === 'selesai'/g, "p.status === 'diterima' || p.status === 'selesai'");
fs.writeFileSync(file, code);

// 3. LaporanGradeView
file = 'src/components/laporan/LaporanGradeView.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/p\.status !== 'diterima' && p\.status !== 'dikirim' && p\.status !== 'selesai'/g, "p.status !== 'diterima' && p.status !== 'selesai'");
fs.writeFileSync(file, code);

console.log('Fixed logical discrepancy of dikirim vs diterima/selesai');
