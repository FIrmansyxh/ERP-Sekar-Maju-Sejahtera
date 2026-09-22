import { Barang, PengirimanBarang, PengirimanSample, StatusPengiriman } from '../types';
import { beratBrutoBal, beratKirimBal, nettoJualBal } from './beratKirim';
import { isPenjualanMasuk } from './kunciHapus';
import { formatDateIndo, formatNumber, formatRupiah, normalizeKg } from './formatters';
import type { ExcelRowKind } from './excelExport';

/**
 * Resume Laporan Pengiriman: angka ringkas dari daftar Surat Jalan (DO) yang sudah tersaring,
 * dihitung di satu tempat supaya tampilan layar, PDF, dan Excel memakai angka yang sama.
 * Nilai penjualan hanya dari DO berstatus Selesai; DO lain dihitung sebagai nilai berjalan.
 */

export const URUTAN_STATUS_PENGIRIMAN: StatusPengiriman[] = ['dimuat', 'dikirim', 'dalam_perjalanan', 'diterima', 'selesai'];

export const LABEL_STATUS_PENGIRIMAN: Record<StatusPengiriman, string> = {
  dimuat: 'Sedang Dimuat',
  dikirim: 'Dikirim',
  dalam_perjalanan: 'Dalam Perjalanan',
  diterima: 'Diterima Pabrik',
  selesai: 'Selesai',
};

export interface BarisStatusResume {
  status: StatusPengiriman;
  label: string;
  jumlahDO: number;
  bal: number;
  kg: number;
  persenDO: number;
}

export interface BarisPabrikResume {
  pabrik: string;
  jumlahDO: number;
  bal: number;
  kg: number;
  nettoJual: number;
  /** Nilai penjualan: hanya DO Selesai */
  nilai: number;
  persenKg: number;
}

export interface BarisGradeResume {
  grade: string;
  bal: number;
  kg: number;
  persenKg: number;
}

export interface BarisBulanResume {
  /** YYYY-MM */
  bulan: string;
  jumlahDO: number;
  bal: number;
  kg: number;
  nilai: number;
}

export interface ResumeSample {
  total: number;
  /** Belum ada jawaban pembeli: sample, dikirim, diterima */
  menunggu: number;
  disetujui: number;
  nego: number;
  ditolak: number;
  /** Disetujui dibanding yang sudah dijawab pembeli; null bila belum ada jawaban */
  persenSetuju: number | null;
  sudahMasukDO: number;
  totalGram: number;
}

export interface DOPerluPerhatian {
  no_surat_jalan: string;
  tujuan: string;
  status: StatusPengiriman;
  hariSejakKirim: number | null;
}

export interface ResumePengiriman {
  jumlahDO: number;
  jumlahPabrik: number;
  tanggalAwal: string;
  tanggalAkhir: string;
  totalBal: number;
  /** Jumlah total_berat_kg semua DO (angka yang sama dengan kartu Total Tonase) */
  brutoKirim: number;
  /** Bruto di gudang dan bruto timbang ulang, hanya bal yang punya kedua angka, untuk membandingkan susut */
  brutoGudangPembanding: number;
  brutoTimbangUlangPembanding: number;
  /** Timbang ulang dikurangi gudang; negatif berarti susut */
  selisihTimbangUlang: number;
  persenSelisih: number | null;
  potonganNetto: number;
  nettoJual: number;
  nilaiPenjualan: number;
  nilaiBerjalan: number;
  /** Nilai penjualan dibagi netto jual pada DO Selesai */
  hargaRataNetto: number | null;
  rataBalPerDO: number;
  rataKgPerDO: number;
  status: BarisStatusResume[];
  pabrik: BarisPabrikResume[];
  grade: BarisGradeResume[];
  bulan: BarisBulanResume[];
  sample: ResumeSample;
  perhatian: {
    belumSelesai: DOPerluPerhatian[];
    selesaiTanpaNilai: string[];
    balTidakDitemukan: string[];
  };
}

const bulatkan = (n: number, digit = 3): number => {
  const f = 10 ** digit;
  return Math.round(n * f) / f;
};

