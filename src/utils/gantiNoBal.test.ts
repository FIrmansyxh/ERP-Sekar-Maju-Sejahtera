import { afterEach, describe, expect, it } from 'vitest';
import { buatBal, buatBatch, buatItemSample, buatKupon, buatSuratJalan } from '../test/fixtures';
import type { RiwayatNoBal, TransaksiItemBal, TransaksiPembelian } from '../types';
import {
  alasanNoBalBaruDitolak,
  cariBalKoreksi,
  daftarBalKoreksi,
  noBalAwalDari,
  rantaiNoBal,
  siapkanGantiNoBal,
  SumberKoreksi,
  terapkanGantiNoBal,
} from './gantiNoBal';
import { buildBarangDariItem, lengkapiBalDariKupon, mergeKuponParalel } from './kuponSortir';
import { aturRiwayatNoBal, noBalTerkini, penggantiNoBal } from './noBalPensiun';

const item = (no: string, extra: Partial<TransaksiItemBal> = {}) =>
  ({
    item_id: `TRX-1-BAL-${no}`,
    no_bal: no,
    kode_grade: '57',
    harga_per_kg: 45000,
    berat_kg: 0,
    potongan: 10000,
    ...extra,
  }) as TransaksiItemBal;

const ditimbang = (no: string, extra: Partial<TransaksiItemBal> = {}) =>
  item(no, { berat_bruto_kg: 55, potongan_tara_kg: 5, berat_kg: 50, total_kotor: 50 * 45000, subtotal_bersih: 50 * 45000 - 10000, ...extra });

const sumber = (tx: TransaksiPembelian[], extra: Partial<SumberKoreksi> = {}): SumberKoreksi => ({
  transaksiList: tx,
  barangList: [],
  pengirimanList: [],
  batchSampleList: [],
  riwayat: [],
  ...extra,
});

const riwayat = (lama: string, baru: string, pada: string, extra: Partial<RiwayatNoBal> = {}): RiwayatNoBal => ({
  riwayat_id: `R-${lama}-${baru}`,
  transaksi_id: 'TRX-1',
  item_id: `TRX-1-BAL-${lama}`,
  no_bal_lama: lama,
  no_bal_baru: baru,
  tahap: 'sortir',
  ubah_nota: true,
  alasan: 'salah tulis',
  diganti_oleh: 'Admin',
  diganti_pada: pada,
  ...extra,
});

afterEach(() => aturRiwayatNoBal([]));

describe('Koreksi No Bal: kupon belum lunas', () => {
  it('kupon & nota tetap nomor saat disortir; bal gudang dan Batch Sample memakai nomor baru', () => {
    const tx = buatKupon('TRX-1', { items: [item('HF01')], status_pembayaran: 'belum_lunas' });
    const barang = buatBal('BAL-1-01', { no_bal: 'HF01', transaksi_pembelian_id: 'TRX-1' });
    const batch = buatBatch('BT1', 'sample', { items: [buatItemSample('BAL-1-01', { no_bal: 'HF01', kode_bal_pembeli: 'HF01' })] });
    const src = sumber([tx], { barangList: [barang], batchSampleList: [batch] });

    const bal = cariBalKoreksi('hf-01', src)!;
    expect(bal.tahap).toBe('sortir');
    expect(bal.alasanTerkunci).toBeNull();

    const rencana = siapkanGantiNoBal(bal, 'hf02', 'salah tulis', 'Admin');
    expect(rencana.riwayat).toMatchObject({ no_bal_lama: 'HF01', no_bal_baru: 'HF02', ubah_nota: false, barang_id: 'BAL-1-01' });

    const hasil = terapkanGantiNoBal({ barangList: [barang], batchSampleList: [batch] }, rencana);
    expect(hasil.barangList[0].no_bal).toBe('HF02');
    expect(hasil.batchSampleList[0].items[0].no_bal).toBe('HF02');
    // No Jadi yang otomatis sama dengan No Bal ikut berganti; No Jadi khusus pembeli tetap
    expect(hasil.batchSampleList[0].items[0].kode_bal_pembeli).toBe('HF02');
    const batchKhusus = buatBatch('BT2', 'sample', { items: [buatItemSample('BAL-1-01', { no_bal: 'HF01', kode_bal_pembeli: 'JD-7' })] });
    const khusus = terapkanGantiNoBal({ batchSampleList: [batchKhusus] }, rencana);
    expect(khusus.batchSampleList[0].items[0]).toMatchObject({ no_bal: 'HF02', kode_bal_pembeli: 'JD-7' });

    // Aman diulang (dipakai untuk menimpa data server yang belum memuat penggantian)
    const lagi = terapkanGantiNoBal(hasil, rencana);
    expect(lagi.barangList).toBe(hasil.barangList);

    // Nomor sekarang, nota, dan awal
    const setelah = cariBalKoreksi('HF01', sumber([tx], { barangList: hasil.barangList, riwayat: [rencana.riwayat] }))!;
    expect(setelah).toMatchObject({ noBalSekarang: 'HF02', noBalNota: 'HF01', noBalAwal: 'HF01' });
  });

  it('bal gudang yang dibentuk ulang dari kupon (Timbangan, Kasir, muat ulang) memakai nomor terbaru; tara tetap', () => {
    const tx = buatKupon('TRX-1', { items: [ditimbang('HF01', { barang_id: 'BAL-1-01' })], status_pembayaran: 'belum_lunas' });
    aturRiwayatNoBal([riwayat('HF01', 'SB01', '2026-09-30T01:00:00Z', { ubah_nota: false })]);
    const dariKupon = buildBarangDariItem(tx, tx.items![0]);
    expect(dariKupon).toMatchObject({ no_bal: 'SB01', potongan_tara_kg: 5, berat_kg: 50 });
    expect(tx.items![0].no_bal).toBe('HF01');
    expect(lengkapiBalDariKupon([], [tx]).map((b) => b.no_bal)).toEqual(['SB01']);
    expect(noBalTerkini('HF01')).toBe('SB01');
    expect(noBalTerkini('TS9')).toBe('TS9');
  });
});

