import { Barang, StatusStokBarang, TransaksiItemBal, TransaksiPembelian } from '../types';
import { normalizeKg } from './formatters';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL } from '../config/aturanTimbang';
import { isTransaksiLunas } from './statusBayar';
import { balDihapusDariKupon, isIdBalServer } from './balDihapus';
import { hariIniLokal } from './rentangTanggal';

/**
 * Aturan kupon terbuka: Sortir dan Timbangan boleh mengerjakan kupon yang sama
 * secara paralel. Kupon disimpan sejak bal pertama discan (status_tahap
 * 'proses_sortir') dan setiap perubahan ditulis per bal, sehingga Sortir tidak
 * menimpa hasil timbang dan Timbangan tidak menghapus bal baru dari Sortir.
 */

export const isKuponProsesSortir = (tx?: Pick<TransaksiPembelian, 'status_tahap'> | null): boolean =>
  tx?.status_tahap === 'proses_sortir';

export const isBalDitimbang = (item: Pick<TransaksiItemBal, 'berat_kg'>): boolean => (item.berat_kg || 0) > 0;

/**
 * Bal susulan: bal yang baru datang setelah sortir/timbang kupon selesai. Boleh ditambahkan
 * selama kupon belum dibayar di Kasir. Mengembalikan alasan penolakan, atau null bila boleh.
 * Kupon yang masih Proses Sortir selalu boleh, karena Sortir memang belum ditutup.
 */
export function alasanBalSusulanDitolak(tx?: Pick<TransaksiPembelian, 'no_kupon' | 'status_pembayaran' | 'metode_pembayaran'> | null): string | null {
  if (!tx) return 'Kupon tidak ditemukan.';
  if (isTransaksiLunas(tx)) {
    return `Kupon ${tx.no_kupon} sudah lunas sehingga tidak bisa ditambah bal. Buat kupon baru untuk bal tersebut.`;
  }
  return null;
}

/**
 * Status bal mengikuti tahap timbang: belum ditimbang berarti Proses Sortir, sudah
 * ditimbang berarti Di Gudang. Bal yang sudah dikirim (keluar) tidak diubah statusnya.
 * Batch Sample / Reclass tidak pernah mengubah status bal, jadi tidak ada status khusus sample.
 */
export function resolveStatusStok(prev: StatusStokBarang | undefined, beratKg: number | undefined): StatusStokBarang {
  if (prev === 'keluar') return prev;
  return (beratKg || 0) > 0 ? 'di_gudang' : 'proses_sortir';
}

/**
 * Data lama: dulu bal yang masuk Batch Sample diberi status 'terkirim_sample' dan tertahan dari
 * pengiriman reguler. Sekarang Reclass hanya penentuan harga ulang, bal tetap di gudang sampai masuk
 * Surat Jalan, jadi status lama itu dikembalikan ke status stok biasa mengikuti tahap timbangnya.
 */
export function pulihkanStatusSampleLama<T extends Pick<Barang, 'status_stok' | 'berat_kg'>>(b: T): T {
  return b.status_stok === 'terkirim_sample' ? { ...b, status_stok: resolveStatusStok(undefined, b.berat_kg) } : b;
}

/**
 * Melengkapi daftar bal dengan bal dari kupon yang sudah disortir tetapi belum ada di daftar bal.
 *
 * Begitu bal disortir (sudah ada No Bal dan harga), bal itu sudah terkumpul dan boleh dipakai di Pengiriman Sample
 * serta tampil di Laporan Bal, walau belum ditimbang dan belum dibayar. Server baru membuat data bal saat kupon
 * dibayar, jadi tanpa ini bal yang belum lunas hilang dari daftar setiap kali data dimuat ulang dari server.
 * Pencocokan lewat No Bal (unik) supaya bal yang sudah ada di server tidak dobel.
 */
/**
 * Nomor urut bal dalam kupon, diambil dari akhiran item_id (mis. "TRX-...-BAL-02" -> 2), BUKAN dari
 * posisinya di larik (bisa berbeda kalau bal pernah ditambah/dihapus tidak berurutan) atau angka pada
 * No Bal (dua No Bal seperti "12A" dan "12B" bisa mengandung angka yang sama). Harus sama dengan aturan
 * di backend (TransaksiController::urutanDariItemId) supaya ID sementara ini nanti cocok dengan barang_id
 * sungguhan begitu kupon dibayar.
 */
