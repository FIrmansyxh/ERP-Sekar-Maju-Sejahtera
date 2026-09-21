import { Barang, PengirimanBarang, StatusPengiriman, TransaksiPembelian } from '../types';

/**
 * Aturan kunci hapus: Surat Jalan (DO) boleh dibatalkan/dihapus selama statusnya belum
 * Selesai; bal di dalamnya kembali ke gudang. Setelah Selesai, Surat Jalan dikunci karena
 * nilai penjualannya sudah masuk ke laporan. Selama bal masih tercatat di Surat Jalan,
 * Nota Pembelian yang memuat bal tersebut tidak dapat dihapus. Pengiriman sample tidak dikunci.
 */

const STATUS_SURAT_JALAN_TERKUNCI: StatusPengiriman[] = ['selesai'];

/** Status yang membuat nilai Surat Jalan dihitung sebagai penjualan. */
export const STATUS_PENJUALAN_MASUK: StatusPengiriman[] = ['selesai'];

/** Surat Jalan yang sudah Selesai tidak dapat dihapus atau diubah statusnya lagi. */
export const isSuratJalanTerkunci = (pengiriman: Pick<PengirimanBarang, 'status'>): boolean =>
  STATUS_SURAT_JALAN_TERKUNCI.includes(pengiriman.status);

/** Nilai Surat Jalan baru dihitung sebagai penjualan setelah statusnya Selesai. */
export const isPenjualanMasuk = (pengiriman: Pick<PengirimanBarang, 'status'>): boolean =>
  STATUS_PENJUALAN_MASUK.includes(pengiriman.status);

export const pesanSuratJalanTerkunci = (pengiriman: Pick<PengirimanBarang, 'no_surat_jalan'>): string =>
  `Surat Jalan ${pengiriman.no_surat_jalan} sudah berstatus Selesai sehingga tidak dapat dihapus.`;

/** Id bal yang sudah dikirim: berstatus keluar atau tercatat di Surat Jalan. */
export const isBalTerkirim = (bal: Pick<Barang, 'barang_id' | 'status_stok'>, idBalDiSuratJalan?: Set<string>): boolean =>
  bal.status_stok === 'keluar' || Boolean(idBalDiSuratJalan?.has(bal.barang_id));

/** No Bal dari kupon ini yang sudah masuk Surat Jalan reguler. */
export function balTerkirimDariTransaksi(
  tx: TransaksiPembelian,
  barangList: Barang[],
  pengirimanList: PengirimanBarang[] = []
): string[] {
  const idItem = new Set((tx.items || []).map((it) => it.barang_id).filter(Boolean) as string[]);
  const idBalDiSuratJalan = new Set(pengirimanList.flatMap((p) => p.barang_ids || []));
  return barangList
    .filter((b) => b.transaksi_pembelian_id === tx.transaksi_id || idItem.has(b.barang_id))
    .filter((b) => isBalTerkirim(b, idBalDiSuratJalan))
    .map((b) => b.no_bal || b.barang_id);
}

export const pesanTransaksiTerkunci = (tx: Pick<TransaksiPembelian, 'no_kupon'>, noBalTerkirim: string[]): string =>
  `Kupon ${tx.no_kupon} tidak dapat dihapus karena ${noBalTerkirim.length} bal sudah masuk Surat Jalan (${noBalTerkirim.join(', ')}). Batalkan Surat Jalannya dulu bila belum Selesai.`;