const tanggalSaja = (t?: string): string => (t || '').slice(0, 10);

/** Selisih hari kalender antara tanggal kirim dan hari ini; null bila tanggal tidak terbaca. */
function hariSejak(tanggal: string, hariIni: Date): number | null {
  const d = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const sekarang = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate());
  return Math.max(0, Math.round((sekarang.getTime() - d.getTime()) / 86400000));
}

export function hitungResumeSample(sampleList: PengirimanSample[]): ResumeSample {
  let menunggu = 0;
  let disetujui = 0;
  let nego = 0;
  let ditolak = 0;
  let sudahMasukDO = 0;
  let totalGram = 0;
  sampleList.forEach((s) => {
    if (s.status === 'disetujui') disetujui += 1;
    else if (s.status === 'nego') nego += 1;
    else if (s.status === 'ditolak') ditolak += 1;
    else menunggu += 1;
    if (s.sudah_dikirim_do) sudahMasukDO += 1;
    totalGram += s.berat_sample_gram || 0;
  });
  const dijawab = disetujui + nego + ditolak;
  return {
    total: sampleList.length,
    menunggu,
    disetujui,
    nego,
    ditolak,
    persenSetuju: dijawab > 0 ? (disetujui / dijawab) * 100 : null,
    sudahMasukDO,
    totalGram,
  };
}

