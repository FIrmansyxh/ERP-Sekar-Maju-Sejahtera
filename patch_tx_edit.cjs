const fs = require('fs');
const file = 'src/components/transaksi/TransaksiEditModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'total_harga_beli: totalHargaFinalBaru,',
  'total_harga_beli: totalKotorBaru,'
);

fs.writeFileSync(file, code);
