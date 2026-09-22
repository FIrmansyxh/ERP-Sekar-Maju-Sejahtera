import { SampleItemDetail } from '../types';

/**
 * Isi Surat Pengiriman Sample untuk pembeli: harga jual hanya tampil sebagai KODE harga jual
 * (mis. HJ-45), tidak pernah nilai rupiahnya. Dipakai bersama oleh dokumen cetak dan unduhan Excel.
 */

/** Kode harga jual satu bal; strip bila belum dipilih. */
export function kodeHargaJualSample(item: Pick<SampleItemDetail, 'kode_harga_jual'>): string {
  const kode = (item.kode_harga_jual || '').trim();
  return kode && kode !== '-' ? kode : '-';
}

/** Kode bal milik pembeli, hanya bila berbeda dari No Bal gudang. */
export function kodeBalPembeliBerbeda(item: Pick<SampleItemDetail, 'no_bal' | 'kode_bal_pembeli'>): string {
  const kode = (item.kode_bal_pembeli || '').trim();
  return kode && kode.toUpperCase() !== (item.no_bal || '').trim().toUpperCase() ? kode : '';
}
