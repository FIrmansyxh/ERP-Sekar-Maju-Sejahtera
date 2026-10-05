import type { Barang, BatchPengirimanSample, StatusBatchSample, StatusSample } from '../types';

/**
 * Laporan Pengiriman Sample / Reclass: satu sumber angka untuk layar dan Excel.
 *
 * Yang ingin dilihat pemilik (2026-09-30):
 *  - selisih harga yang DITAWARKAN dengan harga yang JADI (deal), dan
 *  - selisih harga BELI dengan harga JUAL (deal).
 *
 * Harga deal baru dianggap jadi bila bal berstatus Disetujui; bal Nego/Menunggu belum punya harga jadi, jadi selisihnya
 * kosong (bukan dikarang dari harga tawaran). Nilai rupiah dihitung dari netto gudang; nilai jual sesungguhnya mengikuti
 * netto jual saat bal dikirim lewat DO (Laporan Pengiriman Reguler).
 */

export type StatusBalSample = 'menunggu' | 'disetujui' | 'nego' | 'ditolak';

export const LABEL_STATUS_BAL_SAMPLE: Record<StatusBalSample, string> = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  nego: 'Nego',
  ditolak: 'Ditolak',
};

export const LABEL_STATUS_BATCH_SAMPLE: Partial<Record<StatusBatchSample, string>> = {
  sample: 'Sample',
  diproses: 'Diproses',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
};

export const statusBalSample = (s: StatusSample | undefined): StatusBalSample =>
  s === 'disetujui' || s === 'nego' || s === 'ditolak' ? s : 'menunggu';

export interface BarisLaporanSample {
  kunci: string;
  batch_id: string;
  kode_batch: string;
  tanggal_kirim: string;
  tujuan: string;
  status_batch: StatusBatchSample;
  barang_id: string;
  no_bal: string;
  kode_grade: string;
  kode_harga_jual: string;
  status: StatusBalSample;
  netto: number;
  hargaBeli: number | null;
  hargaTawaran: number | null;
  /** Hanya bila Disetujui */
  hargaDeal: number | null;
  /** Deal - tawaran per kg (negatif = turun dari tawaran) */
  selisihTawarDealKg: number | null;
  /** Deal - beli per kg */
  selisihJualBeliKg: number | null;
  nilaiBeli: number | null;
  nilaiTawaran: number | null;
  nilaiDeal: number | null;
  selisihTawarDealNilai: number | null;
  selisihJualBeliNilai: number | null;
  sudahDO: boolean;
  no_surat_jalan: string;
}

const positif = (n: number | undefined | null): number | null => (n !== undefined && n !== null && Number(n) > 0 ? Number(n) : null);
const kali = (kg: number, harga: number | null): number | null => (harga === null ? null : Math.round(kg * harga));
const kurang = (a: number | null, b: number | null): number | null => (a === null || b === null ? null : a - b);

/** Baris per bal dari batch yang sudah final (Draft dan Dibatalkan tidak ikut). */
export function susunBarisSample(batchList: BatchPengirimanSample[], barangList: Barang[] = []): BarisLaporanSample[] {
  const barangMap = new Map(barangList.map((b) => [b.barang_id, b]));
  return batchList
    .filter((b) => b.status !== 'draft' && b.status !== 'dibatalkan')
    .flatMap((batch) =>
      (batch.items || []).map((it): BarisLaporanSample => {
        const bal = barangMap.get(it.barang_id);
        const status = statusBalSample(it.status_item);
        const netto = Number(it.berat_bal_kg || bal?.berat_kg || 0);
        const hargaBeli = positif(it.harga_beli_kg) ?? positif(bal?.harga_per_kg);
        const hargaTawaran = positif(it.harga_tawaran_kg);
        const hargaDeal = status === 'disetujui' ? positif(it.harga_deal_kg) ?? hargaTawaran : null;
        const nilaiBeli = kali(netto, hargaBeli);
        const nilaiTawaran = kali(netto, hargaTawaran);
        const nilaiDeal = kali(netto, hargaDeal);
        return {
          kunci: `${batch.batch_id}|${it.sample_item_id || it.barang_id}`,
          batch_id: batch.batch_id,
          kode_batch: batch.kode_batch || batch.batch_id,
          tanggal_kirim: (batch.tanggal_kirim || '').slice(0, 10),
          tujuan: batch.tujuan_buyer || '',
          status_batch: batch.status,
          barang_id: it.barang_id,
          // Nomor yang berlaku sekarang (Koreksi No Bal) diambil dari bal gudang bila ada
          no_bal: bal?.no_bal || it.no_bal || '',
          kode_grade: it.kode_grade || bal?.kode_grade || '',
          kode_harga_jual: it.kode_harga_jual || '',
          status,
          netto,
          hargaBeli,
          hargaTawaran,
          hargaDeal,
          selisihTawarDealKg: kurang(hargaDeal, hargaTawaran),
          selisihJualBeliKg: kurang(hargaDeal, hargaBeli),
          nilaiBeli,
          nilaiTawaran,
          nilaiDeal,
          selisihTawarDealNilai: kurang(nilaiDeal, nilaiTawaran),
          selisihJualBeliNilai: kurang(nilaiDeal, nilaiBeli),
          sudahDO: Boolean(it.sudah_dikirim_do),
          no_surat_jalan: it.no_surat_jalan_do || '',
        };
      })
    );
}

