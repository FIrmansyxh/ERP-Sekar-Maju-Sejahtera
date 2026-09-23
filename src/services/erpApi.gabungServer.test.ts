import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErpApiService } from './erpApi';
import { buatBatch, buatSuratJalan } from '../test/fixtures';
import { hariIniLokal } from '../utils/rentangTanggal';
import { akhiranUnik } from '../utils/idUnik';

/**
 * Regresi 2026-09-23: data batch sample & Surat Jalan dari server dulu selalu kalah dari salinan lokal
 * (tujuan, No. Surat, berat kirim, netto jual, aturan potongan), sehingga perubahan dari komputer lain
 * tidak pernah terlihat. Perubahan lokal yang belum terkirim dijaga terpisah oleh overlay antrean.
 */
describe('gabung data server lintas perangkat', () => {
  it('Surat Jalan: berat kirim, netto jual, dan aturan potongan dari server menjadi acuan bila server menyimpannya', () => {
    const lokal = buatSuratJalan('SJ1', 'dimuat', {
      berat_kirim_map: { B1: 44, B2: 44 },
      netto_jual_map: { B1: 40, B2: 40 },
      aturan_netto: [{ min: 1, max: 49, potongan: 4 }],
    });
    const server = ErpApiService.mapBackendPengiriman({
      pengiriman_id: 'SJ1',
      no_surat_jalan: 'SJ-SJ1',
      status: 'dimuat',
      aturan_netto: [{ min: 1, max: 60, potongan: 5 }],
      items: [
        { barang_id: 'B1', harga_deal_per_kg: 45000, berat_kirim_kg: 50, netto_jual_kg: 45 },
        { barang_id: 'B2', harga_deal_per_kg: 46000, berat_kirim_kg: 51, netto_jual_kg: 46 },
      ],
    });

    const hasil = ErpApiService.gabungPengirimanServer(lokal, server);
    expect(hasil.berat_kirim_map).toEqual({ B1: 50, B2: 51 });
    expect(hasil.netto_jual_map).toEqual({ B1: 45, B2: 46 });
    expect(hasil.aturan_netto).toEqual([{ min: 1, max: 60, potongan: 5 }]);
  });

  it('Surat Jalan: server lama yang belum menyimpan berat kirim tetap memakai salinan lokal', () => {
    const lokal = buatSuratJalan('SJ1', 'dimuat', { berat_kirim_map: { B1: 44, B2: 43 }, total_berat_kg: 87 });
    const server = ErpApiService.mapBackendPengiriman({
      pengiriman_id: 'SJ1',
      no_surat_jalan: 'SJ-SJ1',
      status: 'dimuat',
      items: [
        { barang_id: 'B1', harga_deal_per_kg: 45000, barang: { item: { berat_bruto_kg: 44 } } },
        { barang_id: 'B2', harga_deal_per_kg: 46000, barang: { item: { berat_bruto_kg: 44 } } },
      ],
    });

    const hasil = ErpApiService.gabungPengirimanServer(lokal, server);
    expect(hasil.berat_kirim_map).toEqual({ B1: 44, B2: 43 });
    expect(hasil.total_berat_kg).toBe(87);
  });

  it('Batch sample: tujuan, No. Surat, dan nama pengirim dari server menang atas salinan lokal yang basi', () => {
    const lokal = buatBatch('SPL1', 'sample', { kode_batch: 'SS-LAMA', tujuan_buyer: 'Pabrik Lama', dikirim_oleh: 'Budi' });
    const server = ErpApiService.mapBackendBatchSample({
      batch_id: 'SPL1',
      kode_batch: 'SS-BARU',
      tujuan_buyer: 'Pabrik Baru',
      dikirim_oleh: 'USR-001',
      dikirim_oleh_nama: 'Siti',
      status: 'sample',
      tanggal_kirim: '2026-09-20',
      items: [],
    });

    const hasil = ErpApiService.gabungBatchServer(lokal, server);
    expect(hasil).toMatchObject({ kode_batch: 'SS-BARU', tujuan_buyer: 'Pabrik Baru', dikirim_oleh: 'Siti' });
  });

  it('Batch sample: nomor otomatis dari server lama tidak menggantikan No. Surat Sample yang diketik', () => {
    const lokal = buatBatch('SPL1', 'sample', { kode_batch: 'SS-001/IX/2026' });
    const server = ErpApiService.mapBackendBatchSample({ batch_id: 'SPL1', kode_batch: 'BATCH-20260923-e7c0', status: 'sample', items: [] });
    expect(ErpApiService.gabungBatchServer(lokal, server).kode_batch).toBe('SS-001/IX/2026');
  });

  it('Batch sample: ID akun pembuat di server tidak ditampilkan sebagai nama pengirim', () => {
    const server = ErpApiService.mapBackendBatchSample({ batch_id: 'SPL2', kode_batch: 'X', dikirim_oleh: 'USR-001', status: 'sample', items: [] });
    expect(server.dikirim_oleh).toBe('');
  });
});

describe('tanggal hari ini & ID unik', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hari ini memakai jam lokal, bukan UTC (dini hari WIB tidak tercatat sebagai kemarin)', () => {
    vi.useFakeTimers();
    // 23 Sep 2026 pukul 01.30 waktu lokal
    vi.setSystemTime(new Date(2026, 8, 23, 1, 30));
    expect(hariIniLokal()).toBe('2026-09-23');
  });

  it('akhiran ID acak pendek tanpa huruf yang mudah tertukar', () => {
    const a = akhiranUnik();
    expect(a).toMatch(/^[0-9A-HJ-NP-Z]{4}$/);
    const banyak = new Set(Array.from({ length: 500 }, () => akhiranUnik(6)));
    expect(banyak.size).toBe(500);
  });
});
