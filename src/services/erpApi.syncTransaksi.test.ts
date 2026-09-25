import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from './apiClient';
import { ErpApiService } from './erpApi';
import { buatKupon } from '../test/fixtures';
import { balDihapusDariKupon, catatBalDihapus } from '../utils/balDihapus';
import { verifikasiHasil } from './antrianSinkron';
import type { TransaksiItemBal } from '../types';

/**
 * Regresi 2026-09-22: kupon yang dibiarkan terbuka lama di Sortir/Timbangan bisa punya salinan bal
 * saudara yang sudah basi. Simpanan berikutnya (mis. tambah bal baru) tidak boleh menimpa balik
 * ganti tikar/grade/harga bal saudara itu ke nilai lama hanya karena layar belum sempat menyegarkan.
 * syncTransaksi harus mengambil kupon ini dari server dan menggabungkannya SEBELUM mengirim.
 */

const item = (extra: Partial<TransaksiItemBal> = {}): TransaksiItemBal =>
  ({ item_id: 'TRX-1-BAL-01', no_bal: '1', kode_grade: '45', harga_per_kg: 50000, berat_kg: 0, ganti_tikar: false, potongan_tikar: 0, ...extra }) as TransaksiItemBal;

const rawServerItem = (extra: Record<string, unknown> = {}) => ({
  item_id: 'TRX-1-BAL-01',
  no_bal: '1',
  kode_grade: '45',
  harga_per_kg: 50000,
  berat_kg: 0,
  ganti_tikar: true,
  potongan_tikar: 50000,
  status_timbang: 'menunggu_timbang',
  ...extra,
});

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('syncTransaksi: menyegarkan kupon dari server sebelum kirim (bukan lewat tampilan)', () => {
  it('bal saudara yang ganti tikarnya sudah diaktifkan di server tidak ikut dimatikan balik oleh salinan layar yang basi', async () => {
    // Layar (basi): bal 1 masih tercatat ganti tikar MATI, operator baru saja menambah bal 2
    const balSaudaraBasi = item({ item_id: 'TRX-1-BAL-01', no_bal: '1', ganti_tikar: false, potongan_tikar: 0 });
    const balBaru = item({ item_id: 'TRX-1-BAL-02', no_bal: '2' });
    const kuponLayar = buatKupon('TRX-1', { items: [balSaudaraBasi, balBaru] });

    // Server (benar): bal 1 ganti tikar sudah AKTIF (diubah dari perangkat lain)
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({
      status: 'success',
      data: {
        transaksi_id: 'TRX-1',
        no_kupon: 'KUPTRX-1',
        petani_id: 'P1',
        status_tahap: 'proses_sortir',
        status_pembayaran: 'belum_lunas',
        tanggal_transaksi: '2026-09-19',
        items: [rawServerItem()],
      },
    });

    const dikirim: { items?: unknown[] } = {};
    vi.spyOn(apiClient.api, 'put').mockImplementation(async (url: string, body?: unknown) => {
      if (url.includes('/sortir-items')) {
        dikirim.items = (body as { items?: unknown[] })?.items;
        return {
          status: 'success',
          data: { transaksi_id: 'TRX-1', no_kupon: 'KUPTRX-1', items: [rawServerItem(), { ...rawServerItem(), item_id: 'TRX-1-BAL-02', no_bal: '2', ganti_tikar: false, potongan_tikar: 0 }] },
        };
      }
      throw new Error(`URL tak terduga dalam tes: ${url}`);
    });

    await ErpApiService.syncTransaksi(kuponLayar, { status_pembayaran: 'belum_lunas' }, { tanpaCekKesehatan: true });

    const balSatu = (dikirim.items as any[])?.find((it) => it.no_bal === '1');
    expect(balSatu).toBeDefined();
    expect(balSatu.ganti_tikar).toBe(true);
    expect(balSatu.potongan_tikar).toBe(50000);
  });

  it('bal yang dihapus di Sortir benar-benar tidak ikut dikirim walau server masih memuatnya', async () => {
    // Regresi 2026-09-23: dulu penggabungan dengan versi server membawa balik bal yang baru dihapus
    catatBalDihapus('TRX-3', '2');
    const kuponLayar = buatKupon('TRX-3', { items: [item({ item_id: 'TRX-3-BAL-01', no_bal: '1' })] });
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({
      status: 'success',
      data: {
        transaksi_id: 'TRX-3',
        no_kupon: 'KUPTRX-3',
        items: [rawServerItem({ item_id: 'TRX-3-BAL-01', no_bal: '1' }), rawServerItem({ item_id: 'TRX-3-BAL-02', no_bal: '2' })],
      },
    });
    const dikirim: { items?: any[] } = {};
    vi.spyOn(apiClient.api, 'put').mockImplementation(async (url: string, body?: unknown) => {
      if (url.includes('/sortir-items')) {
        dikirim.items = (body as { items?: any[] })?.items;
        return { status: 'success', data: { transaksi_id: 'TRX-3', no_kupon: 'KUPTRX-3', items: [rawServerItem({ item_id: 'TRX-3-BAL-01', no_bal: '1' })] } };
      }
      throw new Error(`URL tak terduga dalam tes: ${url}`);
    });

    await ErpApiService.syncTransaksi(kuponLayar, { status_pembayaran: 'belum_lunas' }, { tanpaCekKesehatan: true });

    expect(dikirim.items?.map((it) => it.no_bal)).toEqual(['1']);
    // Server sudah tidak memuatnya: penanda hapus selesai tugasnya
    expect(balDihapusDariKupon('TRX-3').size).toBe(0);
  });

  it('ganti No Bal di Sortir terkirim dengan item_id yang sama (tidak kembali ke nomor lama)', async () => {
    const kuponLayar = buatKupon('TRX-4', {
      items: [item({ item_id: 'TRX-4-BAL-01', no_bal: '1B', diubah_lokal_pada: Date.now() })],
    });
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({
      status: 'success',
      data: { transaksi_id: 'TRX-4', no_kupon: 'KUPTRX-4', items: [rawServerItem({ item_id: 'TRX-4-BAL-01', no_bal: '1' })] },
    });
    const dikirim: { items?: any[] } = {};
    vi.spyOn(apiClient.api, 'put').mockImplementation(async (url: string, body?: unknown) => {
      if (url.includes('/sortir-items')) {
        dikirim.items = (body as { items?: any[] })?.items;
        return { status: 'success', data: { transaksi_id: 'TRX-4', no_kupon: 'KUPTRX-4', items: [rawServerItem({ item_id: 'TRX-4-BAL-01', no_bal: '1B' })] } };
      }
      throw new Error(`URL tak terduga dalam tes: ${url}`);
    });

    await ErpApiService.syncTransaksi(kuponLayar, { status_pembayaran: 'belum_lunas' }, { tanpaCekKesehatan: true });

    expect(dikirim.items).toHaveLength(1);
    expect(dikirim.items?.[0]).toMatchObject({ item_id: 'TRX-4-BAL-01', no_bal: '1B' });
  });

  it('hasil timbang dikirim dari versi yang sudah digabung, bukan salinan layar yang basi', async () => {
    // Layar: bal 1 baru ditimbang di sini; bal 2 masih 0 di layar padahal sudah ditimbang 50 kg di perangkat lain
    const kuponLayar = buatKupon('TRX-5', {
      items: [
        item({ item_id: 'TRX-5-BAL-01', no_bal: '1', berat_kg: 40, berat_bruto_kg: 45, diubah_lokal_pada: Date.now() }),
        item({ item_id: 'TRX-5-BAL-02', no_bal: '2', berat_kg: 0 }),
      ],
    });
    const serverBal2 = rawServerItem({ item_id: 'TRX-5-BAL-02', no_bal: '2', berat_kg: 50, berat_bruto_kg: 55, status_timbang: 'selesai_timbang', ganti_tikar: false, potongan_tikar: 0 });
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({
      status: 'success',
      data: { transaksi_id: 'TRX-5', no_kupon: 'KUPTRX-5', items: [rawServerItem({ item_id: 'TRX-5-BAL-01', no_bal: '1', ganti_tikar: false, potongan_tikar: 0 }), serverBal2] },
    });
    const timbang: { items?: any[] } = {};
    vi.spyOn(apiClient.api, 'put').mockImplementation(async (url: string, body?: unknown) => {
      if (url.includes('/sortir-items')) {
        return { status: 'success', data: { transaksi_id: 'TRX-5', no_kupon: 'KUPTRX-5', items: [rawServerItem({ item_id: 'TRX-5-BAL-01', no_bal: '1' }), serverBal2] } };
      }
      if (url.includes('/timbang')) {
        timbang.items = (body as { items?: any[] })?.items;
        return { status: 'success', data: { transaksi_id: 'TRX-5', no_kupon: 'KUPTRX-5', items: [] } };
      }
      throw new Error(`URL tak terduga dalam tes: ${url}`);
    });

    await ErpApiService.syncTransaksi(kuponLayar, { status_pembayaran: 'belum_lunas' }, { tanpaCekKesehatan: true });

    expect(timbang.items?.find((it) => it.no_bal === '1')?.berat_kg).toBe(40);
    expect(timbang.items?.find((it) => it.no_bal === '2')?.berat_kg).toBe(50);
  });

  it('grade yang baru diedit di Sortir terkirim; grade bal saudara yang basi tetap mengikuti server', async () => {
    // Regresi 2026-09-25: "SB3093: kode 61 di layar tetapi 58 di server". Penggabungan sebelum kirim selalu
    // memakai grade server, jadi edit grade tidak pernah sampai ke server.
    const kuponLayar = buatKupon('TRX-6', {
      items: [
        item({ item_id: 'TRX-6-BAL-01', no_bal: 'SB3093', kode_grade: '61', harga_per_kg: 45000, diubah_lokal_pada: Date.now(), grade_diubah_pada: Date.now() }),
        item({ item_id: 'TRX-6-BAL-02', no_bal: 'SB3094', kode_grade: '61', harga_per_kg: 45000 }),
      ],
    });
    const serverItems = [
      rawServerItem({ item_id: 'TRX-6-BAL-01', no_bal: 'SB3093', kode_grade: '58', harga_per_kg: 40000, ganti_tikar: false, potongan_tikar: 0 }),
      rawServerItem({ item_id: 'TRX-6-BAL-02', no_bal: 'SB3094', kode_grade: '58', harga_per_kg: 40000, ganti_tikar: false, potongan_tikar: 0 }),
    ];
    vi.spyOn(apiClient.api, 'get').mockResolvedValue({ status: 'success', data: { transaksi_id: 'TRX-6', no_kupon: 'KUPTRX-6', items: serverItems } });
    const dikirim: { items?: any[] } = {};
    vi.spyOn(apiClient.api, 'put').mockImplementation(async (url: string, body?: unknown) => {
      if (url.includes('/sortir-items')) {
        dikirim.items = (body as { items?: any[] })?.items;
        // Server menyimpan grade & harga yang dikirim
        const items = serverItems.map((s) => ({ ...s, ...dikirim.items?.find((d) => d.no_bal === s.no_bal) }));
        return { status: 'success', data: { transaksi_id: 'TRX-6', no_kupon: 'KUPTRX-6', items } };
      }
      throw new Error(`URL tak terduga dalam tes: ${url}`);
    });

    const { syncedTx } = await ErpApiService.syncTransaksi(kuponLayar, { status_pembayaran: 'belum_lunas' }, { tanpaCekKesehatan: true });

    expect(dikirim.items?.find((it) => it.no_bal === 'SB3093')).toMatchObject({ kode_grade: '61', harga_per_kg: 45000 });
    expect(dikirim.items?.find((it) => it.no_bal === 'SB3094')).toMatchObject({ kode_grade: '58', harga_per_kg: 40000 });
    // Bal saudara yang grade-nya mengikuti server bukan "gagal simpan"
    expect(verifikasiHasil(syncedTx, kuponLayar)).toEqual([]);
  });

  it('tetap mengirim data layar apa adanya bila kupon gagal disegarkan dari server (offline sesaat)', async () => {
    const bal = item({ ganti_tikar: true, potongan_tikar: 50000 });
    const kuponLayar = buatKupon('TRX-2', { items: [bal] });

    vi.spyOn(apiClient.api, 'get').mockRejectedValue(new apiClient.ApiError('Server tidak dapat dihubungi', 0));

    const dikirim: { items?: unknown[] } = {};
    vi.spyOn(apiClient.api, 'put').mockImplementation(async (url: string, body?: unknown) => {
      if (url.includes('/sortir-items')) {
        dikirim.items = (body as { items?: unknown[] })?.items;
        return { status: 'success', data: { transaksi_id: 'TRX-2', no_kupon: 'KUPTRX-2', items: [rawServerItem({ item_id: bal.item_id })] } };
      }
      throw new Error(`URL tak terduga dalam tes: ${url}`);
    });

    await ErpApiService.syncTransaksi(kuponLayar, { status_pembayaran: 'belum_lunas' }, { tanpaCekKesehatan: true });

    expect((dikirim.items as any[])?.[0]?.ganti_tikar).toBe(true);
  });
});
