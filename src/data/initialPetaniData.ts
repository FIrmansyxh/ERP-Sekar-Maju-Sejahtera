import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
const dataset = generateMaduraTobaccoDataset();
export const INITIAL_PETANI_DATA = dataset.petaniList;
