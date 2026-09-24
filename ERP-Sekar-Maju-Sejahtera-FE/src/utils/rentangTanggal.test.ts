import { describe, expect, it } from 'vitest';
import { presetAktif, rentangPreset } from './rentangTanggal';

// Rabu, 16 September 2026
const SEKARANG = new Date(2026, 8, 16, 14, 30);

describe('rentangPreset: pilihan cepat rentang waktu', () => {
  it('hari ini dan kemarin', () => {
    expect(rentangPreset('hari_ini', SEKARANG)).toEqual({ start: '2026-09-16', end: '2026-09-16' });
    expect(rentangPreset('kemarin', SEKARANG)).toEqual({ start: '2026-09-15', end: '2026-09-15' });
  });

  it('seminggu = 7 hari terakhir termasuk hari ini', () => {
    expect(rentangPreset('tujuh_hari', SEKARANG)).toEqual({ start: '2026-09-10', end: '2026-09-16' });
  });

  it('sebulan = dari tanggal 1 bulan ini, setahun = dari 1 Januari tahun ini', () => {
    expect(rentangPreset('bulan_ini', SEKARANG)).toEqual({ start: '2026-09-01', end: '2026-09-16' });
    expect(rentangPreset('tahun_ini', SEKARANG)).toEqual({ start: '2026-01-01', end: '2026-09-16' });
  });

  it('sepanjang masa tanpa batas tanggal', () => {
    expect(rentangPreset('semua', SEKARANG)).toEqual({ start: '', end: '' });
  });

  it('kemarin menyeberang awal bulan dan tahun', () => {
    expect(rentangPreset('kemarin', new Date(2026, 0, 1))).toEqual({ start: '2025-12-31', end: '2025-12-31' });
  });

  it('presetAktif mengenali setiap pilihan, termasuk tahun ini', () => {
    for (const p of ['hari_ini', 'kemarin', 'tujuh_hari', 'bulan_ini', 'tahun_ini'] as const) {
      const r = rentangPreset(p, SEKARANG);
      expect(presetAktif(r.start, r.end, SEKARANG)).toBe(p);
    }
    expect(presetAktif('2026-03-01', '2026-03-05', SEKARANG)).toBeNull();
  });
});
