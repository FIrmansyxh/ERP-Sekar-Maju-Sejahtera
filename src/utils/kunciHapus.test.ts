import { describe, expect, it } from 'vitest';
import { isBalTerkirim, isPenjualanMasuk, isSuratJalanTerkunci, pesanSuratJalanTerkunci } from './kunciHapus';

describe('aturan Surat Jalan: dapat diubah selama belum Selesai', () => {
  it.each(['dimuat', 'dikirim', 'dalam_perjalanan', 'diterima'] as const)(
    'status %s masih boleh dihapus dan belum jadi penjualan',
    (status) => {
      expect(isSuratJalanTerkunci({ status })).toBe(false);
      expect(isPenjualanMasuk({ status })).toBe(false);
    }
  );

  it('status selesai terkunci dan baru dihitung sebagai penjualan', () => {
    expect(isSuratJalanTerkunci({ status: 'selesai' })).toBe(true);
    expect(isPenjualanMasuk({ status: 'selesai' })).toBe(true);
  });

  it('pesan penolakan menyebut nomor Surat Jalan', () => {
    expect(pesanSuratJalanTerkunci({ no_surat_jalan: 'SJ-1' })).toContain('SJ-1');
  });
});

describe('isBalTerkirim', () => {
  it('bal keluar atau tercatat di Surat Jalan dianggap terkirim', () => {
    expect(isBalTerkirim({ barang_id: 'A', status_stok: 'keluar' })).toBe(true);
    expect(isBalTerkirim({ barang_id: 'A', status_stok: 'di_gudang' }, new Set(['A']))).toBe(true);
    expect(isBalTerkirim({ barang_id: 'A', status_stok: 'di_gudang' })).toBe(false);
  });
});