describe('Koreksi No Bal: kupon lunas', () => {
  it('nota tetap nomor lama; bal di gudang memakai nomor baru; rekap ikut nomor terakhir', () => {
    const tx = buatKupon('TRX-1', { items: [ditimbang('SB01', { barang_id: 'BAL-1-01' })], status_pembayaran: 'lunas' });
    const barang = buatBal('BAL-1-01', { no_bal: 'SB01', transaksi_pembelian_id: 'TRX-1', berat_kg: 50 });
    const bal = cariBalKoreksi('SB01', sumber([tx], { barangList: [barang] }))!;
    expect(bal.tahap).toBe('lunas');

    const rencana = siapkanGantiNoBal(bal, 'HF77', 'label tertukar', 'Admin');
    expect(rencana.riwayat.ubah_nota).toBe(false);

    const hasil = terapkanGantiNoBal({ barangList: [barang] }, rencana);
    expect(hasil.barangList[0]).toMatchObject({ no_bal: 'HF77', berat_kg: 50 });

    const setelah = cariBalKoreksi('SB01', sumber([tx], { barangList: hasil.barangList, riwayat: [rencana.riwayat] }))!;
    expect(setelah).toMatchObject({ noBalSekarang: 'HF77', noBalNota: 'SB01', noBalAwal: 'SB01' });
  });
});

describe('Koreksi No Bal: kunci Surat Jalan', () => {
  const tx = buatKupon('TRX-1', { items: [ditimbang('SB01', { barang_id: 'B1' })], status_pembayaran: 'lunas' });
  const barang = buatBal('B1', { no_bal: 'SB01', transaksi_pembelian_id: 'TRX-1', status_stok: 'keluar' });

  it('Surat Jalan masih Dikirim: boleh diganti (bisa ditolak di tempat)', () => {
    const bal = cariBalKoreksi('SB01', sumber([tx], { barangList: [barang], pengirimanList: [buatSuratJalan('SJ1', 'dikirim')] }))!;
    expect(bal.tahap).toBe('surat_jalan');
    expect(bal.alasanTerkunci).toBeNull();
  });

  it('Surat Jalan Selesai: terkunci', () => {
    const bal = cariBalKoreksi('SB01', sumber([tx], { barangList: [barang], pengirimanList: [buatSuratJalan('SJ1', 'selesai')] }))!;
    expect(bal.alasanTerkunci).toMatch(/Selesai/);
  });
});

describe('Koreksi No Bal: nomor tidak boleh dipakai dua kali', () => {
  it('menolak nomor yang dipakai bal lain, nomor lama di riwayat, dan nomor yang sama', () => {
    const tx = buatKupon('TRX-1', { items: [item('HF02'), item('HF03')], status_pembayaran: 'belum_lunas' });
    const src = sumber([tx], { riwayat: [riwayat('HF01', 'HF02', '2026-09-30T01:00:00Z')] });
    const bal = cariBalKoreksi('HF02', src)!;

    expect(alasanNoBalBaruDitolak('HF02', bal, src)).toMatch(/sama/);
    expect(alasanNoBalBaruDitolak('HF03', bal, src)).toMatch(/sudah pernah dipakai/);
    expect(alasanNoBalBaruDitolak('hf-01', bal, src)).toMatch(/sudah pernah dipakai/);
    expect(alasanNoBalBaruDitolak('', bal, src)).toMatch(/wajib/);
    expect(alasanNoBalBaruDitolak('HF04', bal, src)).toBeNull();
  });

  it('nomor lama ditemukan dan mengikuti rantai penggantian', () => {
    const r = [riwayat('SB01', 'HF01', '2026-09-30T01:00:00Z'), riwayat('HF01', 'SB09', '2026-09-30T02:00:00Z')];
    expect(rantaiNoBal('HF01', r)).toEqual(['SB01', 'HF01', 'SB09']);
    expect(noBalAwalDari('SB09', r)).toBe('SB01');

    const tx = buatKupon('TRX-1', { items: [item('SB09')], status_pembayaran: 'belum_lunas' });
    const bal = cariBalKoreksi('SB01', sumber([tx], { riwayat: r }))!;
    expect(bal).toMatchObject({ noBalSekarang: 'SB09', noBalAwal: 'SB01' });
    expect(daftarBalKoreksi(sumber([tx], { riwayat: r }))).toHaveLength(1);
  });
});

describe('nomor lama tidak terbawa balik', () => {
  it('Sortir mengenali nomor yang sudah diganti', () => {
    aturRiwayatNoBal([riwayat('HF01', 'HF02', '2026-09-30T01:00:00Z')]);
    expect(penggantiNoBal('hf01')).toBe('HF02');
    expect(penggantiNoBal('HF02')).toBeNull();
  });

  it('salinan kupon basi bernomor lama kalah dari server yang sudah memakai nomor baru', () => {
    aturRiwayatNoBal([riwayat('HF01', 'HF02', '2026-09-30T01:00:00Z')]);
    const basi = buatKupon('TRX-1', { items: [item('HF01', { item_id: 'TRX-1-BAL-01', diubah_lokal_pada: Date.now() })] });
    const server = buatKupon('TRX-1', { items: [item('HF02', { item_id: 'TRX-1-BAL-01' })] });
    const gabung = mergeKuponParalel(basi, server, { incomingDariServer: true });
    expect((gabung.items || []).map((i) => i.no_bal)).toEqual(['HF02']);
  });
});
