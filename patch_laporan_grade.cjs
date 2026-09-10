const fs = require('fs');

let file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix stokAktif filter in activePengirimanIds
code = code.replace(
  /pengirimanList\s*\.filter\(p => p\.status !== 'diterima' && p\.status !== 'dikirim'\)/g,
  "pengirimanList.filter(p => p.status !== 'diterima' && p.status !== 'selesai')"
);

// Fix valuasiRupiah
code = code.replace(
  /const valuasiRupiah = inGudangBal\.reduce\(\(sum, b\) => sum \+ \(\(b\.berat_kg \|\| 0\) \* \(b\.harga_per_kg \|\| g\.price\)\), 0\);/g,
  "const valuasiRupiah = inGudangBal.reduce((sum, b) => sum + (b.total_harga || ((b.berat_kg || 0) * (b.harga_per_kg || g.price))), 0);"
);

fs.writeFileSync(file, code);
console.log('Patched LaporanGradeView math!');
