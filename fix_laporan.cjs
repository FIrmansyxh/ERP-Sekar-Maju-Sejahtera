const fs = require('fs');
let laporanGudang = fs.readFileSync('src/components/laporan/LaporanGudangView.tsx', 'utf8');
laporanGudang = laporanGudang.replace(/new Set\(\)/g, '[]');
fs.writeFileSync('src/components/laporan/LaporanGudangView.tsx', laporanGudang);