export function hitungResumePengiriman(
  pengirimanList: PengirimanBarang[],
  barangList: Barang[] = [],
  sampleList: PengirimanSample[] = [],
  hariIni: Date = new Date()
): ResumePengiriman {
  const barangMap = new Map(barangList.map((b) => [b.barang_id, b]));

  let totalBal = 0;
  let brutoKirim = 0;
  let brutoGudangPembanding = 0;
  let brutoTimbangUlangPembanding = 0;
  let brutoTimbangUlangSemua = 0;
  let nettoJual = 0;
  let nilaiPenjualan = 0;
  let nilaiBerjalan = 0;
  let nettoSelesai = 0;

  const status = new Map<StatusPengiriman, { jumlahDO: number; bal: number; kg: number }>();
  const pabrik = new Map<string, { jumlahDO: number; bal: number; kg: number; nettoJual: number; nilai: number }>();
  const grade = new Map<string, { bal: number; kg: number }>();
  const bulan = new Map<string, { jumlahDO: number; bal: number; kg: number; nilai: number }>();
  const belumSelesai: DOPerluPerhatian[] = [];
  const selesaiTanpaNilai: string[] = [];
  const balTidakDitemukan: string[] = [];
  const tanggal: string[] = [];

  for (const p of pengirimanList) {
    const bal = p.total_bal || 0;
    const kg = p.total_berat_kg || 0;
    totalBal += bal;
    brutoKirim += kg;

    let nilaiHitung = 0;
    let nettoDO = 0;
    let adaBalHilang = false;
    for (const id of p.barang_ids || []) {
      const b = barangMap.get(id);
      if (!b) adaBalHilang = true;
      const gudang = beratBrutoBal(b);
      const timbangUlang = beratKirimBal(p, id, b);
      const netto = nettoJualBal(p, id, b);
      const harga = p.harga_deal_map?.[id] || 0;
      nilaiHitung += Math.round(netto * harga);
      nettoDO += netto;
      brutoTimbangUlangSemua += timbangUlang;
      if (gudang > 0 && timbangUlang > 0) {
        brutoGudangPembanding += gudang;
        brutoTimbangUlangPembanding += timbangUlang;
      }
      const kodeGrade = (b?.kode_grade || '').trim().toUpperCase() || 'Tanpa Grade';
      const g = grade.get(kodeGrade) || { bal: 0, kg: 0 };
      g.bal += 1;
      g.kg += timbangUlang;
      grade.set(kodeGrade, g);
    }
    nettoJual += nettoDO;
    if (adaBalHilang) balTidakDitemukan.push(p.no_surat_jalan);

    const nilai = p.total_nilai_deal && p.total_nilai_deal > 0 ? p.total_nilai_deal : nilaiHitung;
    const penjualan = isPenjualanMasuk(p);
    if (penjualan) {
      nilaiPenjualan += nilai;
      nettoSelesai += nettoDO;
      if (nilai <= 0) selesaiTanpaNilai.push(p.no_surat_jalan);
    } else {
      nilaiBerjalan += nilai;
      belumSelesai.push({
        no_surat_jalan: p.no_surat_jalan,
        tujuan: p.tujuan,
        status: p.status,
        hariSejakKirim: hariSejak(tanggalSaja(p.tanggal_kirim), hariIni),
      });
    }

    const s = status.get(p.status) || { jumlahDO: 0, bal: 0, kg: 0 };
    s.jumlahDO += 1;
    s.bal += bal;
    s.kg += kg;
    status.set(p.status, s);

    const namaPabrik = (p.tujuan || '').trim() || 'Pabrik Lainnya';
    const pb = pabrik.get(namaPabrik) || { jumlahDO: 0, bal: 0, kg: 0, nettoJual: 0, nilai: 0 };
    pb.jumlahDO += 1;
    pb.bal += bal;
    pb.kg += kg;
    pb.nettoJual += nettoDO;
    if (penjualan) pb.nilai += nilai;
    pabrik.set(namaPabrik, pb);

    const tgl = tanggalSaja(p.tanggal_kirim);
    if (tgl) {
      tanggal.push(tgl);
      const kunci = tgl.slice(0, 7);
      const bl = bulan.get(kunci) || { jumlahDO: 0, bal: 0, kg: 0, nilai: 0 };
      bl.jumlahDO += 1;
      bl.bal += bal;
      bl.kg += kg;
      if (penjualan) bl.nilai += nilai;
      bulan.set(kunci, bl);
    }
  }

  const jumlahDO = pengirimanList.length;
  const totalKgGrade = Array.from(grade.values()).reduce((sum, g) => sum + g.kg, 0);
  tanggal.sort();
  belumSelesai.sort((a, b) => (b.hariSejakKirim ?? -1) - (a.hariSejakKirim ?? -1));

  const selisihTimbangUlang = bulatkan(brutoTimbangUlangPembanding - brutoGudangPembanding);

  return {
    jumlahDO,
    jumlahPabrik: pabrik.size,
    tanggalAwal: tanggal[0] || '',
    tanggalAkhir: tanggal[tanggal.length - 1] || '',
    totalBal,
    brutoKirim: bulatkan(brutoKirim),
    brutoGudangPembanding: bulatkan(brutoGudangPembanding),
    brutoTimbangUlangPembanding: bulatkan(brutoTimbangUlangPembanding),
    selisihTimbangUlang,
    persenSelisih: brutoGudangPembanding > 0 ? (selisihTimbangUlang / brutoGudangPembanding) * 100 : null,
    potonganNetto: bulatkan(Math.max(0, brutoTimbangUlangSemua - nettoJual)),
    nettoJual: bulatkan(nettoJual),
    nilaiPenjualan,
    nilaiBerjalan,
    hargaRataNetto: nettoSelesai > 0 ? nilaiPenjualan / nettoSelesai : null,
    rataBalPerDO: jumlahDO > 0 ? totalBal / jumlahDO : 0,
    rataKgPerDO: jumlahDO > 0 ? brutoKirim / jumlahDO : 0,
    status: URUTAN_STATUS_PENGIRIMAN.filter((k) => status.has(k)).map((k) => {
      const s = status.get(k)!;
      return {
        status: k,
        label: LABEL_STATUS_PENGIRIMAN[k],
        jumlahDO: s.jumlahDO,
        bal: s.bal,
        kg: normalizeKg(s.kg),
        persenDO: jumlahDO > 0 ? (s.jumlahDO / jumlahDO) * 100 : 0,
      };
    }),
    pabrik: Array.from(pabrik.entries())
      .map(([nama, v]) => ({
        pabrik: nama,
        ...v,
        kg: normalizeKg(v.kg),
        nettoJual: bulatkan(v.nettoJual),
        persenKg: brutoKirim > 0 ? (v.kg / brutoKirim) * 100 : 0,
      }))
      .sort((a, b) => b.kg - a.kg),
    grade: Array.from(grade.entries())
      .map(([kode, v]) => ({
        grade: kode,
        bal: v.bal,
        kg: bulatkan(v.kg),
        persenKg: totalKgGrade > 0 ? (v.kg / totalKgGrade) * 100 : 0,
      }))
      .sort((a, b) => b.kg - a.kg),
    bulan: Array.from(bulan.entries())
      .map(([kunci, v]) => ({ bulan: kunci, ...v, kg: normalizeKg(v.kg) }))
      .sort((a, b) => a.bulan.localeCompare(b.bulan)),
    sample: hitungResumeSample(sampleList),
    perhatian: { belumSelesai, selesaiTanpaNilai, balTidakDitemukan },
  };
}

