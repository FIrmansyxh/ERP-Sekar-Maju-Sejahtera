import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
import { PengirimanBarang } from '../types';

const dataset = generateMaduraTobaccoDataset();

export const INITIAL_PENGIRIMAN_DATA: PengirimanBarang[] = dataset.pengirimanList;
