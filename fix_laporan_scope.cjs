const fs = require('fs');
let code = fs.readFileSync('src/components/laporan/LaporanGudangView.tsx', 'utf8');

code = code.replace(/const isActive = doId \? activePengirimanIds\.has\(doId\) : false;/g, "const isActive = false;");

fs.writeFileSync('src/components/laporan/LaporanGudangView.tsx', code);
