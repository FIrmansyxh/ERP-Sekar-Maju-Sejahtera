import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from './apiClient';
import { ErpApiService } from './erpApi';
import { antrianMutasi } from './antrianMutasi';
import { buatBal, buatBatch, buatItemSample, buatSuratJalan } from '../test/fixtures';
import {
  catatStatusBal,
  handlerMutasi,
  hapusBatchSample,
  kirimBatchSample,
  kirimPetani,
  verifikasiBatchSample,
} from './kirimMutasi';
import type { Petani } from '../types';

const galat = (status: number, pesan: string) => new apiClient.ApiError(pesan, status);
const rawBatch = (id: string, kode: string, barangIds: string[]) => ({
  batch_id: id,
  kode_batch: kode,
  tujuan_buyer: 'Buyer A',
  status: 'sample',
  items: barangIds.map((b) => ({ sample_item_id: `SI-${b}`, barang_id: b, no_bal: b, kode_harga_jual: 'HJ-45', harga_tawaran_kg: 45000 })),
});

beforeEach(() => {
  antrianMutasi.reset();
  antrianMutasi.aturJeda(() => 60_000);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  antrianMutasi.reset();
  vi.restoreAllMocks();
});

describe('hapusBatchSample: penghapusan harus sampai ke server', () => {
  const batch = buatBatch('1', 'sample');

  it('memakai DELETE /sample-batch/{id}', async () => {
    const hapus = vi.spyOn(apiClient.api, 'delete').mockResolvedValue({ status: 'success' });
    expect(await hapusBatchSample(batch)).toEqual({});
    expect(hapus).toHaveBeenCalledWith('/sample-batch/1');
  });

  it('baris sudah tiada di server (404 model) dianggap berhasil', async () => {
    vi.spyOn(apiClient.api, 'delete').mockRejectedValue(galat(404, 'No query results for model [SampleBatch]'));
    expect(await hapusBatchSample(batch)).toEqual({});
  });

  it('endpoint DELETE belum ada di server: batch dibatalkan lewat PUT status dibatalkan dan disembunyikan terus', async () => {
    vi.spyOn(apiClient.api, 'delete').mockRejectedValue(galat(405, 'Method Not Allowed'));
    const ubah = vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success' });

    expect(await hapusBatchSample(batch)).toEqual({ hapusLunak: true });
    expect(ubah).toHaveBeenCalledWith('/sample-batch/1', expect.objectContaining({ status: 'dibatalkan' }));
  });

  it('galat server (500) dilempar agar antrean mengulang, bukan dianggap berhasil', async () => {
    vi.spyOn(apiClient.api, 'delete').mockRejectedValue(galat(500, 'Server Error'));
    await expect(hapusBatchSample(batch)).rejects.toThrow('Server Error');
  });
});

describe('batch sample yang dihapus tidak muncul lagi saat daftar server dimuat ulang', () => {
  it('server belum menghapusnya (endpoint DELETE belum ada): tetap tersembunyi, sebelum dan sesudah tugasnya berhasil', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({ status: 'success', data: [rawBatch('SPL0001', 'SS-01', ['B1']), rawBatch('SPL0002', 'SS-02', ['B2'])] });
    vi.spyOn(apiClient.api, 'delete').mockRejectedValue(galat(405, 'Method Not Allowed'));
    vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success' });
    antrianMutasi.pasang(handlerMutasi);

    const batch = buatBatch('SPL0001', 'sample', { kode_batch: 'SS-01' });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'SPL0001', idAlt: 'SS-01', aksi: 'hapus', tambahan: { batch } });

    const hasil = await ErpApiService.getBatchSampleList();
    expect(hasil.data.map((b) => b.batch_id)).toEqual(['SPL0002']);

    // Jauh sesudah masa ingat tugas selesai, server masih mengembalikan barisnya (pembatalan lunak): tetap tersembunyi
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10 * 60_000);
    try {
      expect((await ErpApiService.getBatchSampleList()).data.map((b) => b.batch_id)).toEqual(['SPL0002']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('penghapusan gagal dikirim (server mati): tetap tersembunyi dan tercatat menunggu', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({ status: 'success', data: [rawBatch('SPL0001', 'SS-01', ['B1'])] });
    vi.spyOn(apiClient.api, 'delete').mockRejectedValue(new Error('Failed to fetch'));
    antrianMutasi.pasang(handlerMutasi);

    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'SPL0001', aksi: 'hapus', tambahan: { batch: buatBatch('SPL0001', 'sample') } });

    expect((await ErpApiService.getBatchSampleList()).data).toEqual([]);
    expect(antrianMutasi.ringkasan().menunggu).toBe(1);
  });
});

