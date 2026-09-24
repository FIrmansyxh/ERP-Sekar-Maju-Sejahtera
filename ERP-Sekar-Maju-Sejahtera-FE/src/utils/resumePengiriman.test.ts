import { describe, expect, it } from 'vitest';
import { PengirimanSample } from '../types';
import { buatBal, buatSuratJalan } from '../test/fixtures';
import {
  hitungResumePengiriman,
  hitungResumeSample,
  susunBarisExcelResume,
  susunNarasiResume,
} from './resumePengiriman';

const HARI_INI = new Date('2026-09-21T10:00:00');

const sample = (id: string, status: PengirimanSample['status'], extra: Partial<PengirimanSample> = {}) =>
  ({ sample_id: id, status, berat_sample_gram: 500, tujuan: 'Pabrik A', tanggal_kirim: '2026-09-10', ...extra }) as unknown as PengirimanSample;

const balList = [buatBal('B1', { kode_grade: '57' }), buatBal('B2', { kode_grade: '57' }), buatBal('B3', { kode_grade: 'SB' })];

describe('hitungResumePengiriman', () => {
  it('daftar kosong menghasilkan resume kosong tanpa galat', () => {
    const r = hitungResumePengiriman([], [], [], HARI_INI);
    expect(r.jumlahDO).toBe(0);
    expect(r.hargaRataNetto).toBeNull();
    expect(r.persenSelisih).toBeNull();
    expect(susunNarasiResume(r)).toContain('Belum ada Surat Jalan');
  });

  it('nilai penjualan hanya dari DO Selesai, DO lain masuk nilai berjalan', () => {
    const selesai = buatSuratJalan('1', 'selesai');
    const dikirim = buatSuratJalan('2', 'dikirim', { tanggal_kirim: '2026-09-18' });
    const r = hitungResumePengiriman([selesai, dikirim], balList, [], HARI_INI);
    expect(r.nilaiPenjualan).toBe(selesai.total_nilai_deal);
    expect(r.nilaiBerjalan).toBe(dikirim.total_nilai_deal);
    expect(r.jumlahDO).toBe(2);
    expect(r.totalBal).toBe(4);
    expect(r.brutoKirim).toBe(176);
  });

  it('menghitung netto jual, potongan netto, dan harga rata-rata dari DO Selesai', () => {
    const sj = buatSuratJalan('1', 'selesai', {
      netto_jual_map: { B1: 42, B2: 42 },
      berat_kirim_map: { B1: 44, B2: 44 },
      harga_deal_map: { B1: 50000, B2: 50000 },
      total_nilai_deal: 84 * 50000,
    });
    const r = hitungResumePengiriman([sj], balList, [], HARI_INI);
    expect(r.nettoJual).toBe(84);
    expect(r.potonganNetto).toBe(4);
    expect(r.hargaRataNetto).toBe(50000);
  });

  it('selisih timbang ulang negatif berarti susut terhadap bruto gudang', () => {
    const sj = buatSuratJalan('1', 'selesai', { berat_kirim_map: { B1: 43, B2: 43.5 } });
    const r = hitungResumePengiriman([sj], balList, [], HARI_INI);
    expect(r.brutoGudangPembanding).toBe(88);
    expect(r.selisihTimbangUlang).toBe(-1.5);
    expect(r.persenSelisih).toBeCloseTo((-1.5 / 88) * 100, 5);
  });

  it('nilai dihitung dari netto x harga bila total_nilai_deal kosong', () => {
    const sj = buatSuratJalan('1', 'selesai', { total_nilai_deal: 0 });
    const r = hitungResumePengiriman([sj], balList, [], HARI_INI);
    expect(r.nilaiPenjualan).toBe(44 * 45000 + 44 * 46000);
    expect(r.perhatian.selesaiTanpaNilai).toEqual([]);
  });

  it('DO Selesai tanpa harga sama sekali masuk daftar perhatian', () => {
    const sj = buatSuratJalan('1', 'selesai', { total_nilai_deal: 0, harga_deal_map: {} });
    const r = hitungResumePengiriman([sj], balList, [], HARI_INI);
    expect(r.perhatian.selesaiTanpaNilai).toEqual(['SJ-1']);
  });

  it('DO belum Selesai diurutkan dari yang paling lama dan dihitung hari sejak kirim', () => {
    const lama = buatSuratJalan('1', 'dalam_perjalanan', { tanggal_kirim: '2026-09-10' });
    const baru = buatSuratJalan('2', 'dimuat', { tanggal_kirim: '2026-09-20' });
    const r = hitungResumePengiriman([baru, lama], balList, [], HARI_INI);
    expect(r.perhatian.belumSelesai.map((d) => [d.no_surat_jalan, d.hariSejakKirim])).toEqual([
      ['SJ-1', 11],
      ['SJ-2', 1],
    ]);
  });

  it('bal yang datanya tidak ada ditandai, dan grade-nya masuk Tanpa Grade', () => {
    const sj = buatSuratJalan('1', 'selesai', { barang_ids: ['B1', 'HILANG'], berat_kirim_map: { B1: 44, HILANG: 40 } });
    const r = hitungResumePengiriman([sj], balList, [], HARI_INI);
    expect(r.perhatian.balTidakDitemukan).toEqual(['SJ-1']);
    expect(r.grade.map((g) => g.grade).sort()).toEqual(['57', 'Tanpa Grade']);
  });

  it('mengelompokkan per pabrik (terbesar dulu), status, grade, dan bulan', () => {
    const a1 = buatSuratJalan('1', 'selesai', { tujuan: 'Pabrik A', total_berat_kg: 100, tanggal_kirim: '2026-08-30' });
    const a2 = buatSuratJalan('2', 'selesai', { tujuan: 'Pabrik A', total_berat_kg: 100, tanggal_kirim: '2026-09-02', barang_ids: ['B3'], total_bal: 1 });
    const b1 = buatSuratJalan('3', 'diterima', { tujuan: 'Pabrik B', total_berat_kg: 300, tanggal_kirim: '2026-09-05' });
    const r = hitungResumePengiriman([a1, a2, b1], balList, [], HARI_INI);

    expect(r.jumlahPabrik).toBe(2);
    expect(r.pabrik.map((p) => [p.pabrik, p.jumlahDO, p.kg])).toEqual([
      ['Pabrik B', 1, 300],
      ['Pabrik A', 2, 200],
    ]);
    expect(r.pabrik[0].persenKg).toBeCloseTo(60, 5);
    expect(r.status.map((s) => [s.status, s.jumlahDO])).toEqual([
      ['diterima', 1],
      ['selesai', 2],
    ]);
    expect(r.bulan.map((b) => [b.bulan, b.jumlahDO])).toEqual([
      ['2026-08', 1],
      ['2026-09', 2],
    ]);
    expect(r.grade.find((g) => g.grade === 'SB')?.bal).toBe(1);
    expect(r.tanggalAwal).toBe('2026-08-30');
    expect(r.tanggalAkhir).toBe('2026-09-05');
  });
});

