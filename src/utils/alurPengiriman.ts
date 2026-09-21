import { Barang, BatchPengirimanSample, PengirimanBarang } from '../types';

/**
 * Perubahan data yang menyertai pembatalan atau edit Surat Jalan (DO).
 * Berupa fungsi murni agar aturan stok bal dan status batch sample dapat diuji tanpa layar.
 */

export const LABEL_STATUS_PENGIRIMAN: Record<string, string> = {
  dimuat: 'Dimuat',
  dikirim: 'Akan Dikirim',
  dalam_perjalanan: 'Sedang Dikirim',
  diterima: 'Tiba di Pabrik',
  selesai: 'Selesai',
};

/** Bal yang keluar dari Surat Jalan kembali ke gudang (hanya bal yang memang berstatus keluar). */
export function kembalikanBalKeGudang(barangList: Barang[], idBal: ReadonlySet<string>): Barang[] {
  return barangList.map((b) =>
    idBal.has(b.barang_id) && b.status_stok === 'keluar'
      ? { ...b, status_stok: 'di_gudang' as const, pengiriman_id: undefined }
      : b
  );
}

/** Bal yang masuk Surat Jalan menjadi keluar gudang dan mencatat Surat Jalan-nya. */
export function keluarkanBal(barangList: Barang[], idBal: ReadonlySet<string>, pengirimanId: string): Barang[] {
  return barangList.map((b) =>
    idBal.has(b.barang_id) ? { ...b, status_stok: 'keluar' as const, pengiriman_id: pengirimanId } : b
  );
}

/** Surat Jalan lain yang sudah memuat salah satu bal yang akan ditambahkan. */
export function cariSuratJalanBentrok(
  pengirimanList: PengirimanBarang[],
  pengirimanId: string,
  balDitambah: ReadonlySet<string>
): PengirimanBarang | undefined {
  return pengirimanList.find(
    (p) => p.pengiriman_id !== pengirimanId && (p.barang_ids || []).some((id) => balDitambah.has(id))
  );
}

/**
 * Menyesuaikan batch sample asal Surat Jalan setelah bal ditambah atau dikeluarkan:
 * tanda "sudah dikirim DO" mengikuti, batch tertutup (selesai) bila semua bal yang tidak ditolak sudah
 * punya DO, dan terbuka lagi (diproses) bila tidak lagi begitu.
 */
export function sesuaikanBatchSetelahPerubahanDO(
  batchList: BatchPengirimanSample[],
  rujukanBatch: string | undefined,
  balDitambah: ReadonlySet<string>,
  balDikeluarkan: ReadonlySet<string>
): { batchList: BatchPengirimanSample[]; batchTerkait?: BatchPengirimanSample } {
  if (!rujukanBatch || (balDitambah.size === 0 && balDikeluarkan.size === 0)) return { batchList };

  const batchBaru = batchList.map((batch) => {
    if (batch.batch_id !== rujukanBatch && batch.kode_batch !== rujukanBatch) return batch;
    const items = (batch.items || []).map((it) => {
      if (balDitambah.has(it.barang_id)) return { ...it, sudah_dikirim_do: true };
      if (balDikeluarkan.has(it.barang_id)) return { ...it, sudah_dikirim_do: false };
      return it;
    });
    const semuaTerkirim =
      items.length > 0 &&
      items.every((it) => it.sudah_dikirim_do || it.status_item === 'ditolak') &&
      items.some((it) => it.sudah_dikirim_do);
    return {
      ...batch,
      items,
      status: semuaTerkirim ? ('selesai' as const) : batch.status === 'selesai' ? ('diproses' as const) : batch.status,
    };
  });

  return {
    batchList: batchBaru,
    batchTerkait: batchBaru.find((b) => b.batch_id === rujukanBatch || b.kode_batch === rujukanBatch),
  };
}
