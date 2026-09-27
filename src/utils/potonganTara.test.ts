import { describe, expect, it } from 'vitest';
import { deteksiKodeAturanTara, hitungPotonganTaraKg, normalizeKg } from './formatters';

describe('normalizeKg', () => {
  it('membulatkan ke 3 desimal dan menganggap kosong sebagai 0', () => {
    expect(normalizeKg(1.23456)).toBe(1.235);
    expect(normalizeKg(undefined)).toBe(0);
    expect(normalizeKg(null)).toBe(0);
    expect(normalizeKg(Number.NaN)).toBe(0);
  });
});

describe('deteksiKodeAturanTara', () => {
  it('mengenali kode dari nomor bal atau grade', () => {
    expect(deteksiKodeAturanTara('SB0001')).toBe('SB');
    expect(deteksiKodeAturanTara('TS134')).toBe('TS');
    expect(deteksiKodeAturanTara('HF12')).toBe('HF');
    expect(deteksiKodeAturanTara('T103')).toBe('T');
    expect(deteksiKodeAturanTara('X1', '57')).toBe('DEFAULT');
  });
});

describe('hitungPotonganTaraKg', () => {
  const mockMaster = [
    { kode_awalan_bal: 'SB', batas_bawah_kg: 0, batas_atas_kg: null, potongan_kg: 2 },
    { kode_awalan_bal: 'TS', batas_bawah_kg: 0, batas_atas_kg: 49.9, potongan_kg: 4 },
    { kode_awalan_bal: 'TS', batas_bawah_kg: 50, batas_atas_kg: 59.9, potongan_kg: 5 },
    { kode_awalan_bal: 'TS', batas_bawah_kg: 60, batas_atas_kg: null, potongan_kg: 6 },
    { kode_awalan_bal: 'HF', batas_bawah_kg: 0, batas_atas_kg: 49.9, potongan_kg: 3 },
    { kode_awalan_bal: 'HF', batas_bawah_kg: 50, batas_atas_kg: 59.9, potongan_kg: 5 },
    { kode_awalan_bal: 'HF', batas_bawah_kg: 60, batas_atas_kg: null, potongan_kg: 6 },
  ];

  it('mengembalikan 0 jika tidak ada data master (fallback dihapus)', () => {
    expect(hitungPotonganTaraKg(35, false, 'SB0001')).toBe(0);
    expect(hitungPotonganTaraKg(50, false, 'TS113')).toBe(0);
  });

  it('SB dipotong 2 kg rata (berdasarkan master)', () => {
    expect(hitungPotonganTaraKg(35, false, 'SB0001', undefined, mockMaster)).toBe(2);
  });

  it('TS: 30-49 kg = 4, 50-59 kg = 5 (berdasarkan master)', () => {
    expect(hitungPotonganTaraKg(34, false, 'TS113', undefined, mockMaster)).toBe(4);
    expect(hitungPotonganTaraKg(49.9, false, 'TS113', undefined, mockMaster)).toBe(4);
    expect(hitungPotonganTaraKg(55, false, 'TS113', undefined, mockMaster)).toBe(5);
    expect(hitungPotonganTaraKg(61, false, 'TS113', undefined, mockMaster)).toBe(6);
  });

  it('HF dan kode lain: 49 ke bawah = 3, 50-59 = 5, 60 ke atas = 6 (berdasarkan master)', () => {
    expect(hitungPotonganTaraKg(40, false, 'HF1', undefined, mockMaster)).toBe(3);
    expect(hitungPotonganTaraKg(50, false, 'HF1', undefined, mockMaster)).toBe(5);
    expect(hitungPotonganTaraKg(60, false, 'HF1', undefined, mockMaster)).toBe(6);
  });

  it('bal belum ditimbang tidak dipotong', () => {
    expect(hitungPotonganTaraKg(0, false, 'HF1', undefined, mockMaster)).toBe(0);
  });
});
