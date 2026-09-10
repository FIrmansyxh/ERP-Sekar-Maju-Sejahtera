const fs = require('fs');
// We need to inject a console log inside the dashboard to see exactly what values it's getting
let file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const totalKeuntunganBersih = totalPenjualanRupiah \+ totalValuasiRupiah - totalPembelianRupiah;/g, `const totalKeuntunganBersih = totalPenjualanRupiah + totalValuasiRupiah - totalPembelianRupiah;
  console.log({ totalPenjualanRupiah, totalValuasiRupiah, totalPembelianRupiah, totalKeuntunganBersih });`);

fs.writeFileSync(file, code);
