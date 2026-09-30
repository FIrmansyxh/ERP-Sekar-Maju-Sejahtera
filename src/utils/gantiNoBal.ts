import type {
  Barang,
  BatchPengirimanSample,
  PengirimanBarang,
  RiwayatNoBal,
  TahapGantiNoBal,
  TransaksiItemBal,
  TransaksiPembelian,
} from '../types';
import { hitungUlangKupon, isBalDitimbang } from './kuponSortir';
import { isTransaksiLunas } from './statusBayar';
import { akhiranUnik } from './idUnik';

/**
 * Koreksi No Bal: mengganti nomor bal sambil menyimpan nomor lama.
 *
 * Aturan (keputusan pemilik, 2026-09-30):
 *  - Boleh diganti di semua tahap, kecuali bal yang Surat Jalannya sudah Selesai.
 *  - Tara, netto, dan nilai TIDAK dihitung ulang walau jenis awalan berubah (mis. HF -> SB): nilai tembakau ditentukan
 *    saat pembelian. Saat bal dikirim, bruto ditimbang ulang dan dipotong mengikuti aturan tujuan (Atur Netto di DO).
 *  - Kupon belum lunas: No Bal di kupon ikut berganti, jadi nota yang dicetak nanti memakai nomor baru.
 *  - Kupon lunas: nota, Kasir, dan Laporan Pembelian tetap memakai nomor lama; berat dan nilai tidak diubah. Hanya bal
 *    di gudang (stok, Batch Sample, Surat Jalan, Laporan Bal) yang memakai nomor baru.
 *  - Rekap per kode bal mengikuti awalan No Bal terakhir.
 *  - Sebuah No Bal, baik dari awal maupun dari penggantian, tidak boleh dipakai dua kali.
 */

export const normalisasiNoBal = (noBal?: string): string => String(noBal || '').trim().replace(/-/g, '').toUpperCase();
const kunci = (noBal?: string): string => String(noBal || '').trim().toUpperCase();

export const LABEL_TAHAP_GANTI: Record<TahapGantiNoBal, string> = {
  sortir: 'Sortir',
  timbang: 'Ditimbang',
  lunas: 'Lunas',
  surat_jalan: 'Surat Jalan',
};

export interface SumberKoreksi {
  transaksiList: TransaksiPembelian[];
  barangList: Barang[];
  pengirimanList: PengirimanBarang[];
  batchSampleList?: BatchPengirimanSample[];
  riwayat: RiwayatNoBal[];
}

export interface BalKoreksi {
  tx: TransaksiPembelian;
  item: TransaksiItemBal;
  barang?: Barang;
  /** Nomor yang berlaku sekarang (gudang, sample, Surat Jalan, Laporan Bal) */
  noBalSekarang: string;
  /** Nomor di kupon/nota (sama dengan nomor sekarang selama kupon belum lunas) */
  noBalNota: string;
  /** Nomor pertama kali bal ini disortir */
  noBalAwal: string;
  lunas: boolean;
  tahap: TahapGantiNoBal;
  suratJalan?: PengirimanBarang;
  /** Alasan bal tidak boleh diganti nomornya; null bila boleh */
  alasanTerkunci: string | null;
}

/** Peta nomor lama -> nomor baru dan sebaliknya dari riwayat. */
function petaRiwayat(riwayat: RiwayatNoBal[]) {
  const maju = new Map<string, string>();
  const mundur = new Map<string, string>();
  const urut = [...riwayat].sort((a, b) => String(a.diganti_pada).localeCompare(String(b.diganti_pada)));
  for (const r of urut) {
    const lama = kunci(r.no_bal_lama);
    const baru = kunci(r.no_bal_baru);
    if (!lama || !baru || lama === baru) continue;
    maju.set(lama, baru);
    mundur.set(baru, lama);
  }
  return { maju, mundur };
}

/** Mengikuti rantai penggantian (dengan batas agar data rusak tidak membuat putaran tanpa akhir). */
function ikuti(peta: Map<string, string>, awal: string): string {
  let hasil = kunci(awal);
  const dilihat = new Set<string>([hasil]);
  for (let i = 0; i < 50; i++) {
    const berikut = peta.get(hasil);
    if (!berikut || dilihat.has(berikut)) break;
    dilihat.add(berikut);
    hasil = berikut;
  }
  return hasil;
}

