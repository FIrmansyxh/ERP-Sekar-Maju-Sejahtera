import type { Barang, MasterHargaJual } from '../types';
import { beratBrutoBal } from './beratKirim';
import { noBalTerkini } from './noBalPensiun';

/**
 * Impor isi Batch Sample dari Excel/CSV (permintaan pemilik 2026-10-02). Daftar sample biasa disusun di Excel lebih dulu:
 * tiap tab satu pengiriman sample berisi kolom Gulungan, No Bal, dan Harga Jual/Tawaran.
 *
 * - Gulungan hanya pengelompokan di luar sistem: tidak disimpan, hanya ditampilkan agar baris bermasalah mudah dicari.
 * - Kolom Kode Harga Jual/Tawar (55, HJ-45) dan/atau Harga Jual/Tawar (55000 / 55.000) dicocokkan ke Master Harga Jual
 *   aktif tanpa tertukar (tentukanHargaJual). Yang tidak ada di Master atau nominalnya tidak sama tidak dimasukkan.
 * - Berat dan harga beli diambil dari bal di sistem. No Jadi = kolom No Jadi bila ada, selain itu sama dengan No Bal.
 * - Bal yang tidak bisa dipakai (tidak ada, sudah di batch lain, sudah keluar, dobel) tidak dimasukkan dan dilaporkan.
 */

export interface TabImpor {
  nama: string;
  /** Sel sebagai teks; indeks 0 = baris 1 di Excel */
  baris: string[][];
}

export interface PetaKolom {
  /** Indeks baris judul (0 = baris 1) */
  barisJudul: number;
  noBal: number;
  /** Kolom Kode Harga Jual/Tawar (mis. 55, HJ-45) */
  kode: number | null;
  /** Kolom Harga Jual/Tawar dalam Rupiah per kg (mis. 55000); boleh juga berisi kode bila file hanya punya satu kolom */
  harga: number | null;
  gulungan: number | null;
  noJadi: number | null;
}

export type StatusBarisImpor = 'siap' | 'peringatan' | 'tolak';

export interface BarisImpor {
  /** Nomor baris di Excel/CSV (mulai 1) */
  barisExcel: number;
  gulungan: string;
  noBalFile: string;
  kodeFile: string;
  hargaFile: string;
  status: StatusBarisImpor;
  /** Alasan ditolak dan/atau peringatan */
  pesan: string[];
  bal?: Barang;
  hargaJual?: MasterHargaJual;
  noJadi?: string;
}

export interface KonteksImpor {
  barangList: Barang[];
  /** Master Harga Jual yang aktif */
  hargaJualAktif: MasterHargaJual[];
  /** Aturan pemakaian bal yang sama dengan scan manual: sudah di batch ini/lain, sudah keluar lewat Surat Jalan */
  cekBal: (bal: Barang) => { isAvailable: boolean; message: string };
  /** No Jadi sudah dipakai di tabel batch ini atau di batch lain */
  noJadiDipakai: (noJadi: string) => boolean;
}

const rata = (teks: string): string => teks.toLowerCase().replace(/[^a-z0-9]/g, '');
const kunciBal = (noBal: string): string => String(noBal || '').trim().replace(/-/g, '').toUpperCase();

const JENIS_KOLOM = {
  noBal: (j: string) => j === 'nobal' || j === 'nomorbal' || j === 'bal' || j.startsWith('nobal'),
  // "Kode Harga Jual/Tawar", "Kode HJ", "Kode"; bukan Kode Bal Pembeli atau Kode Grade
  kode: (j: string) => j.startsWith('kode') && !j.includes('bal') && !j.includes('grade') && !j.includes('pembeli'),
  // "Harga Jual/Tawaran" (Rp/kg); kolom Harga Beli di file tidak dipakai
  harga: (j: string) =>
    (j.includes('harga') || j.includes('tawar') || j === 'hj') && !j.startsWith('kode') && !j.includes('hargabeli'),
  gulungan: (j: string) => j.includes('gulung'),
  noJadi: (j: string) => j.includes('nojadi') || j.includes('kodebalpembeli') || j === 'jadi',
};