describe('kirimBatchSample: perubahan bal dan harga ikut terkirim, dan server yang mengabaikannya ketahuan', () => {
  const batch = buatBatch('SPL0001', 'sample', {
    kode_batch: 'SS-01',
    items: [buatItemSample('B1', { harga_tawaran_kg: 46000, kode_harga_jual: 'HJ-46' }), buatItemSample('B2')],
  });

  it('PUT memuat barang_id, harga, dan kode harga jual setiap bal', async () => {
    const ubah = vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success', data: rawBatch('SPL0001', 'SS-01', ['B1', 'B2']) });
    await kirimBatchSample(batch, false);

    const [alamat, isi] = ubah.mock.calls[0] as [string, { items: Array<{ barang_id: string; harga_tawaran_kg: number; kode_harga_jual: string }> }];
    expect(alamat).toBe('/sample-batch/SPL0001');
    expect(isi.items.map((i) => [i.barang_id, i.harga_tawaran_kg, i.kode_harga_jual])).toEqual([
      ['B1', 46000, 'HJ-46'],
      ['B2', 45000, 'HJ-45'],
    ]);
  });

  it('Draft dikirim ke server sebagai sample', async () => {
    const ubah = vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success', data: rawBatch('SPL0001', 'SS-01', ['B1']) });
    await kirimBatchSample({ ...batch, status: 'draft' }, false);
    expect((ubah.mock.calls[0][1] as { status: string }).status).toBe('sample');
  });

  it('server hanya menyimpan sebagian (bal tambahan hilang, harga lama): selisihnya dilaporkan', async () => {
    vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success', data: rawBatch('SPL0001', 'SS-01', ['B1']) });
    const hasil = await kirimBatchSample(batch, false);

    const selisih = verifikasiBatchSample({ data: batch } as never, hasil);
    expect(selisih).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/B1.*harga 46000.*45000/),
        expect.stringMatching(/B1.*kode harga jual HJ-46/),
        expect.stringMatching(/B2 belum ada di batch pada server/),
      ])
    );
  });

  it('server menyimpan lengkap: tidak ada selisih', async () => {
    const lengkap = { ...rawBatch('SPL0001', 'SS-01', ['B1', 'B2']) };
    lengkap.items[0] = { ...lengkap.items[0], harga_tawaran_kg: 46000, kode_harga_jual: 'HJ-46' };
    vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success', data: lengkap });
    const hasil = await kirimBatchSample(batch, false);
    expect(verifikasiBatchSample({ data: batch } as never, hasil)).toEqual([]);
  });

  it('bal yang sudah dikeluarkan di layar tetapi masih ada di server dilaporkan', async () => {
    vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success', data: rawBatch('SPL0001', 'SS-01', ['B1', 'B2', 'B9']) });
    const sedikit = { ...batch, items: batch.items.slice(0, 2) };
    const hasil = await kirimBatchSample(sedikit, false);
    expect(verifikasiBatchSample({ data: sedikit } as never, hasil)).toEqual(
      expect.arrayContaining([expect.stringMatching(/B9 sudah dikeluarkan di layar/)])
    );
  });
});

