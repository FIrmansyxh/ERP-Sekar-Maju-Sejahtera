import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from './apiClient';
import { ErpApiService } from './erpApi';
import { buatKupon } from '../test/fixtures';
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
