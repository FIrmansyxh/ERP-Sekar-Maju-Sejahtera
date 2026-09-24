import { describe, expect, it } from 'vitest';
import { buatItemBal, buatKupon } from '../test/fixtures';
import { terapkanOperasi, turunkanOperasi } from './operasiKupon';

const kupon = (items = [buatItemBal('A1'), buatItemBal('A2')]) =>
  buatKupon('TRX-1', { no_kupon: 'KUP0001', status_tahap: 'proses_sortir', status_pembayaran: 'belum_lunas', items });

describe('terapkanOperasi: tampilan sementara kupon sampai server menjawab', () => {
  it('buat kupon hanya bila belum ada di server', () => {
    const baru = kupon();
    expect(terapkanOperasi(undefined, { jenis: 'buat', kupon: baru })?.items).toHaveLength(2);
    const diServer = kupon([buatItemBal('A1')]);
    expect(terapkanOperasi(diServer, { jenis: 'buat', kupon: baru })).toBe(diServer);
  });

  it('tambah bal tidak menggandakan No. Bal yang sudah ada (tanpa beda huruf besar/kecil)', () => {
    const tx = terapkanOperasi(kupon(), { jenis: 'tambah_bal', bal: [buatItemBal('a2'), buatItemBal('A3')] })!;
    expect(tx.items!.map((i) => i.no_bal)).toEqual(['A1', 'A2', 'A3']);
    expect(tx.total_bal).toBe(3);
  });

  it('timbang satu bal hanya mengubah bal itu dan menghitung ulang nilai', () => {
    const tx = terapkanOperasi(kupon(), {
      jenis: 'ubah_bal',
      ref: { no_bal: 'A2' },
      perubahan: { berat_bruto_kg: 45, potongan_tara_kg: 5, berat_kg: 40 },
      timbang_diubah_pada: 123,
    })!;
    const [a1, a2] = tx.items!;
    expect(a1.berat_kg).toBe(0);
    expect(a2.berat_kg).toBe(40);
    expect(a2.status_timbang).toBe('selesai_timbang');
    expect(a2.total_kotor).toBe(40 * 40000);
    expect(a2.subtotal_bersih).toBe(40 * 40000 - 10000);
    expect(a2.diubah_lokal_pada).toBe(123);
    expect(tx.berat_kg).toBe(40);
  });

  it('ganti tikar memotong 75.000 dan melepasnya menghapus potongan', () => {
    const gt = terapkanOperasi(kupon(), { jenis: 'ubah_bal', ref: { no_bal: 'A1' }, perubahan: { ganti_tikar: true }, gt_diubah_pada: 5 })!;
    expect(gt.items![0].potongan_tikar).toBe(75000);
    expect(gt.items![0].gt_diubah_pada).toBe(5);
    const lepas = terapkanOperasi(gt, { jenis: 'ubah_bal', ref: { no_bal: 'A1' }, perubahan: { ganti_tikar: false } })!;
    expect(lepas.items![0].potongan_tikar).toBe(0);
  });

  it('hapus bal membuang bal itu saja; bal yang tidak ada tidak mengubah apa pun', () => {
    const awal = kupon();
    const tx = terapkanOperasi(awal, { jenis: 'hapus_bal', ref: { item_id: 'ITEM-A1', no_bal: 'A1' } })!;
    expect(tx.items!.map((i) => i.no_bal)).toEqual(['A2']);
    expect(terapkanOperasi(awal, { jenis: 'hapus_bal', ref: { no_bal: 'ZZ' } })).toBe(awal);
  });

  it('selesai sortir: tahap mengikuti bal yang sudah / belum ditimbang', () => {
    const tx = terapkanOperasi(kupon(), { jenis: 'ubah_kupon', perubahan: { status_tahap: 'menunggu_timbang' } })!;
    expect(tx.status_tahap).toBe('menunggu_timbang');
    const semua = kupon([buatItemBal('A1', { berat_kg: 30 })]);
    expect(terapkanOperasi(semua, { jenis: 'ubah_kupon', perubahan: { status_tahap: 'menunggu_timbang' } })!.status_tahap).toBe('lengkap');
  });

  it('bayar menandai lunas', () => {
    const tx = terapkanOperasi(kupon([buatItemBal('A1', { berat_kg: 30 })]), { jenis: 'bayar', metode: 'cash' })!;
    expect(tx.status_pembayaran).toBe('lunas');
    expect(tx.status_tahap).toBe('lengkap');
  });
});

describe('turunkanOperasi: cadangan bila pemanggil tidak menyebut operasinya', () => {
  it('kupon baru menjadi operasi buat', () => {
    expect(turunkanOperasi(undefined, kupon())).toEqual([{ jenis: 'buat', kupon: kupon() }]);
  });

  it('salinan layar yang basi pada bal lain TIDAK ikut terkirim; hanya bal yang cap waktunya lebih baru', () => {
    const lama = kupon([buatItemBal('A1', { ganti_tikar: true, potongan_tikar: 75000, gt_diubah_pada: 10 }), buatItemBal('A2')]);
    // Layar basi: GT bal A1 masih mati, tetapi bal A2 baru ditimbang
    const baru = kupon([
      buatItemBal('A1', { ganti_tikar: false, potongan_tikar: 0, gt_diubah_pada: 5 }),
      buatItemBal('A2', { berat_bruto_kg: 44, potongan_tara_kg: 4, berat_kg: 40, diubah_lokal_pada: 99 }),
    ]);
    const ops = turunkanOperasi(lama, baru);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ jenis: 'ubah_bal', ref: { no_bal: 'A2' }, timbang_diubah_pada: 99 });
    expect((ops[0] as { perubahan: object }).perubahan).toEqual({ berat_bruto_kg: 44, potongan_tara_kg: 4, berat_kg: 40 });
  });

  it('bal yang hilang dari salinan layar tidak dihapus kecuali simpanan versi utuh', () => {
    const lama = kupon();
    const baru = kupon([buatItemBal('A1')]);
    expect(turunkanOperasi(lama, baru)).toEqual([]);
    expect(turunkanOperasi(lama, baru, { timpaPenuh: true })).toEqual([{ jenis: 'hapus_bal', ref: { item_id: 'ITEM-A2', no_bal: 'A2' } }]);
  });

  it('bal baru, tutup sortir, dan pelunasan dikenali', () => {
    const lama = kupon([buatItemBal('A1', { berat_kg: 30 })]);
    const tambah = turunkanOperasi(lama, kupon([buatItemBal('A1', { berat_kg: 30 }), buatItemBal('A9')]));
    expect(tambah[0]).toMatchObject({ jenis: 'tambah_bal' });
    const tutup = turunkanOperasi(lama, { ...lama, status_tahap: 'menunggu_timbang' });
    expect(tutup[0]).toMatchObject({ jenis: 'ubah_kupon', perubahan: { status_tahap: 'menunggu_timbang' } });
    const bayar = turunkanOperasi({ ...lama, status_tahap: 'lengkap' }, { ...lama, status_tahap: 'lengkap', status_pembayaran: 'lunas', metode_pembayaran: 'cash' });
    expect(bayar).toEqual([{ jenis: 'bayar', metode: 'cash', catatan_kasir: undefined, dibayar_oleh: undefined }]);
  });
});
