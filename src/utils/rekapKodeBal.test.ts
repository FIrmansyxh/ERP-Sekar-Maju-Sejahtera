import { describe, expect, it } from 'vitest';
import { BalRekapInput, rataHargaRekap, rekapPerKode, totalRekapKode } from './rekapKodeBal';

const bal = (no: string, extra: Partial<BalRekapInput> = {}): BalRekapInput => ({ no_bal: no, ...extra });

describe('rekapPerKode: semua bal dihitung, termasuk yang baru disortir', () => {
  const rows: BalRekapInput[] = [
    // sudah disortir (ada No Bal dan harga), belum ditimbang dan belum dibayar
    bal('HF0001', { berat_kg: 0, harga_per_kg: 50000, status_bayar: 'belum_lunas' }),
    bal('HF0002', { berat_kg: 0, harga_per_kg: 50000, status_bayar: 'belum_lunas' }),
    // ditimbang, kupon belum dibayar
    bal('HF0003', { berat_kg: 40, berat_bruto_kg: 44, harga_per_kg: 50000, status_bayar: 'belum_lunas' }),
    // ditimbang dan lunas
    bal('HF0004', { berat_kg: 30, berat_bruto_kg: 33, harga_per_kg: 60000, status_bayar: 'lunas' }),
    bal('SB0001', { berat_kg: 20, berat_bruto_kg: 22, harga_per_kg: 100000, status_bayar: 'lunas' }),
  ];

  it('jumlah bal per kode mencakup yang belum ditimbang dan belum dibayar', () => {
    const hf = rekapPerKode(rows).find((r) => r.kode === 'HF')!;
    expect(hf).toMatchObject({ total: 4, belumTimbang: 2, kredit: 1, lunas: 1 });
  });

  it('berat dan nilai hanya dari bal yang sudah ditimbang; lunas dan kredit dipisah', () => {
    const hf = rekapPerKode(rows).find((r) => r.kode === 'HF')!;
    expect(hf.netto).toBe(70);
    expect(hf.bruto).toBe(77);
    expect(hf.nilaiLunas).toBe(30 * 60000);
    expect(hf.nilaiKredit).toBe(40 * 50000);
  });

  it('berat lunas dan rata-rata harga hanya dari bal ditimbang yang lunas; nol bila belum ada', () => {
    const hf = rekapPerKode(rows).find((r) => r.kode === 'HF')!;
    expect(hf.nettoLunas).toBe(30);
    expect(hf.brutoLunas).toBe(33);
    expect(rataHargaRekap(hf)).toBe(60000);
    expect(rataHargaRekap({ nettoLunas: 0, nilaiLunas: 0 })).toBe(0);
  });

  it('total menjumlahkan semua kode', () => {
    const total = totalRekapKode(rekapPerKode(rows));
    expect(total).toMatchObject({ total: 5, belumTimbang: 2, kredit: 1, lunas: 2, netto: 90, bruto: 99 });
    expect(total.nilaiLunas).toBe(30 * 60000 + 20 * 100000);
    expect(total.nilaiKredit).toBe(40 * 50000);
  });
});
