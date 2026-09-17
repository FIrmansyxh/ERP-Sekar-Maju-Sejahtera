import { Barang, StatusStokBarang, TransaksiItemBal, TransaksiPembelian } from '../types';
import { normalizeKg } from './formatters';

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
 * Status bal mengikuti tahap timbang: belum ditimbang berarti Proses Sortir, sudah
 * ditimbang berarti Di Gudang. Bal yang sedang menjadi sample atau sudah dikirim
 * tidak diubah statusnya.
 */
export function resolveStatusStok(prev: StatusStokBarang | undefined, beratKg: number | undefined): StatusStokBarang {
  if (prev === 'keluar' || prev === 'terkirim_sample') return prev;
  return (beratKg || 0) > 0 ? 'di_gudang' : 'proses_sortir';
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
    potongan_kuli: items.reduce((sum, it) => sum + (it.potongan_kuli ?? 7000), 0),
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
    tanggal_masuk: (tx.tanggal_transaksi || '').split(' ')[0] || prev?.tanggal_masuk || new Date().toISOString().split('T')[0],
    petani_id: tx.petani_id,
    nama_petani: tx.nama_petani,
    desa_kecamatan: tx.desa_kecamatan || prev?.desa_kecamatan,
    transaksi_pembelian_id: tx.transaksi_id,
    catatan: berat > 0
      ? `Timbang Kupon: ${tx.no_kupon}, Bruto: ${item.berat_bruto_kg || 0}kg, Netto: ${berat}kg`
      : `Sortir Kupon: ${tx.no_kupon}`,
  };
}

/** Field hasil timbang yang ditulis Timbangan; field sortir (No Bal, grade, harga) tidak disentuh */
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
  | 'lokasi_simpan'
>>;

/** Menerapkan hasil timbang satu bal ke versi kupon terbaru. Null bila bal sudah dihapus Sortir. */
export function terapkanHasilTimbang(
  latestTx: TransaksiPembelian,
  itemId: string,
  hasil: HasilTimbangBal
): TransaksiPembelian | null {
  const items = latestTx.items || [];
  if (!items.some((it) => it.item_id === itemId)) return null;
  const merged = items.map((it) => (it.item_id === itemId ? { ...it, ...hasil } : it));
  return hitungUlangKupon(latestTx, merged);
}