function urutanDariItemId(itemId: string | undefined, fallback: number): number {
  const m = itemId ? itemId.match(/-BAL-(\d+)$/) : null;
  return m ? parseInt(m[1], 10) : fallback;
}

export function lengkapiBalDariKupon(barangList: Barang[], transaksiList: TransaksiPembelian[]): Barang[] {
  const ada = new Set<string>();
  for (const b of barangList) {
    if (b.barang_id) ada.add(b.barang_id.toUpperCase());
    if (b.no_bal) ada.add(b.no_bal.toUpperCase());
  }
  const baru: Barang[] = [];
  for (const tx of transaksiList) {
    (tx.items || []).forEach((it, idx) => {
      const noBal = String(it.no_bal || '').trim().toUpperCase();
      if (!noBal) return;
      const seq = urutanDariItemId(it.item_id, idx + 1);
      const idBal = it.barang_id || `BAL-${String(tx.transaksi_id || '').replace('TRX-', '')}-${String(seq).padStart(2, '0')}`;
      if (ada.has(noBal) || ada.has(idBal.toUpperCase())) return;
      ada.add(noBal);
      ada.add(idBal.toUpperCase());
      baru.push(buildBarangDariItem(tx, { ...it, barang_id: idBal }));
    });
  }
  return baru.length > 0 ? [...baru, ...barangList] : barangList;
}

/** Data lama menyimpan bal hasil sortir yang belum ditimbang sebagai 'di_gudang' */
export function normalizeStatusBal(list: Barang[]): Barang[] {
  let changed = false;
  const result = list.map((b) => {
    if (b.status_stok === 'di_gudang' && b.transaksi_pembelian_id && !((b.berat_kg || 0) > 0)) {
      changed = true;
      return { ...b, status_stok: 'proses_sortir' as const };
    }
    return b;
  });
  return changed ? result : list;
}