describe('kirimPetani: edit harus sampai ke server, tidak jatuh diam-diam ke lokal', () => {
  const petani = { petani_id: 'PTN-2026-001', nama_petani: 'Subai', no_hp: '', alamat: '', status_aktif: true } as Petani;
  const dariServer = { data: { petani_id: 'PTN-2026-001', nama_petani: 'Subai', status_aktif: true } };

  it('edit memakai PUT dan tidak mengirim statistik lokal', async () => {
    const ubah = vi.spyOn(apiClient.api, 'put').mockResolvedValue(dariServer as never);
    await kirimPetani({ ...petani, statistik: { total_setoran_bal: 3, total_berat_kg: 100, kunjungan_terakhir: 'x', grade_dominan: 'y' } }, false);
    expect(ubah).toHaveBeenCalledWith('/petani/PTN-2026-001', expect.not.objectContaining({ statistik: expect.anything() }));
  });

  it('galat server dilempar (bukan disembunyikan)', async () => {
    vi.spyOn(apiClient.api, 'put').mockRejectedValue(galat(422, 'Nama petani wajib diisi'));
    await expect(kirimPetani(petani, false)).rejects.toThrow('Nama petani wajib diisi');
  });

  it('edit pada petani yang belum ada di server diganti menjadi buat baru', async () => {
    vi.spyOn(apiClient.api, 'put').mockRejectedValue(galat(404, 'No query results for model [Petani]'));
    const buat = vi.spyOn(apiClient.api, 'post').mockResolvedValue(dariServer as never);
    await kirimPetani(petani, false);
    expect(buat).toHaveBeenCalledWith('/petani', expect.objectContaining({ petani_id: 'PTN-2026-001' }));
  });

  it('petani baru yang ternyata sudah ada di server diganti menjadi ubah', async () => {
    vi.spyOn(apiClient.api, 'post').mockRejectedValue(galat(409, 'Petani sudah terdaftar'));
    const ubah = vi.spyOn(apiClient.api, 'put').mockResolvedValue(dariServer as never);
    await kirimPetani(petani, true);
    expect(ubah).toHaveBeenCalledWith('/petani/PTN-2026-001', expect.anything());
  });
});

describe('catatStatusBal: hanya bal yang statusnya berubah yang dikirim', () => {
  it('seluruh daftar bal boleh diberikan; yang tidak berubah dilewati', async () => {
    const lama = [buatBal('B1', { status_stok: 'di_gudang' }), buatBal('B2', { status_stok: 'di_gudang' }), buatBal('B3', { status_stok: 'terkirim_sample' })];
    const baru = [{ ...lama[0], status_stok: 'terkirim_sample' as const }, lama[1], { ...lama[2], status_stok: 'proses_sortir' as const }];
    vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success', data: {} });
    antrianMutasi.pasang(handlerMutasi);

    catatStatusBal(baru, lama);
    await Promise.resolve();

    const kunci = antrianMutasi.ringkasan().rincian.map((r) => r.kunci);
    // B1 berubah; B2 tidak; B3 berubah ke status yang tidak dikenal server sehingga tidak dikirim
    expect(kunci.filter((k) => k.startsWith('barang|'))).toEqual(expect.not.arrayContaining(['barang|B2|status', 'barang|B3|status']));
    expect(apiClient.api.put).toHaveBeenCalledWith('/barang/B1/status', expect.objectContaining({ status_stok: 'terkirim_sample' }));
    expect(apiClient.api.put).not.toHaveBeenCalledWith('/barang/B2/status', expect.anything());
    expect(apiClient.api.put).not.toHaveBeenCalledWith('/barang/B3/status', expect.anything());
  });
});

describe('Surat Jalan: hapus dan status', () => {
  it('pembatalan Surat Jalan yang endpoint-nya belum ada tidak dianggap berhasil (tetap menunggu dan terlihat)', async () => {
    vi.spyOn(apiClient.api, 'delete').mockRejectedValue(galat(405, 'Method Not Allowed'));
    antrianMutasi.pasang(handlerMutasi);
    await antrianMutasi.masukkan({ entitas: 'pengiriman', id: 'P1', aksi: 'hapus', label: 'Batalkan Surat Jalan SJ-1' });

    const r = antrianMutasi.ringkasan();
    expect(r.menunggu).toBe(1);
    expect(r.bermasalah).toBe(1);
    expect(r.rincian[0].galat).toContain('Method Not Allowed');
  });

  it('status Surat Jalan dikirim lewat PUT /pengiriman/{id}/status', async () => {
    const put = vi.spyOn(apiClient.api, 'put').mockResolvedValue({ status: 'success' });
    antrianMutasi.pasang(handlerMutasi);
    await antrianMutasi.masukkan({ entitas: 'pengiriman', id: 'P1', aksi: 'status', data: buatSuratJalan('P1', 'selesai') });
    expect(put).toHaveBeenCalledWith('/pengiriman/P1/status', { status: 'selesai' });
    expect(antrianMutasi.ringkasan().menunggu).toBe(0);
  });
});
