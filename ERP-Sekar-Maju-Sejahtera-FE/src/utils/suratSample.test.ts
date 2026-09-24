import { describe, expect, it } from 'vitest';
import { buatBatch, buatItemSample } from '../test/fixtures';
import { susunSheetSuratSample } from './excelSuratSample';
import { kodeBalPembeliBerbeda, kodeHargaJualSample } from './suratSample';

describe('kodeHargaJualSample', () => {
  it('memakai kode harga jual, dan strip bila belum dipilih', () => {
    expect(kodeHargaJualSample({ kode_harga_jual: 'HJ-45' })).toBe('HJ-45');
    expect(kodeHargaJualSample({ kode_harga_jual: '-' })).toBe('-');
    expect(kodeHargaJualSample({ kode_harga_jual: '' })).toBe('-');
  });
});

describe('kodeBalPembeliBerbeda', () => {
  it('hanya menampilkan kode buyer bila berbeda dari No Bal', () => {
    expect(kodeBalPembeliBerbeda({ no_bal: 'TS1', kode_bal_pembeli: 'J-1' })).toBe('J-1');
    expect(kodeBalPembeliBerbeda({ no_bal: 'TS1', kode_bal_pembeli: 'ts1' })).toBe('');
    expect(kodeBalPembeliBerbeda({ no_bal: 'TS1', kode_bal_pembeli: '' })).toBe('');
  });
});

describe('susunSheetSuratSample', () => {
  const batch = buatBatch('1', 'sample', {
    permintaan_buyer: 'Grade 57 kering',
    items: [
      buatItemSample('B1', { kode_bal_pembeli: 'B1', kode_harga_jual: 'HJ-45', harga_tawaran_kg: 45000, harga_deal_kg: 46000 }),
      buatItemSample('B2', { kode_bal_pembeli: 'B2', kode_harga_jual: 'HJ-50', berat_bruto_kg: 40 }),
    ],
  });

  it('berisi kode harga jual dan bruto, tanpa nilai rupiah maupun data petani', () => {
    const sheet = susunSheetSuratSample(batch);
    expect(sheet.columns.map((c) => c.header)).toEqual(['No', 'No Bal', 'Bruto (Kg)', 'Kode Harga Jual']);
    expect(sheet.rows).toEqual([
      [1, 'B1', 44, 'HJ-45'],
      [2, 'B2', 40, 'HJ-50'],
    ]);
    const semua = JSON.stringify(sheet);
    expect(semua).not.toMatch(/45000|46000|Rp|Tawar|Deal|Subtotal|petani/i);
  });

  it('total bal dan bruto, serta keterangan surat di bagian info', () => {
    const sheet = susunSheetSuratSample(batch);
    expect(sheet.totalRow).toEqual(['TOTAL (2 bal sample)', '', 84, '']);
    expect(sheet.info?.[0]).toContain('SAMPLE-1');
    expect(sheet.info?.[1]).toContain('Buyer A');
    expect(sheet.info?.some((baris) => baris.includes('Grade 57 kering'))).toBe(true);
  });

  it('kolom Kode Buyer muncul hanya bila ada kode yang berbeda dari No Bal', () => {
    const dengan = buatBatch('2', 'sample', { items: [buatItemSample('B1', { kode_bal_pembeli: 'JD-9' })] });
    const sheet = susunSheetSuratSample(dengan);
    expect(sheet.columns.map((c) => c.header)).toEqual(['No', 'No Bal', 'Kode Buyer', 'Bruto (Kg)', 'Kode Harga Jual']);
    expect(sheet.rows[0]).toEqual([1, 'B1', 'JD-9', 44, 'HJ-45']);
    expect(sheet.totalRow).toHaveLength(sheet.columns.length);
  });
});
