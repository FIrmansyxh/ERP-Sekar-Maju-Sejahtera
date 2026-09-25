import { BatchPengirimanSample, PengirimanSample, StatusBatchSample } from '../types';

/**
 * Batch sample / Reclass berstatus Draft: bal dan harga jual masih bisa disesuaikan kapan saja. Setelah
 * difinalkan (status 'sample', siap pakai) barulah surat pengiriman sample boleh dicetak dan hasil sortir
 * pembeli diisi. Surat Jalan (DO) boleh dibuat langsung dari harga Reclass, termasuk dari Draft.
 * Reclass hanya penentuan harga ulang: status bal tidak pernah berubah, bal baru keluar dari gudang saat
 * masuk Surat Jalan. Satu bal hanya boleh ada di satu batch aktif supaya tidak tercatat ganda.
 */

type DenganStatus = Pick<BatchPengirimanSample, 'status'> | null | undefined;

export const isBatchDraft = (batch: DenganStatus): boolean => batch?.status === 'draft';

/** Alasan aksi yang butuh batch final ditolak, atau null bila batch sudah final. */
export function alasanBatchBelumFinal(
  batch: (DenganStatus & { kode_batch?: string }) | null | undefined,
  aksi: 'cetak' | 'evaluasi' | 'do' = 'cetak'
): string | null {
  if (!isBatchDraft(batch)) return null;
  const nama = batch?.kode_batch ? `Batch ${batch.kode_batch}` : 'Batch ini';
  const tujuan = aksi === 'cetak' ? 'surat pengiriman sample dicetak' : aksi === 'evaluasi' ? 'hasil sortir pembeli diisi' : 'Surat Jalan dibuat';
  return `${nama} masih berstatus Draft. Finalkan (tandai siap pakai) dulu sebelum ${tujuan}.`;
}

/**
 * Status batch yang dikirim ke server. Draft dikirim apa adanya; bila server belum mengenal Draft (menolaknya),
 * pengirim mengulang dengan 'sample' dan status Draft dijaga di sisi aplikasi (lihat statusSetelahSinkron).
 */
export const statusKeServer = (status: StatusBatchSample, serverTerimaDraft = true): StatusBatchSample =>
  status === 'draft' && !serverTerimaDraft ? 'sample' : status;

/** null = belum diketahui. Server versi baru menyimpan Draft; server lama menolaknya dan membalas 'sample'. */
let serverKenalDraft: boolean | null = null;
export const tandaiServerKenalDraft = (kenal: boolean | null): void => {
  serverKenalDraft = kenal;
};
export const apakahServerKenalDraft = (): boolean | null => serverKenalDraft;

/**
 * Status batch setelah digabung dengan data server. Server yang menyimpan Draft adalah acuan (batch yang
 * difinalkan di komputer lain harus terlihat final di sini). Hanya bila server sudah terbukti menolak Draft (server
 * lama, membalas 'sample'), Draft lokal dipertahankan selama server belum menunjukkan tahap yang lebih lanjut.
 * Perubahan status di perangkat ini yang belum terkirim dijaga terpisah oleh antrean (overlay).
 */
export function statusSetelahSinkron(lokal: StatusBatchSample | undefined, server: StatusBatchSample | undefined): StatusBatchSample {
  if (server === 'draft') return 'draft';
  if (lokal === 'draft' && serverKenalDraft === false && (!server || server === 'sample')) return 'draft';
  return server || lokal || 'sample';
}

/**
 * Baris sample per bal untuk laporan (Dashboard, Laporan Pengiriman), diturunkan dari batch sample yang tersimpan di
 * server. Batch Draft belum dikirim ke pembeli dan batch yang dibatalkan tidak dihitung.
 */
export function barisSampleDariBatch(batchList: BatchPengirimanSample[]): PengirimanSample[] {
  return batchList
    .filter((batch) => batch.status !== 'draft' && batch.status !== 'dibatalkan')
    .flatMap((batch) =>
      (batch.items || []).map((it) => ({
        sample_id: it.sample_item_id,
        batch_id: batch.batch_id,
        barang_id: it.barang_id,
        no_bal: it.no_bal,
        kode_grade: it.kode_grade,
        sumber: batch.sumber_gudang,
        tujuan: batch.tujuan_buyer,
        berat_sample_gram: it.berat_sample_gram || 0,
        berat_bal_kg: it.berat_bal_kg,
        berat_bruto_kg: it.berat_bruto_kg,
        potongan_tara_kg: it.potongan_tara_kg,
        harga_beli_kg: it.harga_beli_kg,
        harga_tawaran_kg: it.harga_tawaran_kg,
        harga_deal_kg: it.harga_deal_kg,
        tanggal_kirim: batch.tanggal_kirim,
        tanggal_respon: it.tanggal_evaluasi || batch.tanggal_respon,
        status: it.status_item,
        alasan_tolak: it.alasan_tolak,
        catatan_nego: it.catatan_nego,
        catatan: batch.catatan,
        dikirim_oleh: batch.dikirim_oleh,
        nama_petani: it.nama_petani,
        sudah_dikirim_do: it.sudah_dikirim_do,
        no_surat_jalan_do: it.no_surat_jalan_do,
        permintaan_buyer: batch.permintaan_buyer,
      }))
    );
}
