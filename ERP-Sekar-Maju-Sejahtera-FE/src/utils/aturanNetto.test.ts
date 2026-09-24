import { describe, expect, it } from 'vitest';
import { AturanNettoBaris, bacaAturanNetto, hitungNettoJual, labelRentang } from './aturanNetto';

const baris = (min: string, max: string, potongan: string, id = 'x'): AturanNettoBaris => ({ id, min, max, potongan });

describe('bacaAturanNetto', () => {
  it('membaca aturan GG: 1-49 potongan 4, lalu 50 ke atas potongan 5', () => {
    const hasil = bacaAturanNetto([baris('50', '', '5'), baris('1', '49', '4')]);
    expect(hasil.masalah).toEqual([]);
    expect(hasil.aturan).toEqual([
      { min: 1, max: 49, potongan: 4 },
      { min: 50, max: null, potongan: 5 },
    ]);
  });

  it('menerima koma sebagai pemisah desimal', () => {
    const hasil = bacaAturanNetto([baris('1', '', '2,5')]);
    expect(hasil.aturan[0].potongan).toBe(2.5);
  });

  it('melaporkan baris kosong, terbalik, dan tanpa potongan', () => {
    expect(bacaAturanNetto([baris('', '', '')]).masalah[0]).toMatch(/masih kosong/);
    expect(bacaAturanNetto([baris('10', '5', '2')]).masalah[0]).toMatch(/lebih kecil/);
    expect(bacaAturanNetto([baris('1', '49', '')]).masalah[0]).toMatch(/potongan netto wajib/);
  });

  it('menolak rentang yang tumpang tindih', () => {
    const hasil = bacaAturanNetto([baris('1', '50', '4'), baris('50', '', '5')]);
    expect(hasil.masalah.some((m) => m.includes('tumpang tindih'))).toBe(true);
  });

  it('rentang bilangan bulat yang bersambung tidak dianggap tumpang tindih', () => {
    expect(bacaAturanNetto([baris('1', '49', '4'), baris('50', '', '5')]).masalah).toEqual([]);
  });
});

describe('hitungNettoJual', () => {
  const aturanGG = [
    { min: 1, max: 49, potongan: 4 },
    { min: 50, max: null, potongan: 5 },
  ];

  it('tanpa aturan, netto sama dengan bruto', () => {
    expect(hitungNettoJual(45, [])).toEqual({ bruto: 45, potongan: 0, netto: 45, tercakup: true });
  });

  it('rentang 1-49 mencakup sampai 49,9 kg', () => {
    expect(hitungNettoJual(49.9, aturanGG)).toMatchObject({ potongan: 4, netto: 45.9, tercakup: true });
  });

  it('50 kg tepat masuk rentang ke atas', () => {
    expect(hitungNettoJual(50, aturanGG)).toMatchObject({ potongan: 5, netto: 45 });
  });

  it('berat di luar semua rentang ditandai tidak tercakup', () => {
    expect(hitungNettoJual(0.5, aturanGG)).toMatchObject({ tercakup: false, potongan: 0 });
  });

  it('netto tidak pernah negatif', () => {
    expect(hitungNettoJual(3, [{ min: 1, max: 49, potongan: 4 }]).netto).toBe(0);
  });
});

describe('labelRentang', () => {
  it('menulis rentang tertutup dan terbuka', () => {
    expect(labelRentang({ min: 1, max: 49, potongan: 4 })).toBe('1-49 kg');
    expect(labelRentang({ min: 60, max: null, potongan: 6 })).toBe('60 kg ke atas');
  });
});
