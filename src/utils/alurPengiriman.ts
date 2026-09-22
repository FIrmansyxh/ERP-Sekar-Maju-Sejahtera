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

/**
 * Bal yang dikeluarkan dari muatan Surat Jalan (dibatalkan, atau dikeluarkan lewat edit) tidak lagi
 * menunjuk Surat Jalan itu. Status stok hanya ikut dibalik ke "di_gudang" bila kebetulan sudah
 * "keluar" (data lama, atau Surat Jalan yang dibatalkan setelah sempat Selesai); bal yang belum
 * pernah "keluar" (Surat Jalan belum Selesai) memang sudah "di_gudang" sejak awal.
 */
export function kembalikanBalKeGudang(barangList: Barang[], idBal: ReadonlySet<string>): Barang[] {
  return barangList.map((b) => {
    if (!idBal.has(b.barang_id)) return b;
    return {
      ...b,
      status_stok: b.status_stok === 'keluar' ? ('di_gudang' as const) : b.status_stok,
      pengiriman_id: undefined,
    };
  });
}

/** Bal dicatat masuk muatan Surat Jalan. Status stok TIDAK berubah di sini: bal baru benar-benar
 * "keluar" gudang saat Surat Jalan ini berstatus Selesai (lihat `keluarkanBal`). */
export function masukkanBalKeMuatan(barangList: Barang[], idBal: ReadonlySet<string>, pengirimanId: string): Barang[] {
  return barangList.map((b) => (idBal.has(b.barang_id) ? { ...b, pengiriman_id: pengirimanId } : b));
}

/** Bal benar-benar keluar gudang: dipanggil saat Surat Jalan yang memuatnya berstatus Selesai. */
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
