import { describe, expect, it } from 'vitest';
import { cekNomorDokumen, nomorBerikutnya, normalisasiNomor, pesanNomorKembar } from './nomorDokumen';

describe('nomor dokumen', () => {
  it('menormalkan huruf besar dan spasi tepi', () => {
    expect(normalisasiNomor('  sj-pjm0001 ')).toBe('SJ-PJM0001');
  });

  it('menaikkan angka terakhir dengan digit tetap', () => {
    expect(nomorBerikutnya('SAMPLE-PJM0001')).toBe('SAMPLE-PJM0002');
    expect(nomorBerikutnya('SJ-9')).toBe('SJ-10');
    expect(nomorBerikutnya('TANPA-ANGKA')).toBeNull();
  });

  it('menolak nomor kosong dan kembar tanpa membedakan huruf besar/kecil', () => {
    const daftar = ['SJ-PJM0001', 'SJ-PJM0002'];
    expect(cekNomorDokumen('', daftar).kosong).toBe(true);
    expect(cekNomorDokumen('sj-pjm0002', daftar).kembar).toBe(true);
    expect(cekNomorDokumen('SJ-PJM0003', daftar).kembar).toBe(false);
  });

  it('menyarankan nomor setelah nomor terakhir dengan awalan sama', () => {
    const hasil = cekNomorDokumen('SJ-PJM0002', ['SJ-PJM0001', 'SJ-PJM0002', 'SJ-GG0009']);
    expect(hasil.terakhir).toBe('SJ-PJM0002');
    expect(hasil.saran).toBe('SJ-PJM0003');
    expect(pesanNomorKembar('Surat Jalan', 'sj-pjm0002', hasil)).toBe(
      'No. Surat Jalan SJ-PJM0002 sudah dipakai. Nomor terakhir adalah SJ-PJM0002, gunakan SJ-PJM0003.'
    );
  });
});
