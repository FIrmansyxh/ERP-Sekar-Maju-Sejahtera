import { describe, expect, it } from 'vitest';
import { buatBal, buatKupon } from '../test/fixtures';
import { lengkapiBalDariKupon, pulihkanStatusSampleLama, resolveStatusStok } from './kuponSortir';
import { TransaksiItemBal } from '../types';

const item = (no: string, extra: Partial<TransaksiItemBal> = {}) =>
  ({ item_id: `I-${no}`, no_bal: no, kode_grade: '57', harga_per_kg: 45000, berat_kg: 0, ...extra }) as TransaksiItemBal;

describe('lengkapiBalDariKupon: bal yang sudah disortir ikut terkumpul walau belum ditimbang dan belum dibayar', () => {
  it('bal kupon yang belum ada di daftar bal ditambahkan sebagai Proses Sortir dengan harganya', () => {
    const kupon = buatKupon('1', { items: [item('HF0001'), item('HF0002', { berat_kg: 40, berat_bruto_kg: 44 })] });
    const hasil = lengkapiBalDariKupon([], [kupon]);

    expect(hasil.map((b) => [b.no_bal, b.status_stok])).toEqual([
      ['HF0001', 'proses_sortir'],
      ['HF0002', 'di_gudang'],
    ]);
    expect(hasil[0]).toMatchObject({ kode_grade: '57', harga_per_kg: 45000, transaksi_pembelian_id: kupon.transaksi_id });
    expect(hasil[0].barang_id).toBeTruthy();
  });

  it('bal yang sudah ada (dicocokkan lewat No Bal) tidak dobel, dan daftar aslinya dipertahankan', () => {
    const kupon = buatKupon('1', { items: [item('HF0001'), item('HF0002')] });
    const ada = [buatBal('B-LAIN', { no_bal: 'hf0001', status_stok: 'di_gudang' })];
    const hasil = lengkapiBalDariKupon(ada, [kupon]);

    expect(hasil.map((b) => b.no_bal)).toEqual(['HF0002', 'hf0001']);
    expect(hasil.find((b) => b.no_bal === 'hf0001')?.status_stok).toBe('di_gudang');
  });

  it('memakai barang_id milik item bila ada, dan tidak membuat bal baru bila semuanya sudah terdaftar', () => {
    const kupon = buatKupon('1', { items: [item('HF0001', { barang_id: 'BAL-X-01' })] });
    expect(lengkapiBalDariKupon([], [kupon])[0].barang_id).toBe('BAL-X-01');

    const semua = [buatBal('BAL-X-01', { no_bal: 'HF0001' })];
    expect(lengkapiBalDariKupon(semua, [kupon])).toBe(semua);
  });

  it('item tanpa No Bal dilewati', () => {
    const kupon = buatKupon('1', { items: [item('')] });
    expect(lengkapiBalDariKupon([], [kupon])).toEqual([]);
  });
});

describe('Reclass / Batch Sample tidak mengubah status bal', () => {
  it('status stok hanya mengikuti tahap timbang; bal yang sudah keluar tidak diubah', () => {
    expect(resolveStatusStok(undefined, 40)).toBe('di_gudang');
    expect(resolveStatusStok('di_gudang', 0)).toBe('proses_sortir');
    expect(resolveStatusStok('keluar', 40)).toBe('keluar');
  });

  it('status terkirim_sample dari data lama dipulihkan mengikuti tahap timbang; status lain dibiarkan', () => {
    expect(pulihkanStatusSampleLama(buatBal('B1', { status_stok: 'terkirim_sample', berat_kg: 40 })).status_stok).toBe('di_gudang');
    expect(pulihkanStatusSampleLama(buatBal('B2', { status_stok: 'terkirim_sample', berat_kg: 0 })).status_stok).toBe('proses_sortir');
    const keluar = buatBal('B3', { status_stok: 'keluar' });
    expect(pulihkanStatusSampleLama(keluar)).toBe(keluar);
  });
});
