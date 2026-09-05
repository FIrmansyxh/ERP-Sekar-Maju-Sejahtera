import { generateMaduraTobaccoDataset } from './maduraDatasetGenerator';
const dataset = generateMaduraTobaccoDataset();
export const INITIAL_HARGA_DATA = dataset.hargaBeliList;
export const GRADE_COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string; hex: string; label?: string }> = {
  'A': { bg: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950', badge: 'bg-zinc-900 text-white border border-zinc-950', hex: '#18181b', label: 'Super' },
  'B': { bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-700', badge: 'bg-zinc-800 text-zinc-100 border border-zinc-700', hex: '#27272a', label: 'Premium' },
  'C': { bg: 'bg-zinc-200', text: 'text-zinc-900', border: 'border-zinc-300', badge: 'bg-zinc-200 text-zinc-900 border border-zinc-300', hex: '#e4e4e7', label: 'Standar' },
  'D': { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300', badge: 'bg-zinc-100 text-zinc-700 border border-zinc-300', hex: '#f4f4f5', label: 'Medium' },
  'E': { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', badge: 'bg-zinc-50 text-zinc-600 border border-zinc-200', hex: '#fafafa', label: 'Ekonomis' },
  'F': { bg: 'bg-white', text: 'text-zinc-500', border: 'border-zinc-200', badge: 'bg-white text-zinc-500 border border-zinc-200', hex: '#ffffff', label: 'Campuran' },
};
export function hitungSimulasiHarga(hargaPerKg: number, beratTerukurKg: number = 45, jenisTimbang: 'bruto' | 'netto' = 'bruto', isGantiTikar: boolean = false) {
  let potonganTaraKg = 0;
  if (jenisTimbang === 'bruto') {
    potonganTaraKg = 2;
  }
  const beratNettoFinalKg = Math.max(0, beratTerukurKg - potonganTaraKg);
  const totalPotongan = 10000;
  const totalHargaBeli = Math.round(beratNettoFinalKg * hargaPerKg);
  const hargaFinal = Math.max(0, totalHargaBeli - totalPotongan);
  return { jenisTimbang, beratTerukurKg, potonganTaraKg, beratNettoFinalKg, hargaPerKg, totalHargaBeli, totalKotor: totalHargaBeli, potonganBal: 10000, totalPotongan, hargaFinal };
}
