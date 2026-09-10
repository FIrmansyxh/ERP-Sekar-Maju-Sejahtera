const fs = require('fs');

const hargaBeliList = [];
const hargaJualList = [];
const today = new Date().toISOString().split('T')[0];

const colors = ['red', 'blue', 'emerald', 'amber', 'purple', 'indigo', 'rose', 'teal'];

// Harga Beli: 50 - 70 (Rp 50.000 - Rp 70.000)
for (let i = 50; i <= 70; i++) {
  const harga = i * 1000;
  const kode = String(i);
  
  hargaBeliList.push({
    harga_id: `HB-${kode}`,
    kode_grade: kode,
    nama_grade: `Grade ${kode}`,
    warna_badge: colors[i % colors.length],
    harga_per_kg: harga,
    tanggal_berlaku: '2022-06-01',
    status: 'aktif',
    dibuat_oleh: 'System'
  });
}

// Harga Jual: 50 - 80 (Rp 50.000 - Rp 80.000)
for (let i = 50; i <= 80; i++) {
  const harga = i * 1000;
  const kode = String(i);
  
  hargaJualList.push({
    harga_jual_id: `HJ-${kode}`,
    kode: kode,
    harga_jual: harga,
    tanggal_berlaku: '2022-06-01',
    keterangan: `Harga Jual Grade ${kode}`,
    status_aktif: true
  });
}

// Generate the Color Map again based on the range (up to 80 for safety)
let codeStr = 'export const GRADE_COLOR_MAP: Record<string, string> = {\n';
for (let i = 50; i <= 80; i++) {
  codeStr += `  '${String(i)}': '${colors[i % colors.length]}',\n`;
}
const legacy = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
legacy.forEach((c, idx) => {
  codeStr += `  '${c}': '${colors[idx % colors.length]}',\n`;
});
codeStr += '};\n';

const fileContentBeli = `import { TabelHarga } from '../types';\n\nexport const INITIAL_HARGA_DATA: TabelHarga[] = ${JSON.stringify(hargaBeliList, null, 2)};\n\n${codeStr}\n`;
const fileContentJual = `import { MasterHargaJual } from '../types';\n\nexport const INITIAL_HARGA_JUAL_DATA: MasterHargaJual[] = ${JSON.stringify(hargaJualList, null, 2)};\n`;

fs.writeFileSync('src/data/initialHargaData.ts', fileContentBeli);
fs.writeFileSync('src/data/initialHargaJualData.ts', fileContentJual);

console.log('Successfully generated Updated Harga Beli & Harga Jual data.');
