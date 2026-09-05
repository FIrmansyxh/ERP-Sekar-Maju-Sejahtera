import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
const dataset = generateMaduraTobaccoDataset();
export const INITIAL_HARGA_JUAL_DATA = dataset.hargaJualList;
