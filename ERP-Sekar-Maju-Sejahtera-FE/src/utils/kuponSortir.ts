import { Barang, StatusStokBarang, TransaksiItemBal, TransaksiPembelian } from '../types';
import { normalizeKg } from './formatters';
import { POTONGAN_KULI_PER_BAL } from '../config/aturanTimbang';
import { isTransaksiLunas } from './statusBayar';
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
