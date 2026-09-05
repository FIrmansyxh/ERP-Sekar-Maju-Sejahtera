const fs = require('fs');
const lpv = 'src/components/laporan/LaporanPetaniView.tsx';
let lpvCode = fs.readFileSync(lpv, 'utf8');
lpvCode = lpvCode.replace(/      p\.nama_petani,\n      p\.petani_id,/g, '      p.nama_petani,');
fs.writeFileSync(lpv, lpvCode);
