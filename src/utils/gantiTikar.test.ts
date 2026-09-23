import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buatKupon } from '../test/fixtures';
import type { TransaksiItemBal, TransaksiPembelian } from '../types';
import { mergeKuponParalel } from './kuponSortir';
import { antrianSinkron, verifikasiHasil } from '../services/antrianSinkron';

/**
 * Regresi 2026-09-23: "centang GT, lalu beberapa lama kemudian tidak tercentang". Timbangan menyimpan hasil timbang
 * (bertanda waktu baru) membawa GT dari salinan layar yang basi, sehingga GT yang dicentang dari perangkat lain
 * tertimpa. GT kini diputuskan cap waktunya sendiri (gt_diubah_pada), yang juga disimpan server.
 */
const bal = (extra: Partial<TransaksiItemBal> = {}): TransaksiItemBal =>
  ({
    item_id: 'TRX-1-BAL-01',
    no_bal: 'A1',
    kode_grade: '57',
    harga_per_kg: 50000,
    berat_kg: 0,
    total_kotor: 0,
    potongan_kuli: 7000,
    potongan_tali: 3000,
    ganti_tikar: false,
    potongan_tikar: 0,
    ...extra,
  }) as TransaksiItemBal;

const satu = (tx: TransaksiPembelian) => tx.items![0];
const jam = Date.now();

describe('ganti tikar: cap waktu GT sendiri, terpisah dari cap waktu timbang', () => {
  it('hasil timbang dengan GT basi tidak mematikan GT yang dicentang lebih baru di perangkat lain', () => {
    const server = buatKupon('TRX-1', { items: [bal({ ganti_tikar: true, potongan_tikar: 75000, gt_diubah_pada: jam - 1000 })] });
    // Timbangan: baru saja menimbang (cap timbang terbaru) tetapi GT di layarnya masih yang lama
    const timbangan = buatKupon('TRX-1', {
      items: [bal({ berat_kg: 50, berat_bruto_kg: 55, total_kotor: 2_500_000, diubah_lokal_pada: jam, gt_diubah_pada: jam - 60_000 })],
    });

    const disimpan = satu(mergeKuponParalel(timbangan, server, { incomingDariServer: true }));
    expect(disimpan.ganti_tikar).toBe(true);
    expect(disimpan.potongan_tikar).toBe(75000);
    expect(disimpan.berat_kg).toBe(50); // berat tetap dari timbangan
    expect(disimpan.potongan).toBe(85000);
    expect(disimpan.subtotal_bersih).toBe(2_500_000 - 85000);

    // Urutan sebaliknya (server menggabungkan simpanan lokal) juga memberi hasil yang sama
    expect(satu(mergeKuponParalel(server, timbangan)).ganti_tikar).toBe(true);
  });

  it('GT yang baru dilepas di perangkat ini menang atas GT lama di server', () => {
    const server = buatKupon('TRX-1', { items: [bal({ ganti_tikar: true, potongan_tikar: 75000, gt_diubah_pada: jam - 10_000 })] });
    const layar = buatKupon('TRX-1', { items: [bal({ ganti_tikar: false, potongan_tikar: 0, gt_diubah_pada: jam })] });
    const hasil = satu(mergeKuponParalel(layar, server, { incomingDariServer: true }));
    expect(hasil.ganti_tikar).toBe(false);
    expect(hasil.potongan_tikar).toBe(0);
    expect(hasil.gt_diubah_pada).toBe(jam);
  });

  it('tanpa cap waktu: data server menjadi acuan; antara dua salinan lokal GT aktif dipertahankan', () => {
    const server = buatKupon('TRX-1', { items: [bal({ ganti_tikar: false })] });
    const layar = buatKupon('TRX-1', { items: [bal({ ganti_tikar: true, potongan_tikar: 75000 })] });
    expect(satu(mergeKuponParalel(layar, server, { incomingDariServer: true })).ganti_tikar).toBe(false);
    expect(satu(mergeKuponParalel(layar, server)).ganti_tikar).toBe(true);
  });
});

describe('verifikasi hasil simpan kupon', () => {
  it('GT yang sengaja dipertahankan server (kiriman tanpa perubahan GT) tidak dianggap gagal simpan', () => {
    const terkirim = buatKupon('TRX-1', { items: [bal({ ganti_tikar: true, potongan_tikar: 75000 })] });
    const server = buatKupon('TRX-1', { items: [bal({ ganti_tikar: false })] });
    expect(verifikasiHasil(server, terkirim)).toEqual([]);
  });

  it('GT yang diubah di perangkat ini tetapi tidak tersimpan tetap dianggap gagal', () => {
    const terkirim = buatKupon('TRX-1', { items: [bal({ ganti_tikar: true, potongan_tikar: 75000, gt_diubah_pada: jam })] });
    const server = buatKupon('TRX-1', { items: [bal({ ganti_tikar: false, gt_diubah_pada: jam - 5000 })] });
    expect(verifikasiHasil(server, terkirim)).toHaveLength(1);
  });

  it('bal ber-ID server yang sudah dihapus di perangkat lain tidak dianggap gagal simpan', () => {
    const terkirim = buatKupon('TRX-1', { items: [bal(), bal({ item_id: 'TRX-1-BAL-02', no_bal: 'A2' })] });
    const server = buatKupon('TRX-1', { items: [bal()] });
    expect(verifikasiHasil(server, terkirim)).toEqual([]);
  });
});

describe('antrean kupon: kupon yang sudah dihapus di server (410)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('simpanan dibuang (tidak dicoba ulang, tidak membuat ulang kupon) dan layar diberi tahu', async () => {
    let dikirim = 0;
    antrianSinkron.pasang(async () => {
      dikirim += 1;
      throw Object.assign(new Error('Kupon K1 sudah dihapus'), { status: 410 });
    });
    const dihapus: string[] = [];
    const lepas = antrianSinkron.saatDihapusServer((id, _tx, pesan) => dihapus.push(`${id}: ${pesan}`));
    const hasil = await antrianSinkron.masukkan(buatKupon('TRX-410', { items: [bal()] }), { status_pembayaran: 'belum_lunas' });
    lepas();

    expect(dikirim).toBe(1);
    expect(hasil.ditunda).toBe(false);
    expect(dihapus).toEqual(['TRX-410: Kupon K1 sudah dihapus']);
    expect(antrianSinkron.adaTugas('TRX-410')).toBe(false);
  });
});
