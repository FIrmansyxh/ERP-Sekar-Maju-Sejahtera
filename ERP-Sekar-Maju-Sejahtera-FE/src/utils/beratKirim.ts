import { Barang, PengirimanBarang, SampleItemDetail } from '../types';
import { normalizeKg } from './formatters';

/**
 * Pengiriman Sample dan Surat Jalan (DO) memakai berat BRUTO.
 * Berat netto hanya untuk pembelian (kasir, nota, valuasi) dan dokumentasi internal.
 */

/** Berat bruto bal hasil timbangan; data lama tanpa bruto memakai netto + tara yang tercatat. */
export function beratBrutoBal(
  bal?: Partial<Pick<Barang, 'berat_bruto_kg' | 'berat_kg' | 'potongan_tara_kg'>> | null
): number {
  if (!bal) return 0;
  if (bal.berat_bruto_kg && bal.berat_bruto_kg > 0) return bal.berat_bruto_kg;
  const netto = bal.berat_kg || 0;
  return netto > 0 ? normalizeKg(netto + (bal.potongan_tara_kg || 0)) : 0;
}

/** Berat bruto satu bal di batch sample. */
export function beratBrutoItemSample(
  item: Partial<Pick<SampleItemDetail, 'berat_bruto_kg' | 'berat_bal_kg' | 'potongan_tara_kg'>>
): number {
  if (item.berat_bruto_kg && item.berat_bruto_kg > 0) return item.berat_bruto_kg;
  const netto = item.berat_bal_kg || 0;
  return netto > 0 ? normalizeKg(netto + (item.potongan_tara_kg || 0)) : 0;
}

/** Bruto timbang ulang saat dikirim pada Surat Jalan: berat yang tersimpan di DO, atau bruto bal. */
export function beratKirimBal(
  pengiriman: Pick<PengirimanBarang, 'berat_kirim_map'>,
  barangId: string,
  bal?: Partial<Pick<Barang, 'berat_bruto_kg' | 'berat_kg' | 'potongan_tara_kg'>> | null
): number {
  return pengiriman.berat_kirim_map?.[barangId] ?? beratBrutoBal(bal);
}

/**
 * Netto jual satu bal pada Surat Jalan (bruto timbang ulang dikurangi potongan aturan netto pembeli).
 * DO lama tanpa aturan netto memakai bruto kirim, sehingga nilainya tidak berubah.
 */
export function nettoJualBal(
  pengiriman: Pick<PengirimanBarang, 'berat_kirim_map' | 'netto_jual_map'>,
  barangId: string,
  bal?: Partial<Pick<Barang, 'berat_bruto_kg' | 'berat_kg' | 'potongan_tara_kg'>> | null
): number {
  return pengiriman.netto_jual_map?.[barangId] ?? beratKirimBal(pengiriman, barangId, bal);
}

/** Nilai satu bal pada Surat Jalan: netto jual x harga jual per kg. */
export function nilaiBalDO(
  pengiriman: Pick<PengirimanBarang, 'berat_kirim_map' | 'netto_jual_map'>,
  barangId: string,
  bal: Partial<Pick<Barang, 'berat_bruto_kg' | 'berat_kg' | 'potongan_tara_kg'>> | null | undefined,
  hargaPerKg: number
): number {
  return Math.round(nettoJualBal(pengiriman, barangId, bal) * hargaPerKg);
}
