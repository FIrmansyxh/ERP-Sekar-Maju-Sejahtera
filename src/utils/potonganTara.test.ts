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
  it('SB dipotong 2 kg rata', () => {
    expect(hitungPotonganTaraKg(35, false, 'SB0001')).toBe(2);
  });

  it('TS: 30-49 kg = 4, 50-59 kg = 5', () => {
    expect(hitungPotonganTaraKg(34, false, 'TS113')).toBe(4);
    expect(hitungPotonganTaraKg(49.9, false, 'TS113')).toBe(4);
    expect(hitungPotonganTaraKg(55, false, 'TS113')).toBe(5);
    expect(hitungPotonganTaraKg(61, false, 'TS113')).toBe(6);
  });

  it('HF dan kode lain: 49 ke bawah = 3, 50-59 = 5, 60 ke atas = 6', () => {
    expect(hitungPotonganTaraKg(40, false, 'HF1')).toBe(3);
    expect(hitungPotonganTaraKg(50, false, 'HF1')).toBe(5);
    expect(hitungPotonganTaraKg(60, false, 'HF1')).toBe(6);
  });

  it('bal belum ditimbang tidak dipotong (kecuali SB)', () => {
    expect(hitungPotonganTaraKg(0, false, 'HF1')).toBe(0);
  });

  // Teks di layar dan komentar kode sama-sama menyebut "60 kg ke atas = 6 kg", tetapi TS/T pada tepat 60,0 kg
  // kini menghasilkan 5 kg (batas memakai ">"), sedangkan HF memakai ">=". Perlu konfirmasi pemilik sebelum diubah.
  it.todo('TS/T pada tepat 60,0 kg: 5 kg (perilaku sekarang) atau 6 kg (sesuai teks "60 kg ke atas")?');
});
