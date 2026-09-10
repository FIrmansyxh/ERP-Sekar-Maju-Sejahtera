const fs = require('fs');
let file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/p\.status !== 'diterima' && p\.status !== 'dikirim'/g, "p.status !== 'diterima' && p.status !== 'dikirim' && p.status !== 'selesai'");
fs.writeFileSync(file, code);
console.log('Patched LaporanGradeView!');
