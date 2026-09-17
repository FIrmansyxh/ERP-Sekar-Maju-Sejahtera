import { Barang, PengirimanBarang, StatusPengiriman, TransaksiPembelian } from '../types';

/**
 * Aturan kunci hapus: bal yang sudah keluar lewat Surat Jalan (DO) tidak boleh
 * hilang dari catatan. Nota Pembelian yang memuat bal tersebut dan Surat Jalan
 * yang sudah dikirim tidak dapat dihapus. Pengiriman sample tidak dikunci.
 */

const STATUS_SURAT_JALAN_TERKIRIM: StatusPengiriman[] = ['dikirim', 'dalam_perjalanan', 'diterima', 'selesai'];

/** Surat Jalan yang balnya sudah dikirim tidak dapat dihapus. */
export const isSuratJalanTerkunci = (pengiriman: Pick<PengirimanBarang, 'status'>): boolean =>
  STATUS_SURAT_JALAN_TERKIRIM.includes(pengiriman.status);

export const pesanSuratJalanTerkunci = (pengiriman: Pick<PengirimanBarang, 'no_surat_jalan'>): string =>
  `Surat Jalan ${pengiriman.no_surat_jalan} tidak dapat dihapus karena bal sudah dikirim.`;

/** Id bal yang sudah dikirim: berstatus keluar atau tercatat di Surat Jalan. */
export const isBalTerkirim = (bal: Pick<Barang, 'barang_id' | 'status_stok'>, idBalDiSuratJalan?: Set<string>): boolean =>
  bal.status_stok === 'keluar' || Boolean(idBalDiSuratJalan?.has(bal.barang_id));

/** No Bal dari kupon ini yang sudah dikirim lewat Surat Jalan reguler. */
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
  `Kupon ${tx.no_kupon} tidak dapat dihapus karena ${noBalTerkirim.length} bal sudah dikirim lewat Surat Jalan (${noBalTerkirim.join(', ')}).`;