export interface RingkasanSample {
  jumlahBatch: number;
  jumlahBal: number;
  menunggu: number;
  disetujui: number;
  nego: number;
  ditolak: number;
  /** Disetujui dibanding yang sudah dijawab; null bila belum ada jawaban */
  persenSetuju: number | null;
  sudahDO: number;
  /** Angka berikut hanya dari bal Disetujui (harga jadi sudah ada) */
  nettoDisetujui: number;
  nilaiTawaran: number;
  nilaiDeal: number;
  selisihTawarDeal: number;
  /** Nilai beli bal Disetujui yang harga belinya diketahui */
  nilaiBeli: number;
  /** Nilai deal dari bal yang sama dengan nilaiBeli (pembanding margin) */
  nilaiDealTerbanding: number;
  selisihJualBeli: number;
  /** Rata-rata tertimbang netto (Rp/kg) */
  rataSelisihTawarDealKg: number | null;
  rataSelisihJualBeliKg: number | null;
  /** Bal Disetujui yang harga belinya tidak diketahui */
  tanpaHargaBeli: number;
}

export function ringkasSample(rows: BarisLaporanSample[]): RingkasanSample {
  const r: RingkasanSample = {
    jumlahBatch: new Set(rows.map((x) => x.batch_id)).size,
    jumlahBal: rows.length,
    menunggu: 0,
    disetujui: 0,
    nego: 0,
    ditolak: 0,
    persenSetuju: null,
    sudahDO: 0,
    nettoDisetujui: 0,
    nilaiTawaran: 0,
    nilaiDeal: 0,
    selisihTawarDeal: 0,
    nilaiBeli: 0,
    nilaiDealTerbanding: 0,
    selisihJualBeli: 0,
    rataSelisihTawarDealKg: null,
    rataSelisihJualBeliKg: null,
    tanpaHargaBeli: 0,
  };
  let nettoTawar = 0;
  let nettoMargin = 0;
  for (const x of rows) {
    r[x.status] += 1;
    if (x.sudahDO) r.sudahDO += 1;
    if (x.status !== 'disetujui' || x.nilaiDeal === null) continue;
    r.nettoDisetujui += x.netto;
    if (x.selisihTawarDealNilai !== null && x.nilaiTawaran !== null) {
      r.nilaiTawaran += x.nilaiTawaran;
      r.nilaiDeal += x.nilaiDeal;
      r.selisihTawarDeal += x.selisihTawarDealNilai;
      nettoTawar += x.netto;
    }
    if (x.selisihJualBeliNilai !== null && x.nilaiBeli !== null) {
      r.nilaiBeli += x.nilaiBeli;
      r.nilaiDealTerbanding += x.nilaiDeal;
      r.selisihJualBeli += x.selisihJualBeliNilai;
      nettoMargin += x.netto;
    } else {
      r.tanpaHargaBeli += 1;
    }
  }
  const dijawab = r.disetujui + r.nego + r.ditolak;
  r.persenSetuju = dijawab > 0 ? (r.disetujui / dijawab) * 100 : null;
  r.rataSelisihTawarDealKg = nettoTawar > 0 ? r.selisihTawarDeal / nettoTawar : null;
  r.rataSelisihJualBeliKg = nettoMargin > 0 ? r.selisihJualBeli / nettoMargin : null;
  return r;
}

export interface BarisRekapBatch extends RingkasanSample {
  batch_id: string;
  kode_batch: string;
  tanggal_kirim: string;
  tujuan: string;
  status_batch: StatusBatchSample;
}

/** Rekap per batch, terbaru dulu. */
export function rekapPerBatch(rows: BarisLaporanSample[]): BarisRekapBatch[] {
  const kelompok = new Map<string, BarisLaporanSample[]>();
  rows.forEach((x) => {
    const daftar = kelompok.get(x.batch_id);
    if (daftar) daftar.push(x);
    else kelompok.set(x.batch_id, [x]);
  });
  return Array.from(kelompok.values())
    .map((daftar) => ({
      ...ringkasSample(daftar),
      batch_id: daftar[0].batch_id,
      kode_batch: daftar[0].kode_batch,
      tanggal_kirim: daftar[0].tanggal_kirim,
      tujuan: daftar[0].tujuan,
      status_batch: daftar[0].status_batch,
    }))
    .sort((a, b) => b.tanggal_kirim.localeCompare(a.tanggal_kirim) || b.kode_batch.localeCompare(a.kode_batch));
}