/** Kalimat pembuka resume: gambaran singkat yang bisa dibaca tanpa membuka tabel. */
export function susunNarasiResume(r: ResumePengiriman): string {
  if (r.jumlahDO === 0) return 'Belum ada Surat Jalan pada filter yang dipilih.';

  const periode =
    r.tanggalAwal && r.tanggalAkhir
      ? r.tanggalAwal === r.tanggalAkhir
        ? `Pada ${formatDateIndo(r.tanggalAwal)}`
        : `Periode ${formatDateIndo(r.tanggalAwal)} s.d. ${formatDateIndo(r.tanggalAkhir)}`
      : 'Pada filter terpilih';
  const selesai = r.status.find((s) => s.status === 'selesai')?.jumlahDO || 0;
  const berjalan = r.jumlahDO - selesai;

  const kalimat = [
    `${periode} tercatat ${formatNumber(r.jumlahDO)} Surat Jalan ke ${formatNumber(r.jumlahPabrik)} pabrik tujuan, total ${formatNumber(r.totalBal)} bal atau ${formatNumber(r.brutoKirim)} kg bruto (${formatNumber(r.brutoKirim / 1000, 2)} ton).`,
    `${formatNumber(selesai)} DO sudah Selesai dengan nilai penjualan ${formatRupiah(r.nilaiPenjualan)}${
      berjalan > 0 ? `, sedangkan ${formatNumber(berjalan)} DO masih berjalan senilai ${formatRupiah(r.nilaiBerjalan)}` : ''
    }.`,
  ];
  if (r.nettoJual > 0) {
    kalimat.push(`Netto jual ${formatNumber(r.nettoJual)} kg setelah potongan ${formatNumber(r.potonganNetto)} kg.`);
  }
  return kalimat.join(' ');
}

/**
 * Baris sheet "Resume" untuk Excel: kolom Uraian, Nilai, Keterangan dengan judul bagian sebagai baris grup.
 * Nilai berupa teks berformat supaya satu kolom bisa memuat kg, rupiah, dan persen sekaligus;
 * angka mentahnya ada di sheet rincian.
 */
