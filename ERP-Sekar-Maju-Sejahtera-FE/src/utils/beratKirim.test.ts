import { describe, expect, it } from 'vitest';
import { beratBrutoBal, beratBrutoItemSample, beratKirimBal, nettoJualBal, nilaiBalDO } from './beratKirim';

describe('beratBrutoBal', () => {
  it('memakai bruto tercatat bila ada', () => {
    expect(beratBrutoBal({ berat_bruto_kg: 44, berat_kg: 40, potongan_tara_kg: 4 })).toBe(44);
  });
  it('data lama tanpa bruto = netto + tara', () => {
    expect(beratBrutoBal({ berat_kg: 40, potongan_tara_kg: 4 })).toBe(44);
  });
  it('bal kosong atau belum ditimbang = 0', () => {
    expect(beratBrutoBal(null)).toBe(0);
    expect(beratBrutoBal({ berat_kg: 0 })).toBe(0);
  });
});

describe('beratBrutoItemSample', () => {
  it('sama seperti bal: bruto lebih dulu, lalu netto + tara', () => {
    expect(beratBrutoItemSample({ berat_bruto_kg: 30 })).toBe(30);
    expect(beratBrutoItemSample({ berat_bal_kg: 26, potongan_tara_kg: 4 })).toBe(30);
  });
});

describe('berat dan nilai Surat Jalan', () => {
  const bal = { berat_bruto_kg: 50, berat_kg: 45, potongan_tara_kg: 5 };

  it('bruto kirim mengutamakan bruto timbang ulang', () => {
    expect(beratKirimBal({ berat_kirim_map: { B1: 47 } }, 'B1', bal)).toBe(47);
    expect(beratKirimBal({}, 'B1', bal)).toBe(50);
  });

  it('netto jual mengutamakan netto tersimpan, lalu bruto kirim (DO lama)', () => {
    expect(nettoJualBal({ netto_jual_map: { B1: 43 }, berat_kirim_map: { B1: 47 } }, 'B1', bal)).toBe(43);
    expect(nettoJualBal({ berat_kirim_map: { B1: 47 } }, 'B1', bal)).toBe(47);
  });

  it('nilai = netto jual x harga, dibulatkan', () => {
    expect(nilaiBalDO({ netto_jual_map: { B1: 45.5 } }, 'B1', bal, 30000)).toBe(1365000);
  });
});
