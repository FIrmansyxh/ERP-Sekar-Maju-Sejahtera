const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`    return {
      totalJualCount: filteredHargaJualList.length,
      totalStokBal,
      totalStokKg,
      totalValuasi,
      totalDoKg,
      dominantKode: dominant?.kode || '-',
      dominantPorsi: dominant ? dominant.persenStokBal : 0,
    };`,
`    return {
      totalJualCount: filteredHargaJualList.length,
      totalStokBal,
      totalStokKg,
      totalValuasi,
      totalDoKg,
      dominantKode: dominant,
    };`
);

fs.writeFileSync(file, code);
