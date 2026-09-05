const fs = require('fs');
const lpv = 'src/components/laporan/LaporanPetaniView.tsx';
let lpvCode = fs.readFileSync(lpv, 'utf8');
lpvCode = lpvCode.replace(/\{p\.petani_id && \(\s*\)\}/g, '');
fs.writeFileSync(lpv, lpvCode);