/** Nomor pertama kali bal dengan nomor ini disortir (nomor itu sendiri bila belum pernah diganti). */
export function noBalAwalDari(noBal: string, riwayat: RiwayatNoBal[]): string {
  return ikuti(petaRiwayat(riwayat).mundur, noBal);
}

/** Semua nomor yang pernah dipakai bal dengan nomor ini, dari yang pertama sampai yang terakhir. */
export function rantaiNoBal(noBal: string, riwayat: RiwayatNoBal[]): string[] {
  const { maju } = petaRiwayat(riwayat);
  const awal = noBalAwalDari(noBal, riwayat);
  const hasil = [awal];
  let sekarang = awal;
  for (let i = 0; i < 50; i++) {
    const berikut = maju.get(sekarang);
    if (!berikut || hasil.includes(berikut)) break;
    hasil.push(berikut);
    sekarang = berikut;
  }
  return hasil;
}

/** Indeks bal gudang & Surat Jalan sekali hitung, supaya pencocokan per bal tidak menyisir seluruh daftar. */
function indeksSumber(sumber: SumberKoreksi) {
  const barangPerId = new Map<string, Barang>();
  const barangPerNo = new Map<string, Barang[]>();
  for (const b of sumber.barangList) {
    barangPerId.set(b.barang_id, b);
    const k = kunci(b.no_bal);
    if (!k) continue;
    const daftar = barangPerNo.get(k);
    if (daftar) daftar.push(b);
    else barangPerNo.set(k, [b]);
  }
  const sjPerBarang = new Map<string, PengirimanBarang[]>();
  for (const p of sumber.pengirimanList) {
    for (const id of p.barang_ids || []) {
      const daftar = sjPerBarang.get(id);
      if (daftar) daftar.push(p);
      else sjPerBarang.set(id, [p]);
    }
  }
  return { barangPerId, barangPerNo, sjPerBarang };
}

function cariBarang(
  tx: TransaksiPembelian,
  item: TransaksiItemBal,
  indeks: ReturnType<typeof indeksSumber>,
  nomorTerakhir: string
): Barang | undefined {
  if (item.barang_id) {
    const byId = indeks.barangPerId.get(item.barang_id);
    if (byId) return byId;
  }
  const milikKupon = (b: Barang) => !b.transaksi_pembelian_id || b.transaksi_pembelian_id === tx.transaksi_id;
  return (
    (indeks.barangPerNo.get(nomorTerakhir) || []).find(milikKupon) ||
    (indeks.barangPerNo.get(kunci(item.no_bal)) || []).find(milikKupon)
  );
}

function suratJalanBal(
  barang: Barang | undefined,
  sjPerBarang: Map<string, PengirimanBarang[]>
): { aktif?: PengirimanBarang; selesai?: PengirimanBarang } {
  if (!barang) return {};
  const berisi = sjPerBarang.get(barang.barang_id) || [];
  return {
    selesai: berisi.find((p) => p.status === 'selesai'),
    aktif: berisi.find((p) => p.status !== 'selesai') || berisi[berisi.length - 1],
  };
}

/** Semua bal dari kupon beserta nomor sekarang, nomor nota, nomor awal, tahap, dan kuncinya. */
export function daftarBalKoreksi(sumber: SumberKoreksi): BalKoreksi[] {
  const { maju, mundur } = petaRiwayat(sumber.riwayat);
  const indeks = indeksSumber(sumber);
  const hasil: BalKoreksi[] = [];
  for (const tx of sumber.transaksiList) {
    const lunas = isTransaksiLunas(tx);
    for (const item of tx.items || []) {
      if (!item.no_bal) continue;
      const nomorTerakhir = ikuti(maju, item.no_bal);
      const barang = cariBarang(tx, item, indeks, nomorTerakhir);
      const noBalSekarang = lunas ? kunci(barang?.no_bal || nomorTerakhir) : kunci(item.no_bal);
      const { aktif, selesai } = suratJalanBal(barang, indeks.sjPerBarang);
      const suratJalan = selesai || aktif;
      const tahap: TahapGantiNoBal = suratJalan ? 'surat_jalan' : lunas ? 'lunas' : isBalDitimbang(item) ? 'timbang' : 'sortir';
      hasil.push({
        tx,
        item,
        barang,
        noBalSekarang,
        noBalNota: kunci(item.no_bal),
        noBalAwal: ikuti(mundur, noBalSekarang),
        lunas,
        tahap,
        suratJalan,
        alasanTerkunci: selesai
          ? `Bal ${noBalSekarang} sudah terkirim lewat Surat Jalan ${selesai.no_surat_jalan} yang berstatus Selesai.`
          : null,
      });
    }
  }
  return hasil;
}