export function susunBarisExcelResume(r: ResumePengiriman): { rows: string[][]; rowKinds: ExcelRowKind[] } {
  const rows: string[][] = [];
  const rowKinds: ExcelRowKind[] = [];
  const grup = (judul: string) => {
    rows.push([judul, '', '']);
    rowKinds.push('group');
  };
  const baris = (uraian: string, nilai: string, ket = '') => {
    rows.push([uraian, nilai, ket]);
    rowKinds.push('data');
  };
  const persen = (n: number | null) => (n === null ? '-' : `${formatNumber(n, 1)}%`);

  grup('Ringkasan');
  baris(susunNarasiResume(r), '');
  if (r.jumlahDO === 0) return { rows, rowKinds };

  grup('Angka Utama');
  baris('Surat Jalan (DO)', formatNumber(r.jumlahDO), `${formatNumber(r.jumlahPabrik)} pabrik tujuan`);
  baris('Total Bal', formatNumber(r.totalBal), `~ ${formatNumber(r.rataBalPerDO, 1)} bal per DO`);
  baris('Bruto Dikirim (Kg)', formatNumber(r.brutoKirim, 1), `~ ${formatNumber(r.rataKgPerDO, 0)} kg per DO`);
  baris('Netto Jual (Kg)', formatNumber(r.nettoJual, 1), `Potongan netto ${formatNumber(r.potonganNetto, 1)} kg`);
  baris(
    'Selisih Timbang Ulang (Kg)',
    `${r.selisihTimbangUlang > 0 ? '+' : ''}${formatNumber(r.selisihTimbangUlang, 1)}`,
    r.persenSelisih === null ? 'Belum ada bal pembanding' : `${persen(r.persenSelisih)} dari bruto gudang`
  );
  baris('Nilai Penjualan (Rp)', formatRupiah(r.nilaiPenjualan), 'Hanya DO berstatus Selesai');
  baris('Nilai Berjalan (Rp)', formatRupiah(r.nilaiBerjalan), 'DO belum Selesai');
  baris('Harga Rata-rata (Rp/Kg netto)', r.hargaRataNetto === null ? '-' : formatRupiah(r.hargaRataNetto), 'DO Selesai');

  grup('Status Surat Jalan');
  r.status.forEach((s) => baris(s.label, `${formatNumber(s.jumlahDO)} DO`, `${formatNumber(s.bal)} bal • ${formatNumber(s.kg, 1)} kg • ${persen(s.persenDO)} dari DO`));

  grup('Pabrik Tujuan');
  r.pabrik.forEach((p) =>
    baris(p.pabrik, `${formatNumber(p.jumlahDO)} DO`, `${formatNumber(p.bal)} bal • ${formatNumber(p.kg, 1)} kg • netto ${formatNumber(p.nettoJual, 1)} kg • ${formatRupiah(p.nilai)} • ${persen(p.persenKg)} tonase`)
  );

  grup('Komposisi Grade');
  r.grade.forEach((g) => baris(`Grade ${g.grade}`, `${formatNumber(g.bal)} bal`, `${formatNumber(g.kg, 1)} kg • ${persen(g.persenKg)}`));

  grup('Pengiriman per Bulan');
  r.bulan.forEach((b) => baris(b.bulan, `${formatNumber(b.jumlahDO)} DO`, `${formatNumber(b.bal)} bal • ${formatNumber(b.kg, 1)} kg • ${formatRupiah(b.nilai)}`));

  grup('Sample QC');
  const s = r.sample;
  if (s.total === 0) {
    baris('Tidak ada pengiriman sample pada filter ini', '');
  } else {
    baris('Total sample', formatNumber(s.total), `${formatNumber(s.sudahMasukDO)} sudah masuk Surat Jalan`);
    baris('Disetujui / Nego / Ditolak', `${formatNumber(s.disetujui)} / ${formatNumber(s.nego)} / ${formatNumber(s.ditolak)}`, `Tingkat setuju ${persen(s.persenSetuju)}`);
    baris('Menunggu jawaban pembeli', formatNumber(s.menunggu));
  }

  grup('Perlu Perhatian');
  const { belumSelesai, selesaiTanpaNilai, balTidakDitemukan } = r.perhatian;
  if (belumSelesai.length + selesaiTanpaNilai.length + balTidakDitemukan.length === 0) {
    baris('Semua Surat Jalan sudah Selesai dan lengkap datanya', '');
  }
  if (belumSelesai.length > 0) {
    baris(
      'Surat Jalan belum Selesai',
      formatNumber(belumSelesai.length),
      belumSelesai.map((d) => `${d.no_surat_jalan}${d.hariSejakKirim !== null ? ` (${formatNumber(d.hariSejakKirim)} hari)` : ''}`).join(', ')
    );
  }
  if (selesaiTanpaNilai.length > 0) baris('Surat Jalan Selesai tanpa nilai', formatNumber(selesaiTanpaNilai.length), selesaiTanpaNilai.join(', '));
  if (balTidakDitemukan.length > 0) baris('Surat Jalan dengan bal tidak ditemukan', formatNumber(balTidakDitemukan.length), balTidakDitemukan.join(', '));

  return { rows, rowKinds };
}
