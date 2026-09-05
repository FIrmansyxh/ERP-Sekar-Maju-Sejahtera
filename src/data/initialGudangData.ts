import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
const dataset = generateMaduraTobaccoDataset();
export const INITIAL_GUDANG_DATA = dataset.gudangList;

export const STANDARD_GUDANG_LOCATIONS = [
  'Gudang Pusat Induk & Intake Pamekasan',
  'Gudang Intake Timur Pamekasan',
  'Gudang Penyangga Sumenep',
  'Gudang Distribusi Surabaya'
];
export const getGudangLocationOptions = (gudangList: any[] = []) => gudangList.map(g => g.nama_gudang).length > 0 ? gudangList.map(g => g.nama_gudang) : STANDARD_GUDANG_LOCATIONS;