/** Mencari baris judul (10 baris pertama) yang memuat kolom No Bal dan Kode Harga Jual dan/atau Harga Jual. */
export function kenaliKolom(baris: string[][]): PetaKolom | null {
  for (let r = 0; r < Math.min(baris.length, 10); r++) {
    const judul = baris[r].map((t) => rata(t || ''));
    const cari = (cocok: (j: string) => boolean, kecuali: number[] = []) =>
      judul.findIndex((j, i) => j !== '' && !kecuali.includes(i) && cocok(j));
    const noJadi = cari(JENIS_KOLOM.noJadi);
    const kode = cari(JENIS_KOLOM.kode, [noJadi]);
    const harga = cari(JENIS_KOLOM.harga, [noJadi, kode]);
    const noBal = cari(JENIS_KOLOM.noBal, [noJadi, kode]);
    if (noBal >= 0 && (harga >= 0 || kode >= 0)) {
      const gulungan = cari(JENIS_KOLOM.gulungan);
      const ada = (i: number) => (i >= 0 ? i : null);
      return { barisJudul: r, noBal, kode: ada(kode), harga: ada(harga), gulungan: ada(gulungan), noJadi: ada(noJadi) };
    }
  }
  return null;
}

/** Angka harga dari teks: "45000", "45.000", "Rp 45.000", "45,000", "45000.00". null bila bukan angka. */
export function angkaHarga(teks: string): number | null {
  let s = String(teks || '').replace(/rp/gi, '').replace(/\/\s*kg/gi, '').replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  // Desimal 1-2 angka di belakang (45000.00) dibuang; pemisah ribuan titik/koma dihapus
  if (/[.,]\d{1,2}$/.test(s)) s = s.replace(/[.,]\d{1,2}$/, '');
  const n = Number(s.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * Menentukan Master Harga Jual dari kolom Kode dan kolom Harga (Rp/kg) tanpa tertukar:
 * - kode menentukan Master; bila kolom harga juga diisi, nominalnya harus sama dengan harga kode itu
 * - isi kedua kolom yang tertukar (kode di kolom harga, nominal di kolom kode) dikenali dan dibetulkan
 * - hanya nominal: dicocokkan ke kode dengan harga yang sama
 */
export function tentukanHargaJual(
  kodeFile: string,
  hargaFile: string,
  master: MasterHargaJual[]
): { hargaJual?: MasterHargaJual; tolak?: string; peringatan?: string } {
  const kode = String(kodeFile || '').trim();
  const harga = String(hargaFile || '').trim();
  if (!kode && !harga) return { tolak: 'Kode/Harga Jual kosong' };
  const perKode = (v: string) => (v ? master.find((h) => h.kode.trim().toUpperCase() === v.toUpperCase()) : undefined);

  const dariKolomKode = perKode(kode);
  const dariKolomHarga = dariKolomKode ? undefined : perKode(harga);
  const hj = dariKolomKode ?? dariKolomHarga;
  if (hj) {
    // Nominal pembanding: kolom harga, atau kolom kode bila isinya tertukar
    const nominalTeks = dariKolomKode ? harga : kode;
    const tertukar = Boolean(dariKolomHarga && kode);
    if (nominalTeks) {
      const n = angkaHarga(nominalTeks);
      if (n === null) return { tolak: `${tertukar ? 'Kode' : 'Harga'} "${nominalTeks}" tidak dikenali` };
      if (n !== Number(hj.harga_jual)) {
        return { tolak: `Harga ${rupiah(n)} tidak sama dengan kode ${hj.kode} (${rupiah(Number(hj.harga_jual))})` };
      }
    }
    return { hargaJual: hj, peringatan: tertukar ? 'Kode dan harga tertukar di file, sudah disesuaikan' : undefined };
  }

  if (kode && harga) return { tolak: `Kode "${kode}" tidak ada di Master Harga Jual` };
  const isi = harga || kode;
  const n = angkaHarga(isi);
  const sama = n === null ? [] : master.filter((h) => Number(h.harga_jual) === n);
  if (sama.length === 0) return { tolak: `Harga "${isi}" tidak ada di Master Harga Jual` };
  // Harga sama di beberapa kode: pakai yang tanggal berlakunya paling baru
  const terpilih = [...sama].sort((a, b) => String(b.tanggal_berlaku || '').localeCompare(String(a.tanggal_berlaku || '')))[0];
  return {
    hargaJual: terpilih,
    peringatan: sama.length > 1 ? `${rupiah(n as number)} dipakai ${sama.length} kode, dipilih ${terpilih.kode}` : undefined,
  };
}

/** Mencari bal gudang lewat No Bal; nomor lama hasil Koreksi No Bal diganti ke nomor terbarunya. */
export function cariBalImpor(noBal: string, barangList: Barang[]): { bal?: Barang; noBaru?: string } {
  const kunci = kunciBal(noBal);
  if (!kunci) return {};
  const temukan = (k: string) =>
    barangList.find((b) => kunciBal(b.no_bal || '') === k || kunciBal(b.barang_id) === k);
  const langsung = temukan(kunci);
  if (langsung) return { bal: langsung };
  const terkini = kunciBal(noBalTerkini(kunci));
  if (terkini !== kunci) {
    const bal = temukan(terkini);
    if (bal) return { bal, noBaru: bal.no_bal || terkini };
  }
  return {};
}

/** Memeriksa setiap baris data tab terhadap stok gudang, Master Harga Jual, dan aturan Batch Sample. */
export function periksaBarisImpor(tab: TabImpor, peta: PetaKolom, k: KonteksImpor): BarisImpor[] {
  const hasil: BarisImpor[] = [];
  const balDiFile = new Map<string, number>();
  const noJadiDiFile = new Map<string, number>();
  let gulunganTerakhir = '';

  tab.baris.slice(peta.barisJudul + 1).forEach((sel, i) => {
    const ambil = (kolom: number | null) => (kolom === null ? '' : String(sel[kolom] ?? '').trim());
    const noBalFile = ambil(peta.noBal);
    const kodeFile = ambil(peta.kode);
    const hargaFile = ambil(peta.harga);
    const noJadiFile = ambil(peta.noJadi);
    const gulunganSel = ambil(peta.gulungan);
    if (!noBalFile && !kodeFile && !hargaFile && !noJadiFile) return; // baris kosong / pemisah antar gulungan
    // Sel gulungan yang digabung (merge) atau hanya diisi di baris pertama kelompok: ikut baris di atasnya
    if (gulunganSel) gulunganTerakhir = gulunganSel;

    const baris: BarisImpor = {
      barisExcel: peta.barisJudul + 2 + i,
      gulungan: gulunganTerakhir,
      noBalFile,
      kodeFile,
      hargaFile,
      status: 'siap',
      pesan: [],
    };
    const tolak = (alasan: string) => {
      baris.status = 'tolak';
      baris.pesan.push(alasan);
    };
    hasil.push(baris);

    if (!noBalFile) return tolak('No Bal kosong');
    const { bal, noBaru } = cariBalImpor(noBalFile, k.barangList);
    if (!bal) return tolak('No Bal tidak ada di sistem');
    baris.bal = bal;
    if (noBaru) baris.pesan.push(`No Bal lama, sekarang ${noBaru}`);

    const barisSama = balDiFile.get(bal.barang_id);
    if (barisSama !== undefined) return tolak(`Dobel di file (sama dengan baris ${barisSama})`);
    balDiFile.set(bal.barang_id, baris.barisExcel);

    const pakai = k.cekBal(bal);
    if (!pakai.isAvailable) return tolak(pakai.message);

    const harga = tentukanHargaJual(kodeFile, hargaFile, k.hargaJualAktif);
    if (!harga.hargaJual) return tolak(harga.tolak || 'Kode/Harga Jual tidak dikenali');
    baris.hargaJual = harga.hargaJual;
    if (harga.peringatan) baris.pesan.push(harga.peringatan);

    const noJadi = noJadiFile || bal.no_bal || bal.barang_id;
    const kunciNoJadi = noJadi.trim().toLowerCase();
    const noJadiSama = noJadiDiFile.get(kunciNoJadi);
    if (noJadiSama !== undefined) return tolak(`No Jadi ${noJadi} dobel di file (baris ${noJadiSama})`);
    if (k.noJadiDipakai(noJadi)) return tolak(`No Jadi ${noJadi} sudah dipakai`);
    noJadiDiFile.set(kunciNoJadi, baris.barisExcel);
    baris.noJadi = noJadi;

    if (beratBrutoBal(bal) <= 0) baris.pesan.push('Belum ditimbang (berat 0 kg)');
    if (baris.pesan.length > 0) baris.status = 'peringatan';
  });

  return hasil;
}

/** Teks dari nilai sel ExcelJS (angka, teks, rich text, rumus, hyperlink, tanggal). */
export function teksSel(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return '';
  if (typeof nilai === 'number') return Number.isInteger(nilai) ? String(nilai) : String(Math.round(nilai * 100) / 100);
  if (typeof nilai === 'string') return nilai.trim();
  if (typeof nilai === 'boolean') return nilai ? 'TRUE' : 'FALSE';
  if (nilai instanceof Date) return nilai.toISOString().slice(0, 10);
  if (typeof nilai === 'object') {
    const o = nilai as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((r) => r.text || '').join('').trim();
    if ('result' in o) return teksSel(o.result);
    if ('text' in o) return teksSel(o.text);
  }
  return '';
}

/** Memecah CSV (pemisah koma atau titik koma, tanda kutip ganda). */
export function pecahCsv(teks: string): string[][] {
  const isi = teks.replace(/^﻿/, '');
  const barisPertama = isi.split(/\r?\n/).find((b) => b.trim() !== '') || '';
  const pemisah = (barisPertama.match(/;/g) || []).length > (barisPertama.match(/,/g) || []).length ? ';' : ',';
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = '';
  let dalamKutip = false;
  for (let i = 0; i < isi.length; i++) {
    const c = isi[i];
    if (dalamKutip) {
      if (c === '"' && isi[i + 1] === '"') {
        sel += '"';
        i++;
      } else if (c === '"') dalamKutip = false;
      else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === pemisah) {
      baris.push(sel.trim());
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && isi[i + 1] === '\n') i++;
      baris.push(sel.trim());
      hasil.push(baris);
      baris = [];
      sel = '';
    } else sel += c;
  }
  if (sel !== '' || baris.length > 0) {
    baris.push(sel.trim());
    hasil.push(baris);
  }
  return hasil;
}

/** Membaca file .xlsx (semua tab yang terlihat) atau .csv (satu tab). */
export async function bacaBerkasImpor(file: File): Promise<TabImpor[]> {
  const nama = file.name.toLowerCase();
  if (nama.endsWith('.csv')) {
    return [{ nama: file.name.replace(/\.csv$/i, ''), baris: pecahCsv(await file.text()) }];
  }
  if (nama.endsWith('.xls')) {
    throw new Error('Format .xls lama belum bisa dibaca. Simpan ulang file sebagai .xlsx atau .csv.');
  }
  if (!nama.endsWith('.xlsx')) throw new Error('Pilih file .xlsx atau .csv.');

  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const tab: TabImpor[] = [];
  workbook.eachSheet((ws: any) => {
    if (ws.state && ws.state !== 'visible') return;
    const baris: string[][] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const sel: string[] = [];
      for (let c = 1; c <= Math.max(row.cellCount, ws.columnCount || 0); c++) sel.push(teksSel(row.getCell(c).value));
      baris.push(sel);
    }
    tab.push({ nama: ws.name, baris });
  });
  return tab;
}

/** Template kosong (judul kolom saja) untuk menyusun daftar sample. */
export async function unduhTemplateImporSample(): Promise<void> {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Sample');
  ws.columns = [
    { header: 'Gulungan', key: 'gulungan', width: 12 },
    { header: 'No Bal', key: 'no_bal', width: 16, style: { numFmt: '@' } },
    { header: 'Kode Harga Jual', key: 'kode', width: 18, style: { numFmt: '@' } },
    { header: 'Harga Jual (Rp/Kg)', key: 'harga', width: 20, style: { numFmt: '#,##0' } },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Template_Impor_Batch_Sample.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
