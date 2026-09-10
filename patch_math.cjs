const fs = require('fs');

let file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix stokAktifGudang filter
code = code.replace(
  /pengirimanList\s*\.filter\(p => p\.status !== 'diterima' && p\.status !== 'dikirim'\)/g,
  "pengirimanList.filter(p => p.status !== 'diterima' && p.status !== 'selesai')"
);

// Fix Valuasi Calculation (use total_harga for exact modal match)
code = code.replace(
  /const price = b\.harga_per_kg \|\| getPriceByGrade\(b\.kode_grade\);\s*return sum \+ \(\(b\.berat_kg \|\| 0\) \* price\);/g,
  "const cost = b.total_harga || ((b.berat_kg || 0) * (b.harga_per_kg || getPriceByGrade(b.kode_grade))); return sum + cost;"
);

// Fix profitStats doHargaBeli (use total_harga for exact modal match)
code = code.replace(
  /const hargaBeli = bal\.harga_per_kg \|\| getPriceByGrade\(bal\.kode_grade\);\s*const berat = bal\.berat_kg \|\| 0;\s*doHargaBeli \+= hargaBeli \* berat;/g,
  "doHargaBeli += bal.total_harga || ((bal.harga_per_kg || getPriceByGrade(bal.kode_grade)) * (bal.berat_kg || 0));"
);

fs.writeFileSync(file, code);
console.log('Patched Dashboard math!');
