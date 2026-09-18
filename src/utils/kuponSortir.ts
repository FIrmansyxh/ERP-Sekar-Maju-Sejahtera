import { Barang, StatusStokBarang, TransaksiItemBal, TransaksiPembelian } from '../types';
import { normalizeKg } from './formatters';
import { POTONGAN_KULI_PER_BAL } from '../config/aturanTimbang';

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

/** Gabungkan dua versi kupon paralel (Sortir + Timbangan) tanpa kehilangan bal. */
/**
 * Lama perlindungan perubahan berat lokal: selama jangka ini data dari server/versi lama
 * yang belum memuat perubahan tersebut tidak boleh menimpanya.
 */
export const BATAS_PERUBAHAN_LOKAL_MS = 5 * 60 * 1000;

export function mergeKuponParalel(
  prev: TransaksiPembelian | undefined,
  incoming: TransaksiPembelian
): TransaksiPembelian {
  if (!prev || prev.transaksi_id !== incoming.transaksi_id) {
    return hitungUlangKupon(incoming, incoming.items || []);
  }

  const byNoBal = new Map<string, TransaksiItemBal>();
  for (const it of prev.items || []) {
    byNoBal.set(String(it.no_bal).toUpperCase(), it);
  }
  for (const it of incoming.items || []) {
    const key = String(it.no_bal).toUpperCase();
    const old = byNoBal.get(key);
    if (!old) {
      byNoBal.set(key, it);
      continue;
    }
    // Perubahan berat yang disengaja (timbang, buka kunci, koreksi) memakai tanda waktu:
    // yang paling baru menang, termasuk berat turun atau kembali 0 saat kunci dibuka.
    const stampOld = old.diubah_lokal_pada || 0;
    const stampNew = it.diubah_lokal_pada || 0;
    if (stampNew > stampOld) {
      byNoBal.set(key, {
        ...old,
        ...it,
        item_id: it.item_id || old.item_id,
        barang_id: it.barang_id || old.barang_id,
      });
      continue;
    }
    if (stampOld > stampNew && Date.now() - stampOld < BATAS_PERUBAHAN_LOKAL_MS) {
      byNoBal.set(key, {
        ...it,
        ...old,
        item_id: old.item_id || it.item_id,
        barang_id: old.barang_id || it.barang_id,
        kode_grade: it.kode_grade || old.kode_grade,
        harga_per_kg: it.harga_per_kg || old.harga_per_kg,
      });
      continue;
    }

    const oldW = old.berat_kg || 0;
    const newW = it.berat_kg || 0;
    if (newW >= oldW) {
      const potTikar = Math.max(Number(it.potongan_tikar) || 0, Number(old.potongan_tikar) || 0);
      const gantiTikar =
        Boolean(it.ganti_tikar) ||
        Boolean(old.ganti_tikar) ||
        potTikar > 0;
      byNoBal.set(key, {
        ...old,
        ...it,
        item_id: it.item_id || old.item_id,
        barang_id: it.barang_id || old.barang_id,
        // Pertahankan hasil timbang yang lebih berat
        berat_kg: newW > 0 ? it.berat_kg : old.berat_kg,
        berat_bruto_kg: (it.berat_bruto_kg || 0) > 0 ? it.berat_bruto_kg : old.berat_bruto_kg,
        potongan_tara_kg: (it.berat_kg || 0) > 0 ? it.potongan_tara_kg : old.potongan_tara_kg,
        status_timbang: newW > 0 ? it.status_timbang || 'selesai_timbang' : old.status_timbang,
        ganti_tikar: gantiTikar,
        potongan_tikar: gantiTikar ? (potTikar || Number(it.potongan_tikar) || Number(old.potongan_tikar) || 75000) : 0,
      });
    } else {
      const potTikar = Math.max(Number(it.potongan_tikar) || 0, Number(old.potongan_tikar) || 0);
      const gantiTikar =
        Boolean(it.ganti_tikar) ||
        Boolean(old.ganti_tikar) ||
        potTikar > 0;
      byNoBal.set(key, {
        ...it,
        ...old,
        item_id: old.item_id || it.item_id,
        barang_id: old.barang_id || it.barang_id,
        // Field sortir dari incoming jika ada update grade/harga
        kode_grade: it.kode_grade || old.kode_grade,
        harga_per_kg: it.harga_per_kg || old.harga_per_kg,
        ganti_tikar: gantiTikar,
        potongan_tikar: gantiTikar ? (potTikar || 75000) : 0,
      });
    }
  }

  const rank: Record<string, number> = { proses_sortir: 1, menunggu_timbang: 2, lengkap: 3 };
  const prevRank = rank[prev.status_tahap] || 0;
  const incRank = rank[incoming.status_tahap] || 0;
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