/**
 * Mencari bal dari No Bal sekarang, nomor di nota, atau nomor lama mana pun yang pernah dipakainya. `daftar` boleh
 * diisi hasil daftarBalKoreksi yang sudah dihitung pemanggil.
 */
export function cariBalKoreksi(noBal: string, sumber: SumberKoreksi, daftar: BalKoreksi[] = daftarBalKoreksi(sumber)): BalKoreksi | null {
  const q = normalisasiNoBal(noBal);
  if (!q) return null;
  const langsung = daftar.find((b) => b.noBalSekarang === q) || daftar.find((b) => b.noBalNota === q);
  if (langsung) return langsung;
  // Nomor lama: ikuti rantai penggantian dari q sampai nomor terakhir, lalu cari bal bernomor itu
  const terakhir = ikuti(petaRiwayat(sumber.riwayat).maju, q);
  return terakhir !== q ? daftar.find((b) => b.noBalSekarang === terakhir || b.noBalNota === terakhir) || null : null;
}

/** Semua No Bal yang pernah dipakai: nomor di kupon, di gudang, di Batch Sample, dan semua nomor di riwayat. */
export function noBalTerpakai(sumber: SumberKoreksi): Set<string> {
  const hasil = new Set<string>();
  const tambah = (n?: string) => {
    const k = normalisasiNoBal(n);
    if (k) hasil.add(k);
  };
  sumber.transaksiList.forEach((tx) => (tx.items || []).forEach((it) => tambah(it.no_bal)));
  sumber.barangList.forEach((b) => tambah(b.no_bal));
  (sumber.batchSampleList || []).forEach((b) => (b.items || []).forEach((it) => tambah(it.no_bal)));
  sumber.riwayat.forEach((r) => {
    tambah(r.no_bal_lama);
    tambah(r.no_bal_baru);
  });
  return hasil;
}

/** Alasan No Bal baru ditolak; null bila boleh dipakai. `terpakai` boleh diisi hasil noBalTerpakai yang sudah dihitung. */
export function alasanNoBalBaruDitolak(
  noBalBaru: string,
  bal: BalKoreksi,
  sumber: SumberKoreksi,
  terpakai: Set<string> = noBalTerpakai(sumber)
): string | null {
  const baru = normalisasiNoBal(noBalBaru);
  if (!baru) return 'No Bal baru wajib diisi.';
  if (baru === bal.noBalSekarang) return 'No Bal baru sama dengan No Bal sekarang.';
  if (terpakai.has(baru)) return `No Bal ${baru} sudah pernah dipakai. Satu No Bal tidak boleh dipakai dua kali.`;
  return null;
}

export interface RencanaGantiNoBal {
  riwayat: RiwayatNoBal;
  /** Isi bal di kupon setelah diganti; hanya bila kupon belum lunas (No Bal di kupon ikut berganti) */
  itemBaru?: TransaksiItemBal;
}