/** Nomor urut barang_id berikutnya pada kupon, aman walau ada bal yang pernah dihapus */
export function nextBarangId(txId: string, items: TransaksiItemBal[]): string {
  const prefix = `BAL-${txId.replace('TRX-', '')}-`;
  const maxSeq = items.reduce((max, it) => {
    const id = it.barang_id || '';
    if (!id.startsWith(prefix)) return max;
    const seq = parseInt(id.slice(prefix.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);
  return `${prefix}${String(Math.max(maxSeq, items.length) + 1).padStart(2, '0')}`;
}

/**
 * Menghitung ulang ringkasan kupon dari rincian bal.
 * Kupon yang masih Proses Sortir tetap berstatus itu walaupun semua bal sudah ditimbang.
 */
export function hitungUlangKupon(tx: TransaksiPembelian, items: TransaksiItemBal[]): TransaksiPembelian {
  const weighedCount = items.filter(isBalDitimbang).length;
  const allWeighed = items.length > 0 && weighedCount === items.length;
  const totalNetto = normalizeKg(items.reduce((sum, it) => sum + (it.berat_kg || 0), 0));
  const totalBruto = normalizeKg(items.reduce((sum, it) => sum + (it.berat_bruto_kg || 0), 0));
  const totalKotor = items.reduce((sum, it) => sum + (it.total_kotor || 0), 0);
  const grades = Array.from(new Set(items.map((it) => it.kode_grade).filter(Boolean)));
  const avgHarga = items.length > 0
    ? Math.round(items.reduce((sum, it) => sum + (it.harga_per_kg || 0), 0) / items.length)
    : 0;

  const prosesSortir = isKuponProsesSortir(tx);

  return {
    ...tx,
    items,
    barang_ids: items.map((it) => it.barang_id).filter((id): id is string => Boolean(id)),
    no_bal: items.map((it) => it.no_bal).join(', '),
    kode_grade: grades.length === 1 ? grades[0] : grades.length > 1 ? `Multi (${grades.join(', ')})` : '-',
    total_bal: items.length,
    bal_selesai_timbang: weighedCount,
    berat_terukur_kg: totalBruto,
    berat_kg: totalNetto,
    harga_per_kg: totalNetto > 0 ? Math.round(totalKotor / totalNetto) : avgHarga,
    total_kotor: totalKotor,
    potongan_tara_kg: normalizeKg(items.reduce((sum, it) => sum + (it.potongan_tara_kg || 0), 0)),
    potongan_kuli: items.reduce((sum, it) => sum + (it.potongan_kuli ?? POTONGAN_KULI_PER_BAL), 0),
    potongan_tali: items.reduce((sum, it) => sum + (it.potongan_tali ?? 3000), 0),
    potongan_tikar: items.reduce((sum, it) => sum + (it.potongan_tikar || 0), 0),
    total_potongan: items.reduce((sum, it) => sum + (it.potongan || 0), 0),
    total_harga_beli: totalKotor,
    harga_final: items.reduce((sum, it) => sum + (it.subtotal_bersih || 0), 0),
    status_transaksi: !prosesSortir && allWeighed ? 'lengkap' : 'menunggu',
    status_tahap: prosesSortir ? 'proses_sortir' : allWeighed ? 'lengkap' : 'menunggu_timbang',
  };
}

/** Data inventaris untuk satu bal, mempertahankan data lama seperti status sample/kirim */
export function buildBarangDariItem(tx: TransaksiPembelian, item: TransaksiItemBal, prev?: Barang): Barang {
  const berat = item.berat_kg || 0;
  return {
    ...prev,
    barang_id: item.barang_id!,
    no_bal: item.no_bal,
    kode_grade: item.kode_grade,
    berat_kg: berat,
    berat_bruto_kg: item.berat_bruto_kg || 0,
    potongan_tara_kg: item.potongan_tara_kg || 0,
    harga_per_kg: item.harga_per_kg,
    total_harga: berat * (item.harga_per_kg || 0),
    status_stok: resolveStatusStok(prev?.status_stok, berat),
    tanggal_masuk: (tx.tanggal_transaksi || '').split(' ')[0] || prev?.tanggal_masuk || hariIniLokal(),
    petani_id: tx.petani_id,
    nama_petani: tx.nama_petani,
    desa_kecamatan: tx.desa_kecamatan || prev?.desa_kecamatan,
    transaksi_pembelian_id: tx.transaksi_id,
    catatan: berat > 0
      ? `Timbang Kupon: ${tx.no_kupon}, Bruto: ${item.berat_bruto_kg || 0}kg, Netto: ${berat}kg`
      : `Sortir Kupon: ${tx.no_kupon}`,
  };
}

/** Gabungkan dua versi kupon paralel (Sortir + Timbangan) tanpa kehilangan bal. */
/**
 * Lama perlindungan perubahan berat lokal: selama jangka ini data dari server/versi lama
 * yang belum memuat perubahan tersebut tidak boleh menimpanya.
 */
export const BATAS_PERUBAHAN_LOKAL_MS = 5 * 60 * 1000;

export interface OpsiGabungKupon {
  /**
   * `incoming` adalah isi kupon apa adanya dari server (bukan simpanan dari layar). Bal ber-ID server di `prev`
   * yang tidak ada lagi di server berarti sudah dihapus di perangkat lain, jadi tidak dibawa kembali.
   */
  incomingDariServer?: boolean;
}

/**
 * Siapa yang menang antara dua cap waktu perubahan disengaja. Cap waktu dari server (yang disimpan server sejak
 * 2026-09-23) dan dari layar bisa dibandingkan langsung: yang lebih baru menang. Bila hanya satu sisi punya cap
 * waktu (server lama / data lama), sisi itu menang hanya selama BATAS_PERUBAHAN_LOKAL_MS.
 * Mengembalikan 'lama', 'baru', atau null (tidak ada yang bisa memutuskan).
 */
function pemenangCapWaktu(capLama: number, capBaru: number): 'lama' | 'baru' | null {
  if (capLama > 0 && capBaru > 0) return capBaru >= capLama ? 'baru' : 'lama';
  const sekarang = Date.now();
  if (capBaru > 0 && sekarang - capBaru < BATAS_PERUBAHAN_LOKAL_MS) return 'baru';
  if (capLama > 0 && sekarang - capLama < BATAS_PERUBAHAN_LOKAL_MS) return 'lama';
  return null;
}

/** Gabungan berat & field sortir satu bal dari dua versi (ganti tikar diputuskan terpisah oleh pilihGantiTikar). */
function gabungBeratBal(old: TransaksiItemBal, it: TransaksiItemBal): TransaksiItemBal {
  // Perubahan berat yang disengaja (timbang, buka kunci, koreksi) memakai tanda waktu:
  // yang paling baru menang, termasuk berat turun atau kembali 0 saat kunci dibuka.
  const pemenang = pemenangCapWaktu(old.diubah_lokal_pada || 0, it.diubah_lokal_pada || 0);
  if (pemenang === 'baru') {
    return { ...old, ...it, item_id: it.item_id || old.item_id, barang_id: it.barang_id || old.barang_id };
  }
  if (pemenang === 'lama') {
    return {
      ...it,
      ...old,
      item_id: old.item_id || it.item_id,
      barang_id: old.barang_id || it.barang_id,
      kode_grade: it.kode_grade || old.kode_grade,
      harga_per_kg: it.harga_per_kg || old.harga_per_kg,
    };
  }

  const oldW = old.berat_kg || 0;
  const newW = it.berat_kg || 0;
  if (newW >= oldW) {
    return {
      ...old,
      ...it,
      item_id: it.item_id || old.item_id,
      barang_id: it.barang_id || old.barang_id,
      // Pertahankan hasil timbang yang lebih berat
      berat_kg: newW > 0 ? it.berat_kg : old.berat_kg,
      berat_bruto_kg: (it.berat_bruto_kg || 0) > 0 ? it.berat_bruto_kg : old.berat_bruto_kg,
      potongan_tara_kg: (it.berat_kg || 0) > 0 ? it.potongan_tara_kg : old.potongan_tara_kg,
      status_timbang: newW > 0 ? it.status_timbang || 'selesai_timbang' : old.status_timbang,
    };
  }
  return {
    ...it,
    ...old,
    item_id: old.item_id || it.item_id,
    barang_id: old.barang_id || it.barang_id,
    // Field sortir dari incoming jika ada update grade/harga
    kode_grade: it.kode_grade || old.kode_grade,
    harga_per_kg: it.harga_per_kg || old.harga_per_kg,
  };
}

const gtAktif = (it: Pick<TransaksiItemBal, 'ganti_tikar' | 'potongan_tikar'>): boolean =>
  Boolean(it.ganti_tikar) || (Number(it.potongan_tikar) || 0) > 0;

/**
 * Menentukan ganti tikar (GT) satu bal dari dua versi, terpisah dari berat.
 *
 * Dulu GT ikut "pemenang" berat: hasil timbang di Timbangan (bertanda waktu baru) membawa GT dari salinan layar
 * yang basi, sehingga GT yang baru dicentang dari Sortir/perangkat lain kembali tidak tercentang beberapa saat
 * kemudian. Sekarang GT memakai cap waktunya sendiri (`gt_diubah_pada`, diisi hanya saat GT sengaja diubah):
 * yang lebih baru menang. Tanpa cap waktu yang bisa memutuskan: data server menjadi acuan saat `incoming` berasal
 * dari server; di antara dua salinan lokal, GT yang aktif di salah satunya dipertahankan (aturan lama).
 */
export function pilihGantiTikar(
  hasil: TransaksiItemBal,
  lama: TransaksiItemBal,
  baru: TransaksiItemBal,
  opsi: OpsiGabungKupon = {}
): TransaksiItemBal {
  const capLama = lama.gt_diubah_pada || 0;
  const capBaru = baru.gt_diubah_pada || 0;
  const pemenang = pemenangCapWaktu(capLama, capBaru);
  let gt: boolean;
  let tarif: number;
  if (pemenang) {
    const sumber = pemenang === 'baru' ? baru : lama;
    gt = gtAktif(sumber);
    tarif = Number(sumber.potongan_tikar) || 0;
  } else if (opsi.incomingDariServer) {
    gt = gtAktif(baru);
    tarif = Number(baru.potongan_tikar) || 0;
  } else {
    gt = gtAktif(lama) || gtAktif(baru);
    tarif = Math.max(Number(lama.potongan_tikar) || 0, Number(baru.potongan_tikar) || 0);
  }
  const potTikar = gt ? tarif || POTONGAN_GANTI_TIKAR : 0;
  const kuli = hasil.potongan_kuli ?? POTONGAN_KULI_PER_BAL;
  const tali = hasil.potongan_tali ?? 3000;
  const potongan = kuli + tali + potTikar;
  const cap =
    pemenang === 'baru' ? capBaru : pemenang === 'lama' ? capLama : opsi.incomingDariServer ? capBaru : Math.max(capLama, capBaru);
  return {
    ...hasil,
    ganti_tikar: gt,
    potongan_tikar: potTikar,
    potongan,
    subtotal_bersih: (hasil.berat_kg || 0) > 0 ? Math.max(0, (hasil.total_kotor || 0) - potongan) : 0,
    gt_diubah_pada: cap > 0 ? cap : undefined,
  };
}
/**
 * Grade & harga bal mengikuti `incoming` (lihat gabungBeratBal), kecuali grade yang sengaja diganti di Sortir
 * (`grade_diubah_pada`): yang lebih baru menang. Tanpa ini, penggabungan dengan versi server sesaat sebelum kirim
 * (erpApi.syncTransaksi) mengembalikan grade yang baru diedit ke grade lama server.
 */
function pilihGrade(hasil: TransaksiItemBal, lama: TransaksiItemBal, baru: TransaksiItemBal): TransaksiItemBal {
  const pemenang = pemenangCapWaktu(lama.grade_diubah_pada || 0, baru.grade_diubah_pada || 0);
  if (!pemenang) return hasil;
  const { kode_grade, harga_per_kg, grade_diubah_pada } = pemenang === 'baru' ? baru : lama;
  return { ...hasil, kode_grade, harga_per_kg, grade_diubah_pada };
}

export function mergeKuponParalel(
  prev: TransaksiPembelian | undefined,
  incoming: TransaksiPembelian,
  opsi: OpsiGabungKupon = {}
): TransaksiPembelian {
  // Bal yang dihapus di perangkat ini tidak boleh terbawa balik dari salinan mana pun
  const dihapus = balDihapusDariKupon(incoming.transaksi_id);
  const masihAda = (it: TransaksiItemBal) => !dihapus.has(String(it.no_bal).toUpperCase());

  if (!prev || prev.transaksi_id !== incoming.transaksi_id) {
    return hitungUlangKupon(incoming, (incoming.items || []).filter(masihAda));
  }

  const incomingItemIds = new Map<string, TransaksiItemBal>();
  const incomingBarangIds = new Map<string, TransaksiItemBal>();
  const incomingNoBal = new Set<string>();
  for (const it of incoming.items || []) {
    if (it.item_id) incomingItemIds.set(it.item_id, it);
    if (it.barang_id) incomingBarangIds.set(it.barang_id, it);
    incomingNoBal.add(String(it.no_bal).toUpperCase());
  }

  const byNoBal = new Map<string, TransaksiItemBal>();
  // Entri incoming bernomor lama yang kalah dari ganti No Bal yang lebih baru di prev
  const incomingDilewati = new Set<TransaksiItemBal>();
  for (const it of prev.items || []) {
    if (!masihAda(it)) continue;
    const matchedIncoming = (it.item_id && incomingItemIds.get(it.item_id))
      || (it.barang_id && incomingBarangIds.get(it.barang_id));
    if (matchedIncoming && String(matchedIncoming.no_bal).toUpperCase() !== String(it.no_bal).toUpperCase()) {
      // Bal yang sama dengan No Bal berbeda: ganti nomor yang bertanda waktu lebih baru yang dipakai.
      // Tanpa tanda waktu, nomor dari incoming yang dipakai (perilaku lama).
      if ((it.diubah_lokal_pada || 0) > (matchedIncoming.diubah_lokal_pada || 0)) {
        incomingDilewati.add(matchedIncoming);
      } else {
        continue;
      }
    } else if (
      !matchedIncoming &&
      opsi.incomingDariServer &&
      isIdBalServer(it.item_id) &&
      !incomingNoBal.has(String(it.no_bal).toUpperCase())
    ) {
      // Bal pernah tersimpan di server tetapi sekarang tidak ada lagi di sana: dihapus dari perangkat lain
      continue;
    }
    byNoBal.set(String(it.no_bal).toUpperCase(), it);
  }
  for (const it of incoming.items || []) {
    if (!masihAda(it) || incomingDilewati.has(it)) continue;
    const key = String(it.no_bal).toUpperCase();
    const old = byNoBal.get(key);
    if (!old) {
      byNoBal.set(key, it);
      continue;
    }
    byNoBal.set(key, pilihGrade(pilihGantiTikar(gabungBeratBal(old, it), old, it, opsi), old, it));
  }

  const rank: Record<string, number> = { proses_sortir: 1, menunggu_timbang: 2, lengkap: 3 };
  const prevRank = rank[prev.status_tahap ?? ''] || 0;
  const incRank = rank[incoming.status_tahap ?? ''] || 0;
  const status_tahap =
    incRank >= prevRank ? incoming.status_tahap : prev.status_tahap;

  return hitungUlangKupon(
    {
      ...prev,
      ...incoming,
      status_tahap,
      // Pembayaran lunas dari salah satu sisi menang
      status_pembayaran:
        incoming.status_pembayaran === 'lunas' || prev.status_pembayaran === 'lunas'
          ? 'lunas'
          : incoming.status_pembayaran || prev.status_pembayaran,
    },
    Array.from(byNoBal.values())
  );
}
export type HasilTimbangBal = Partial<Pick<
  TransaksiItemBal,
  | 'berat_bruto_kg'
  | 'potongan_tara_kg'
  | 'berat_kg'
  | 'is_netto_manual'
  | 'ganti_tikar'
  | 'potongan_kuli'
  | 'potongan_tali'
  | 'potongan_tikar'
  | 'potongan'
  | 'total_kotor'
  | 'subtotal_bersih'
  | 'status_timbang'
  | 'diubah_lokal_pada'
>>;

/** Menerapkan hasil timbang satu bal ke versi kupon terbaru. Null bila bal sudah dihapus Sortir. */
export function terapkanHasilTimbang(
  latestTx: TransaksiPembelian,
  itemId: string,
  hasil: HasilTimbangBal,
  noBalHint?: string
): TransaksiPembelian | null {
  const items = latestTx.items || [];
  let targetId = itemId;
  if (!items.some((it) => it.item_id === targetId) && noBalHint) {
    const byBal = items.find(
      (it) => String(it.no_bal).toUpperCase() === String(noBalHint).toUpperCase()
    );
    if (byBal) targetId = byBal.item_id;
  }
  if (!items.some((it) => it.item_id === targetId)) return null;
  const merged = items.map((it) => (it.item_id === targetId ? { ...it, ...hasil } : it));
  return hitungUlangKupon(latestTx, merged);
}

/**
 * Urutan tampil detail bal = urutan waktu input.
 * Prioritas: seq BE `-BAL-nn` → timestamp di `BAL-ITEM-{ts}-n` / `item-{ts}-n` → angka no_bal.
 */
function itemInputSortKey(itemId?: string, noBal?: string): [number, number, string] {
  const id = String(itemId || '');
  const balSeq = id.match(/-BAL-(\d+)$/i);
  if (balSeq) {
    return [0, parseInt(balSeq[1], 10), id];
  }
  const feTs = id.match(/^(?:BAL-ITEM|item)-(\d+)(?:-(\d+))?$/i);
  if (feTs) {
    const ts = parseInt(feTs[1], 10);
    const n = feTs[2] ? parseInt(feTs[2], 10) : 0;
    return [1, ts * 1000 + n, id];
  }
  const digits = String(noBal || '').match(/(\d+)/);
  if (digits) {
    return [2, parseInt(digits[1], 10), String(noBal || '')];
  }
  return [3, 0, String(noBal || id)];
}

export function sortTransaksiItemsByInputOrder<T extends { item_id?: string; no_bal?: string } = any>(
  items?: T[] | null
): T[] {
  if (!items || !Array.isArray(items) || items.length <= 1) return items ? [...items] : [];
  return [...items].sort((a, b) => {
    const ka = itemInputSortKey(a.item_id, a.no_bal);
    const kb = itemInputSortKey(b.item_id, b.no_bal);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2].localeCompare(kb[2], undefined, { numeric: true, sensitivity: 'base' });
  });
}
