const fs = require('fs');

fs.writeFileSync('src/data/initialHargaData.ts', `import { TabelHarga } from '../types';
export const INITIAL_HARGA_DATA: TabelHarga[] = [];`);

fs.writeFileSync('src/data/initialHargaJualData.ts', `import { MasterHargaJual } from '../types';
export const INITIAL_HARGA_JUAL_DATA: MasterHargaJual[] = [];`);

fs.writeFileSync('src/data/initialMasterBarangData.ts', `import { MasterBarang } from '../types';
export const INITIAL_MASTER_BARANG_DATA: MasterBarang[] = [];`);

fs.writeFileSync('src/data/initialGudangData.ts', `import { Gudang } from '../types';
export const INITIAL_GUDANG_DATA: Gudang[] = [];
export const STANDARD_GUDANG_LOCATIONS: string[] = [];
export const getGudangLocationOptions = (gudangList: Gudang[] = []) => gudangList.map(g => g.nama_gudang);`);

console.log('Fixed syntax!');
