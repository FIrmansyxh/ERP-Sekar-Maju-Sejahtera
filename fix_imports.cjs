const fs = require('fs');

const files = [
  'src/components/barang/MasterBarangManagement.tsx',
  'src/components/barang/BarangManagement.tsx',
  'src/components/transaksi/TransaksiFormModal.tsx',
  'src/components/transaksi/Proses1SortirModal.tsx',
  'src/components/transaksi/SortirPageView.tsx',
  'src/components/transaksi/Proses2TimbangModal.tsx',
  'src/components/transaksi/TransaksiEditModal.tsx',
  'src/components/pengiriman/PengirimanManagement.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('SearchableSelect') && !code.includes('import { SearchableSelect }')) {
    // Add import at the top
    code = `import { SearchableSelect } from '../common/SearchableSelect';\n` + code;
    fs.writeFileSync(file, code);
    console.log(`Added import to ${file}`);
  }
}
