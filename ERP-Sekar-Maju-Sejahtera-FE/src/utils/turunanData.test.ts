import { describe, expect, it } from 'vitest';
import { buatBal, buatItemBal, buatKupon, buatSuratJalan } from '../test/fixtures';
import { hitungStatistikPetani, turunkanDaftarBal } from './turunanData';
import type { Petani } from '../types';

const petani = (id: string): Petani => ({ petani_id: id, nama_petani: id, no_hp: '', alamat: '', status_aktif: true });

describe('hitungStatistikPetani: dihitung dari kupon server, sama di semua komputer', () => {
  it('jumlah bal, netto, kunjungan terakhir, dan grade terbanyak', () => {
    const kupon = [
      buatKupon('T1', { petani_id: 'P1', tanggal_transaksi: '2026-09-20', items: [buatItemBal('A1', { berat_kg: 40, kode_grade: '45' }), buatItemBal('A2', { berat_kg: 35.5, kode_grade: '45' })] }),
      buatKupon('T2', { petani_id: 'P1', tanggal_transaksi: '2026-09-22', items: [buatItemBal('A3', { berat_kg: 20, kode_grade: '50' })] }),
    ];
    const [p1, p2] = hitungStatistikPetani([petani('P1'), petani('P2')], kupon);
    expect(p1.statistik).toEqual({ total_setoran_bal: 3, total_berat_kg: 95.5, kunjungan_terakhir: '2026-09-22', grade_dominan: 'Grade 45' });
    expect(p2.statistik).toEqual({ total_setoran_bal: 0, total_berat_kg: 0, kunjungan_terakhir: 'Belum Ada', grade_dominan: '-' });
  });

  it('tanpa perubahan mengembalikan daftar yang sama', () => {
    const daftar = hitungStatistikPetani([petani('P1')], []);
    expect(hitungStatistikPetani(daftar, [])).toBe(daftar);
  });
});

describe('turunkanDaftarBal', () => {
  it('bal kupon yang dihapus tidak tampil walau stoknya masih di layar', () => {
    const stok = [buatBal('BAL-1', { transaksi_pembelian_id: 'T-HAPUS' }), buatBal('BAL-2', { transaksi_pembelian_id: 'T1' })];
    const hasil = turunkanDaftarBal(stok, [buatKupon('T1', { items: [] })], []);
    expect(hasil.map((x) => x.barang_id)).toEqual(['BAL-2']);
  });

  it('bal kupon yang belum dibayar ikut tampil; penanda Surat Jalan diambil dari Surat Jalan di server', () => {
    const hasil = turunkanDaftarBal(
      [buatBal('B1'), buatBal('B2')],
      [buatKupon('T1', { items: [buatItemBal('X9', { berat_kg: 0 })] })],
      [buatSuratJalan('SJ1', 'dimuat', { barang_ids: ['B1'] })]
    );
    expect(hasil.find((x) => x.no_bal === 'X9')?.status_stok).toBe('proses_sortir');
    expect(hasil.find((x) => x.barang_id === 'B1')?.pengiriman_id).toBe('SJ1');
    expect(hasil.find((x) => x.barang_id === 'B2')?.pengiriman_id).toBeUndefined();
  });
});