export function siapkanGantiNoBal(
  bal: BalKoreksi,
  noBalBaru: string,
  alasan: string,
  digantiOleh: string,
  sekarang: Date = new Date()
): RencanaGantiNoBal {
  const baru = normalisasiNoBal(noBalBaru);
  const ubahNota = !bal.lunas;
  const riwayat: RiwayatNoBal = {
    riwayat_id: `RNB-${sekarang.getTime()}-${akhiranUnik()}`,
    transaksi_id: bal.tx.transaksi_id,
    item_id: bal.item.item_id,
    barang_id: bal.barang?.barang_id || bal.item.barang_id,
    no_kupon: bal.tx.no_kupon,
    petani_id: bal.tx.petani_id,
    nama_petani: bal.tx.nama_petani,
    no_bal_lama: bal.noBalSekarang,
    no_bal_baru: baru,
    tahap: bal.tahap,
    ubah_nota: ubahNota,
    alasan: alasan.trim(),
    diganti_oleh: digantiOleh,
    diganti_pada: sekarang.toISOString(),
  };
  if (!ubahNota) return { riwayat };

  // Hanya nomornya yang berganti: tara, netto, dan nilai tetap hasil timbang saat pembelian
  const it = bal.item;
  const itemBaru: TransaksiItemBal = {
    ...it,
    no_bal: baru,
    barcode: !it.barcode || kunci(it.barcode) === kunci(it.no_bal) ? baru : it.barcode,
    diubah_lokal_pada: sekarang.getTime(),
  };
  return { riwayat, itemBaru };
}

export interface DataGantiNoBal {
  transaksiList: TransaksiPembelian[];
  barangList: Barang[];
  batchSampleList: BatchPengirimanSample[];
}

/**
 * Menerapkan penggantian ke daftar di layar. Aman diulang (dipakai juga untuk menimpa data server yang belum memuat
 * penggantian yang masih di antrean): hanya bal yang masih bernomor lama yang diubah.
 */
export function terapkanGantiNoBal<T extends Partial<DataGantiNoBal>>(data: T, rencana: RencanaGantiNoBal): T {
  const { riwayat: r, itemBaru } = rencana;
  const lama = kunci(r.no_bal_lama);
  const baru = kunci(r.no_bal_baru);
  const hasil: T = { ...data };

  if (data.transaksiList && r.ubah_nota && itemBaru) {
    let berubah = false;
    const next = data.transaksiList.map((tx) => {
      if (tx.transaksi_id !== r.transaksi_id) return tx;
      const items = tx.items || [];
      const idx = items.findIndex((it) => it.item_id === r.item_id && kunci(it.no_bal) === lama);
      const cadangan = idx >= 0 ? idx : items.findIndex((it) => kunci(it.no_bal) === lama);
      if (cadangan < 0) return tx;
      berubah = true;
      const it = items[cadangan];
      const diganti: TransaksiItemBal = {
        ...it,
        no_bal: itemBaru.no_bal,
        barcode: itemBaru.barcode,
        diubah_lokal_pada: Math.max(it.diubah_lokal_pada || 0, itemBaru.diubah_lokal_pada || 0) || undefined,
      };
      return hitungUlangKupon(tx, items.map((x, i) => (i === cadangan ? diganti : x)));
    });
    if (berubah) hasil.transaksiList = next;
  }

  if (data.barangList) {
    let berubah = false;
    const next = data.barangList.map((b) => {
      const cocok = (r.barang_id && b.barang_id === r.barang_id) || (b.transaksi_pembelian_id === r.transaksi_id && kunci(b.no_bal) === lama);
      if (!cocok || kunci(b.no_bal) !== lama) return b;
      berubah = true;
      return { ...b, no_bal: baru, barcode: !b.barcode || kunci(b.barcode) === lama ? baru : b.barcode };
    });
    if (berubah) hasil.barangList = next;
  }

  if (data.batchSampleList) {
    let berubah = false;
    const next = data.batchSampleList.map((batch) => {
      if (!(batch.items || []).some((it) => kunci(it.no_bal) === lama && (!r.barang_id || it.barang_id === r.barang_id))) return batch;
      berubah = true;
      return {
        ...batch,
        items: batch.items.map((it) =>
          kunci(it.no_bal) === lama && (!r.barang_id || it.barang_id === r.barang_id)
            ? {
                ...it,
                no_bal: baru,
                // No Jadi yang dulu diisi otomatis sama dengan No Bal ikut berganti; No Jadi khusus pembeli tetap
                kode_bal_pembeli: kunci(it.kode_bal_pembeli) === lama ? baru : it.kode_bal_pembeli,
              }
            : it
        ),
      };
    });
    if (berubah) hasil.batchSampleList = next;
  }

  return hasil;
}
