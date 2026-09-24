import type { Barang, PengirimanBarang, Petani, TransaksiPembelian } from '../types';
import { lengkapiBalDariKupon, normalizeStatusBal } from './kuponSortir';

/**
 * Data turunan untuk layar dan laporan, dihitung dari data server (bukan disimpan terpisah di tiap komputer).
 * Dulu statistik petani dan penanda Surat Jalan pada bal ditambah/dikurangi sendiri di setiap komputer, sehingga
 * angkanya berbeda antar komputer dan hilang setiap data dimuat ulang dari server.
 */

/** Statistik setoran per petani dari seluruh kupon: jumlah bal, netto, kunjungan terakhir, grade terbanyak. */
export function hitungStatistikPetani(petaniList: Petani[], transaksiList: TransaksiPembelian[]): Petani[] {
  const peta = new Map<string, { bal: number; kg: number; terakhir: string; grade: Map<string, number> }>();
  for (const t of transaksiList) {
    if (!t.petani_id) continue;
    let s = peta.get(t.petani_id);
    if (!s) {
      s = { bal: 0, kg: 0, terakhir: '', grade: new Map() };
      peta.set(t.petani_id, s);
    }
    const items = t.items || [];
    s.bal += items.length > 0 ? items.length : t.total_bal || 0;
    s.kg += items.length > 0 ? items.reduce((j, it) => j + (it.berat_kg || 0), 0) : t.berat_kg || 0;
    const tanggal = String(t.tanggal_transaksi || '').slice(0, 10);
    if (tanggal > s.terakhir) s.terakhir = tanggal;
    for (const it of items) if (it.kode_grade) s.grade.set(it.kode_grade, (s.grade.get(it.kode_grade) || 0) + 1);
  }
  let berubah = false;
  const hasil = petaniList.map((p) => {
    const s = peta.get(p.petani_id);
    let dominan = '-';
    if (s) {
      let maks = 0;
      s.grade.forEach((n, g) => {
        if (n > maks) {
          maks = n;
          dominan = `Grade ${g}`;
        }
      });
    }
    const statistik = {
      total_setoran_bal: s?.bal || 0,
      total_berat_kg: Math.round((s?.kg || 0) * 1000) / 1000,
      kunjungan_terakhir: s?.terakhir || 'Belum Ada',
      grade_dominan: dominan,
    };
    const lama = p.statistik;
    if (
      lama &&
      lama.total_setoran_bal === statistik.total_setoran_bal &&
      lama.total_berat_kg === statistik.total_berat_kg &&
      lama.kunjungan_terakhir === statistik.kunjungan_terakhir &&
      lama.grade_dominan === statistik.grade_dominan
    ) {
      return p;
    }
    berubah = true;
    return { ...p, statistik };
  });
  return berubah ? hasil : petaniList;
}

/**
 * Daftar bal untuk layar: stok bal dari server (kupon lunas), ditambah bal dari kupon yang sudah disortir tetapi
 * belum dibayar (server baru membuat stok saat kupon dibayar), dengan penanda Surat Jalan yang memuatnya.
 */
export function turunkanDaftarBal(barangServer: Barang[], transaksiList: TransaksiPembelian[], pengirimanList: PengirimanBarang[]): Barang[] {
  const kuponAda = new Set(transaksiList.map((t) => t.transaksi_id));
  // Bal milik kupon yang sudah tidak ada (dihapus) tidak ditampilkan walau data stoknya belum sempat terhapus di layar
  const stok = barangServer.filter((b) => !b.transaksi_pembelian_id || kuponAda.has(b.transaksi_pembelian_id));
  const lengkap = normalizeStatusBal(lengkapiBalDariKupon(stok, transaksiList));
  const sj = new Map<string, string>();
  for (const p of pengirimanList) for (const id of p.barang_ids || []) sj.set(id, p.pengiriman_id);
  let berubah = false;
  const hasil = lengkap.map((b) => {
    const id = sj.get(b.barang_id);
    if ((b.pengiriman_id || undefined) === id) return b;
    berubah = true;
    return { ...b, pengiriman_id: id };
  });
  return berubah ? hasil : lengkap;
}
