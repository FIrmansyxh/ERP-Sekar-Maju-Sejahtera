import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
import { PengirimanSample, BatchPengirimanSample } from '../types';

const dataset = generateMaduraTobaccoDataset();

export const INITIAL_SAMPLE_DATA: PengirimanSample[] = dataset.sampleList;
export const INITIAL_BATCH_SAMPLE_DATA: BatchPengirimanSample[] = dataset.batchSampleList;
