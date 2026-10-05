import { Barang, TransaksiPembelian } from '../types';

/**
 * Aturan tunggal status bayar kupon pembelian.
 *
 * Kupon dianggap lunas hanya setelah pembayaran diproses di Kasir. Kupon yang
 * status bayarnya kosong (baru disortir/ditimbang, atau data lama) dianggap
 * belum lunas alias kredit, dan belum boleh masuk nilai pembelian, aset,
 * maupun valuasi stok.
 */
/** Bagian kupon yang menentukan status bayar; longgar agar juga menerima ringkasan kupon di laporan. */
export interface DataStatusBayar {
  status_pembayaran?: string | null;
  metode_pembayaran?: string | null;
}

export const isTransaksiLunas = (tx?: DataStatusBayar | null): boolean =>
  tx?.status_pembayaran === 'lunas' || tx?.metode_pembayaran === 'cash';

/**
 * Kupon yang sudah dibayar di Kasir terkunci: bal tidak boleh ditambah, diubah, dihapus,
 * atau ditimbang ulang dari Sortir, Kasir, maupun Timbangan. Mengembalikan alasan penolakan,
 * atau null bila kupon masih boleh diubah.
 */
export function alasanKuponTerkunciBayar(tx?: (DataStatusBayar & { no_kupon: string }) | null): string | null {
  if (!tx || !isTransaksiLunas(tx)) return null;
  return `Kupon ${tx.no_kupon} sudah dibayar di Kasir sehingga tidak bisa diubah lagi.`;
}

export const labelStatusBayar =(tx?: DataStatusBayar | null): string => (isTransaksiLunas(tx) ? 'Lunas' : 'Belum Lunas');

/**
 * Kupon belum lunas yang balnya ada di Surat Jalan, beserta No Bal-nya. Surat Jalan boleh dimuat dan dikirim dengan bal
 * yang kuponnya belum dibayar, tetapi baru boleh Selesai setelah semuanya lunas (keputusan pemilik 2026-10-01; server
 * menolak dengan aturan yang sama). Bal tanpa kaitan kupon (data lama/manual) tidak menahan.
 */
export function kuponBelumLunasDiSuratJalan(
  barangIds: string[],
  barangList: Barang[],
  transaksiList: TransaksiPembelian[]
): { no_kupon: string; no_bal: string[] }[] {
  const txById = new Map<string, TransaksiPembelian>(transaksiList.map((tx) => [tx.transaksi_id, tx]));
  const hasil = new Map<string, { no_kupon: string; no_bal: string[] }>();
  for (const id of barangIds) {
    const bal = barangList.find((b) => b.barang_id === id);
    const tx = bal?.transaksi_pembelian_id ? txById.get(bal.transaksi_pembelian_id) : undefined;
    if (!bal || !tx || isTransaksiLunas(tx)) continue;
    const baris = hasil.get(tx.transaksi_id) || { no_kupon: tx.no_kupon || tx.transaksi_id, no_bal: [] };
    baris.no_bal.push(bal.no_bal || bal.barang_id);
    hasil.set(tx.transaksi_id, baris);
  }
  return [...hasil.values()];
}

/**
 * Bal yang boleh dihitung sebagai aset, nilai pembelian, dan valuasi: bal dari kupon
 * yang sudah lunas. Bal tanpa kaitan transaksi pembelian (data lama/manual) tetap dihitung.
 */
export function filterBarangLunas(barangList: Barang[], transaksiList: TransaksiPembelian[]): Barang[] {
  const txById = new Map<string, TransaksiPembelian>(transaksiList.map((tx) => [tx.transaksi_id, tx]));
  const lunasRefs = new Set<string>();
  transaksiList.forEach((tx) => {
    if (!isTransaksiLunas(tx)) return;
    (tx.items || []).forEach((it) => {
      if (it.barang_id) lunasRefs.add(it.barang_id);
    });
    (tx.barang_ids || []).forEach((id) => lunasRefs.add(id));
  });

  return barangList.filter((b) => {
    if (!b.transaksi_pembelian_id) return true;
    const tx = txById.get(b.transaksi_pembelian_id);
    return tx ? isTransaksiLunas(tx) : lunasRefs.has(b.barang_id);
  });
}
