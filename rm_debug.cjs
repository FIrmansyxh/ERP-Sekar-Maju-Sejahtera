const fs = require('fs');
let file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/console\.log\(\{ totalPenjualanRupiah, totalValuasiRupiah, totalPembelianRupiah, totalKeuntunganBersih \}\);\n/g, '');

fs.writeFileSync(file, code);
