import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
import { Barang } from '../types';

const dataset = generateMaduraTobaccoDataset();

export const INITIAL_BARANG_DATA: Barang[] = dataset.barangList;
