import { describe, expect, it } from 'vitest';
import { Barang, PengirimanBarang } from '../types';
import { hitungJumlahBayarBal, hitungProfitPengiriman } from './financialCalculations';

const bal = { barang_id: 'B1', no_bal: 'SB0001', kode_grade: 'A', berat_kg: 50, harga_per_kg: 100000, berat_bruto_kg: 52, status_stok: 'keluar' } as unknown as Barang;

const suratJalan = (status: PengirimanBarang['status'], extra: Partial<PengirimanBarang> = {}): PengirimanBarang =>
  ({
    pengiriman_id: status,
    no_surat_jalan: `SJ-${status}`,
    status,
    barang_ids: ['B1'],
    total_bal: 1,
    harga_deal_map: { B1: 150000 },
    berat_kirim_map: { B1: 55 },
    ...extra,
  }) as unknown as PengirimanBarang;

describe('hitungProfitPengiriman: penjualan baru masuk saat Surat Jalan Selesai', () => {
  it.each(['dimuat', 'dikirim', 'dalam_perjalanan', 'diterima'] as const)('status %s belum dihitung', (status) => {
    const hasil = hitungProfitPengiriman([suratJalan(status)], [bal], [], []);
    expect(hasil.totalPenjualan).toBe(0);
    expect(hasil.totalBalTerkirim).toBe(0);
    expect(hasil.validShippedDO).toHaveLength(0);
  });

  it('status selesai dihitung: netto jual (bruto timbang ulang) x harga jual', () => {
    const hasil = hitungProfitPengiriman([suratJalan('selesai')], [bal], [], []);
    expect(hasil.totalPenjualan).toBe(55 * 150000);
    expect(hasil.totalBalTerkirim).toBe(1);
  });

  it('modal memakai netto beli x harga beli, sehingga keuntungan = penjualan - modal', () => {
    const hasil = hitungProfitPengiriman([suratJalan('selesai')], [bal], [], []);
    expect(hasil.totalHargaBeliTerkirim).toBe(50 * 100000);
    expect(hasil.keuntunganBersih).toBe(55 * 150000 - 50 * 100000);
  });

  it('memakai netto jual dari aturan netto bila ada', () => {
    const hasil = hitungProfitPengiriman([suratJalan('selesai', { netto_jual_map: { B1: 50 } })], [bal], [], []);
    expect(hasil.totalPenjualan).toBe(50 * 150000);
  });

  it('hanya Surat Jalan selesai yang ikut ketika status bercampur', () => {
    const hasil = hitungProfitPengiriman([suratJalan('dikirim'), suratJalan('selesai')], [bal], [], []);
    expect(hasil.validShippedDO.map((p) => p.status)).toEqual(['selesai']);
  });
});

describe('hitungJumlahBayarBal: sama dengan Jumlah Bayar di Kasir', () => {
  it('nilai beli dikurangi kuli, tali, dan tikar', () => {
    expect(hitungJumlahBayarBal(2_400_000, 40, 10_000)).toBe(2_390_000);
    expect(hitungJumlahBayarBal(2_400_000, 40, 85_000)).toBe(2_315_000);
  });
  it('bal yang belum ditimbang belum dibayar, dan tidak pernah negatif', () => {
    expect(hitungJumlahBayarBal(0, 0, 10_000)).toBe(0);
    expect(hitungJumlahBayarBal(5_000, 0.1, 10_000)).toBe(0);
  });
});
