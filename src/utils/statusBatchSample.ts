import { BatchPengirimanSample, StatusBatchSample } from '../types';

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
 * Backend hanya mengenal status batch yang lama. Draft dikirim sebagai 'sample' supaya tidak ditolak,
 * sedangkan status Draft yang sebenarnya dijaga di sisi aplikasi (lihat statusSetelahSinkron).
 */
export const statusKeServer = (status: StatusBatchSample): StatusBatchSample => (status === 'draft' ? 'sample' : status);

/**
 * Status batch setelah digabung dengan data server. Server tidak mengenal Draft dan membalas 'sample',
 * jadi Draft lokal dipertahankan selama server belum menunjukkan tahap yang lebih lanjut.
 */
export function statusSetelahSinkron(lokal: StatusBatchSample | undefined, server: StatusBatchSample | undefined): StatusBatchSample {
  if (lokal === 'draft' && (!server || server === 'sample' || server === 'draft')) return 'draft';
  return server || lokal || 'sample';
}
