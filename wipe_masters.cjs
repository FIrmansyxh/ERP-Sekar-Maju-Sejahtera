const fs = require('fs');

fs.writeFileSync('src/data/initialHargaData.ts', "import { TabelHarga } from '../types';\\nexport const INITIAL_HARGA_DATA: TabelHarga[] = [];");
fs.writeFileSync('src/data/initialHargaJualData.ts', "import { MasterHargaJual } from '../types';\\nexport const INITIAL_HARGA_JUAL_DATA: MasterHargaJual[] = [];");
fs.writeFileSync('src/data/initialMasterBarangData.ts', "import { MasterBarang } from '../types';\\nexport const INITIAL_MASTER_BARANG_DATA: MasterBarang[] = [];");
fs.writeFileSync('src/data/initialGudangData.ts', "import { Gudang } from '../types';\\nexport const INITIAL_GUDANG_DATA: Gudang[] = [];\\nexport const STANDARD_GUDANG_LOCATIONS: string[] = [];\\nexport const getGudangLocationOptions = (gudangList: Gudang[] = []) => gudangList.map(g => g.nama_gudang);");

