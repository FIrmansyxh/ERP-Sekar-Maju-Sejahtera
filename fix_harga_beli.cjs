const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = '{formatRupiah(barangList.find(b => b.barang_id === item.barangId)?.harga_beli || 0)}';
const replacementStr = '{formatRupiah(barangList.find(b => b.barang_id === item.barangId)?.harga_per_kg || 0)}';

code = code.replace(targetStr, replacementStr);

fs.writeFileSync(file, code);
console.log('Fixed harga beli mapping');
