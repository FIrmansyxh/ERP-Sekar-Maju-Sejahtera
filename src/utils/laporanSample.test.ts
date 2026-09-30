import { describe, expect, it } from 'vitest';
import { buatBal, buatBatch, buatItemSample } from '../test/fixtures';
import { rekapPerBatch, ringkasSample, susunBarisSample } from './laporanSample';

describe('Laporan Pengiriman Sample', () => {
  const batch = buatBatch('BT1', 'dikirim', {
    items: [
      // Disetujui turun dari tawaran 45.000 ke 43.000; beli 30.000
      buatItemSample('B1', { status_item: 'disetujui', berat_bal_kg: 40, harga_tawaran_kg: 45000, harga_deal_kg: 43000, harga_beli_kg: 30000 }),
      // Disetujui tanpa harga deal tersendiri = harga tawaran; harga beli dari bal gudang
      buatItemSample('B2', { status_item: 'disetujui', berat_bal_kg: 50, harga_tawaran_kg: 46000, harga_deal_kg: undefined, harga_beli_kg: undefined }),
      // Nego: belum punya harga jadi walau harga_deal_kg terisi
      buatItemSample('B3', { status_item: 'nego', berat_bal_kg: 40, harga_tawaran_kg: 45000, harga_deal_kg: 44000 }),
      buatItemSample('B4', { status_item: 'dikirim', berat_bal_kg: 40, harga_tawaran_kg: 45000 }),
    ],
  });
  const bal = [buatBal('B2', { harga_per_kg: 32000, no_bal: 'SB77' })];

  it('menghitung selisih tawaran-deal dan jual-beli per bal, hanya untuk bal Disetujui', () => {
    const rows = susunBarisSample([batch], bal);
    const [b1, b2, b3, b4] = rows;

    expect(b1).toMatchObject({ hargaDeal: 43000, selisihTawarDealKg: -2000, selisihJualBeliKg: 13000, selisihTawarDealNilai: -80000, selisihJualBeliNilai: 520000 });
    expect(b2).toMatchObject({ no_bal: 'SB77', hargaBeli: 32000, hargaDeal: 46000, selisihTawarDealKg: 0, selisihJualBeliKg: 14000 });
    expect(b3).toMatchObject({ status: 'nego', hargaDeal: null, selisihTawarDealKg: null, selisihJualBeliKg: null });
    expect(b4).toMatchObject({ status: 'menunggu', hargaDeal: null });
  });

  it('ringkasan dan rekap per batch memakai angka yang sama', () => {
    const rows = susunBarisSample([batch], bal);
    const r = ringkasSample(rows);
    expect(r).toMatchObject({ jumlahBal: 4, disetujui: 2, nego: 1, menunggu: 1, nettoDisetujui: 90 });
    expect(r.nilaiDeal).toBe(40 * 43000 + 50 * 46000);
    expect(r.selisihTawarDeal).toBe(-80000);
    expect(r.selisihJualBeli).toBe(520000 + 50 * 14000);
    expect(r.persenSetuju).toBeCloseTo((2 / 3) * 100);

    const [perBatch] = rekapPerBatch(rows);
    expect(perBatch).toMatchObject({ kode_batch: 'SAMPLE-BT1', selisihTawarDeal: r.selisihTawarDeal, selisihJualBeli: r.selisihJualBeli });
  });

  it('batch Draft dan Dibatalkan tidak ikut; bal tanpa harga beli dihitung terpisah', () => {
    const tanpaBeli = buatBatch('BT2', 'selesai', {
      items: [buatItemSample('B9', { status_item: 'disetujui', harga_beli_kg: undefined, harga_deal_kg: 45000 })],
    });
    const rows = susunBarisSample([buatBatch('BT0', 'draft'), buatBatch('BTX', 'dibatalkan'), tanpaBeli], []);
    expect(rows).toHaveLength(1);
    const r = ringkasSample(rows);
    expect(r.tanpaHargaBeli).toBe(1);
    expect(r.selisihJualBeli).toBe(0);
    expect(r.rataSelisihJualBeliKg).toBeNull();
  });
});
