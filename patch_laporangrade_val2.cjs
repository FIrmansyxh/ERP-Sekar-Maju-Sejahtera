const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `      // Active in Warehouse
      const inGudangBal = activeBal.filter((b) => b.kode_grade.toUpperCase() === g.code);
      const stokBal = inGudangBal.length;
      const stokKg = inGudangBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
      const persenStokBal = (stokBal / totalActiveBalCount) * 100;
      const persenStokKg = (stokKg / totalActiveBalKg) * 100;
      const valuasiRupiah = stokKg * g.price;`;

const newLogic = `      // Active in Warehouse
      const inGudangBal = activeBal.filter((b) => b.kode_grade.toUpperCase() === g.code);
      const stokBal = inGudangBal.length;
      const stokKg = inGudangBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
      const persenStokBal = (stokBal / totalActiveBalCount) * 100;
      const persenStokKg = (stokKg / totalActiveBalKg) * 100;
      
      // Calculate valuasi using actual buy price if available, fallback to grade price
      const valuasiRupiah = inGudangBal.reduce((sum, b) => sum + ((b.berat_kg || 0) * (b.harga_per_kg || g.price)), 0);`;

code = code.replace(targetLogic, newLogic);
fs.writeFileSync(file, code);
console.log('Fixed LaporanGrade valuasi math to match actual buy price');
