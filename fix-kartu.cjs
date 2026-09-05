const fs = require('fs');

const lpv = 'src/components/laporan/LaporanPetaniView.tsx';
let lpvCode = fs.readFileSync(lpv, 'utf8');
lpvCode = lpvCode.replace(/'No Kartu',\n/g, '');
lpvCode = lpvCode.replace(/Nama \/ ID \/ No HP \/ Kartu/g, 'Nama / ID / No HP');
lpvCode = lpvCode.replace(/<span className="text-gray-400">• Kartu: \{p\.petani_id\}<\/span>/g, '');
fs.writeFileSync(lpv, lpvCode);
