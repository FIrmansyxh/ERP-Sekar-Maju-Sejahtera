const fs = require('fs');

const hargaBeliList = [];
const hargaJualList = [];
const today = new Date().toISOString().split('T')[0];

const colors = ['red', 'blue', 'emerald', 'amber', 'purple', 'indigo', 'rose', 'teal'];

for (let i = 50; i <= 99; i++) {
  const harga = i * 1000;
  const kode = String(i);
  
  // Tabel Harga Beli
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
  
  // Master Harga Jual
  hargaJualList.push({
    harga_jual_id: `HJ-${kode}`,
    kode: kode,
    harga_jual: harga,
    tanggal_berlaku: '2022-06-01',
    keterangan: `Harga Jual Grade ${kode}`,
    status_aktif: true
  });
}

const fileContentBeli = `import { TabelHarga } from '../types';\n\nexport const INITIAL_HARGA_DATA: TabelHarga[] = ${JSON.stringify(hargaBeliList, null, 2)};\n\nexport const GRADE_COLOR_MAP: Record<string, string> = {};\n`;
const fileContentJual = `import { MasterHargaJual } from '../types';\n\nexport const INITIAL_HARGA_JUAL_DATA: MasterHargaJual[] = ${JSON.stringify(hargaJualList, null, 2)};\n`;

fs.writeFileSync('src/data/initialHargaData.ts', fileContentBeli);
fs.writeFileSync('src/data/initialHargaJualData.ts', fileContentJual);

console.log('Successfully generated Harga Beli & Harga Jual data.');
