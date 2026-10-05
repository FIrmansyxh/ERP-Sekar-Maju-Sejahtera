import { describe, expect, it } from 'vitest';
import { buatBatch, buatItemSample } from '../test/fixtures';
import { susunSheetSuratSample } from './excelSuratSample';
import { kodeHargaJualSample, nilaiHargaJualSample, noJadiSample } from './suratSample';

describe('kodeHargaJualSample', () => {
  it('memakai kode harga jual, dan strip bila belum dipilih', () => {
    expect(kodeHargaJualSample({ kode_harga_jual: 'HJ-45' })).toBe('HJ-45');
    expect(kodeHargaJualSample({ kode_harga_jual: '-' })).toBe('-');
    expect(kodeHargaJualSample({ kode_harga_jual: '' })).toBe('-');
  });
});

describe('noJadiSample & nilaiHargaJualSample', () => {
  it('nomor jadi = nomor untuk pembeli, atau No Bal gudang bila tidak diberi nomor lain', () => {
    expect(noJadiSample({ no_bal: 'TS1', kode_bal_pembeli: 'J-1' })).toBe('J-1');
    expect(noJadiSample({ no_bal: 'TS1', kode_bal_pembeli: '' })).toBe('TS1');
  });

  it('nilai harga jual = harga deal bila ada, selain itu harga tawaran', () => {
    expect(nilaiHargaJualSample({ harga_tawaran_kg: 45000, harga_deal_kg: 46000 })).toBe(46000);
    expect(nilaiHargaJualSample({ harga_tawaran_kg: 45000 })).toBe(45000);
  });
});

describe('susunSheetSuratSample', () => {
  const batch = buatBatch('1', 'sample', {
    permintaan_buyer: 'Grade 57 kering',
    items: [
      buatItemSample('B1', { kode_bal_pembeli: 'J-01', kode_harga_jual: 'HJ-45', harga_tawaran_kg: 45000, harga_deal_kg: 46000 }),
      buatItemSample('B2', { kode_bal_pembeli: '', kode_harga_jual: 'HJ-50', harga_tawaran_kg: 50000, berat_bruto_kg: 40 }),
    ],
  });

  it('bawaan: No Asal & No Jadi, bruto, kode harga jual; tanpa nilai rupiah maupun data petani', () => {
    const sheet = susunSheetSuratSample(batch);
    expect(sheet.columns.map((c) => c.header)).toEqual(['No', 'No Asal', 'No Jadi', 'Bruto (Kg)', 'Kode Harga Jual']);
    expect(sheet.rows).toEqual([
      [1, 'B1', 'J-01', 44, 'HJ-45'],
      [2, 'B2', 'B2', 40, 'HJ-50'],
    ]);
    expect(JSON.stringify(sheet)).not.toMatch(/45000|46000|50000|petani/i);
  });

  it('No Jadi saja dengan nilai harga jual saja; bruto tetap ada', () => {
    const sheet = susunSheetSuratSample(batch, { noBal: 'jadi', harga: 'nilai' });
    expect(sheet.columns.map((c) => c.header)).toEqual(['No', 'No Bal', 'Bruto (Kg)', 'Harga Jual (Rp/kg)']);
    expect(sheet.rows).toEqual([
      [1, 'J-01', 44, 46000],
      [2, 'B2', 40, 50000],
    ]);
  });

  it('kode dan nilai harga jual sekaligus; baris total sejajar kolom', () => {
    const sheet = susunSheetSuratSample(batch, { noBal: 'asal_jadi', harga: 'keduanya' });
    expect(sheet.columns.map((c) => c.header)).toEqual(['No', 'No Asal', 'No Jadi', 'Bruto (Kg)', 'Kode Harga Jual', 'Harga Jual (Rp/kg)']);
    expect(sheet.totalRow).toEqual(['TOTAL (2 bal sample)', '', '', 84, '', '']);
    expect(sheet.info?.[0]).toContain('SAMPLE-1');
    expect(sheet.info?.some((baris) => baris.includes('Grade 57 kering'))).toBe(true);
  });
});
