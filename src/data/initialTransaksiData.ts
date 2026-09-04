import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
import { TransaksiPembelian } from '../types';

const dataset = generateMaduraTobaccoDataset();

export const INITIAL_TRANSAKSI_DATA: TransaksiPembelian[] = dataset.transaksiList;