describe('hitungResumeSample', () => {
  it('menghitung status dan tingkat setuju dari sample yang sudah dijawab', () => {
    const r = hitungResumeSample([
      sample('1', 'disetujui', { sudah_dikirim_do: true }),
      sample('2', 'disetujui'),
      sample('3', 'nego'),
      sample('4', 'ditolak'),
      sample('5', 'dikirim'),
    ]);
    expect(r).toMatchObject({ total: 5, disetujui: 2, nego: 1, ditolak: 1, menunggu: 1, sudahMasukDO: 1, totalGram: 2500 });
    expect(r.persenSetuju).toBe(50);
  });

  it('belum ada jawaban berarti tingkat setuju kosong, bukan 0%', () => {
    expect(hitungResumeSample([sample('1', 'dikirim')]).persenSetuju).toBeNull();
    expect(hitungResumeSample([]).persenSetuju).toBeNull();
  });
});

describe('susunBarisExcelResume', () => {
  it('rowKinds sejajar dengan rows dan diawali grup Ringkasan', () => {
    const r = hitungResumePengiriman([buatSuratJalan('1', 'selesai')], balList, [sample('1', 'disetujui')], HARI_INI);
    const { rows, rowKinds } = susunBarisExcelResume(r);
    expect(rowKinds).toHaveLength(rows.length);
    expect(rows[0][0]).toBe('Ringkasan');
    expect(rowKinds[0]).toBe('group');
    expect(rows.every((baris) => baris.length === 3)).toBe(true);
    expect(rows.some((baris) => baris[0] === 'Nilai Penjualan (Rp)')).toBe(true);
  });

  it('tanpa data hanya memuat ringkasan', () => {
    const { rows } = susunBarisExcelResume(hitungResumePengiriman([], [], [], HARI_INI));
    expect(rows).toHaveLength(2);
  });
});
