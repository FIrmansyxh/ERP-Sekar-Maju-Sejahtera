/**
 * Pembangkit data dummy bergaya kasus nyata (entri manual): 10 petani, master harga beli & jual,
 * dan kupon pembelian berisi bal SB / HF / TS / T lengkap dengan status sortir, timbang, dan bayar.
 *
 * Folder ini sengaja TIDAK ikut Git (lihat .gitignore) dan tidak ikut build produksi.
 * Jalankan:   npx tsx dummy-data/buat-data-dummy.ts
 * Hasil:      dummy-data/data-dummy.json  (dimuat lewat http://localhost:3000/dummy-data/muat-data-dummy.html)
 *
 * Nilai memakai fungsi aplikasi sendiri (hitungUlangKupon, tara, nomor transaksi) sehingga sama
 * dengan data yang dihasilkan input manual di Sortir dan Timbangan.
 */
import { writeFileSync } from 'node:fs';
import type { Barang, MasterHargaJual, Petani, TabelHarga, TransaksiItemBal, TransaksiPembelian } from '../src/types';
import { generateTransaksiId, hitungPotonganTaraKg } from '../src/utils/formatters';
import { buildBarangDariItem, hitungUlangKupon, nextBarangId } from '../src/utils/kuponSortir';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../src/config/aturanTimbang';

// ---------- Acak yang bisa diulang ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260920);
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pilih = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const acak = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- Aturan yang diminta ----------
type Kode = 'SB' | 'HF' | 'TS' | 'T';
const KODE_BAL: Kode[] = ['SB', 'HF', 'TS', 'T'];
/** Rentang kode beli (harga = kode x 1.000) per kode bal */
const RENTANG_KODE: Record<Kode, [number, number]> = { SB: [60, 66], HF: [66, 73], TS: [55, 59], T: [53, 57] };
/** Rentang bobot bruto (kg) yang wajar per kode bal */
const RENTANG_BRUTO: Record<Kode, [number, number]> = { SB: [30, 48], HF: [30, 60], TS: [32, 62], T: [30, 58] };
/** SB dan HF berformat 4 angka (SB0001, HF0001); TS dan T tanpa nol di depan (TS1, T1) */
const formatNoBal = (kode: Kode, n: number) => (kode === 'SB' || kode === 'HF' ? `${kode}${String(n).padStart(4, '0')}` : `${kode}${n}`);

const KODE_MASTER_MIN = 30;
// Master 30-70 sesuai permintaan, diperpanjang sampai 73 karena rentang HF (66-73) memakai kode 71-73
const KODE_MASTER_MAX = 73;

// ---------- Tanggal ----------
const dua = (n: number) => String(n).padStart(2, '0');
const hariIni = new Date();
const tanggalMinus = (hariLalu: number): string => {
  const d = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - hariLalu);
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
};
const epochJam = (tgl: string, jam: number, menit = 0): number => {
  const [y, m, d] = tgl.split('-').map(Number);
  return new Date(y, m - 1, d, jam, menit, 0, 0).getTime();
};

// ---------- 10 petani ----------
const NAMA_PETANI: Array<[string, string]> = [
  ['Moh. Hasan', 'Desa Trasak, Kec. Larangan'],
  ['H. Sulaiman', 'Desa Blumbungan, Kec. Larangan'],
  ['Abd. Rahman', 'Desa Larangan Luar, Kec. Larangan'],
  ['Sumitri', 'Desa Panaguan, Kec. Larangan'],
  ['Mat Yasin', 'Desa Bajang, Kec. Larangan'],
  ['Nur Hasan', 'Desa Ambender, Kec. Pademawu'],
  ['Marwi', 'Desa Montok, Kec. Larangan'],
  ['Ahmad Zaini', 'Desa Duko, Kec. Pamekasan'],
  ['H. Abd. Karim', 'Desa Campor, Kec. Larangan'],
  ['Siti Aminah', 'Desa Gadu Barat, Kec. Larangan'],
];
const petaniList: Petani[] = NAMA_PETANI.map(([nama, alamat], i) => ({
  petani_id: `PTN-2026-${String(i + 1).padStart(3, '0')}`,
  nama_petani: nama,
  no_hp: `08${int(12, 87)}${String(int(0, 99999999)).padStart(8, '0')}`,
  alamat,
  status_aktif: true,
  tanggal_daftar: tanggalMinus(60 + i * 3),
}));

// ---------- Master harga beli & jual ----------
const hargaList: TabelHarga[] = [];
const hargaJualList: MasterHargaJual[] = [];
for (let kode = KODE_MASTER_MIN; kode <= KODE_MASTER_MAX; kode++) {
  hargaList.push({
    harga_id: `HB-${kode}`,
    kode_grade: String(kode),
    nama_grade: String(kode),
    warna_badge: 'bg-slate-100 text-slate-800',
    harga_per_kg: kode * 1000,
    rate_potongan_per_bal: 2000,
    berat_standar_kg: 50,
    tanggal_berlaku: '2026-01-01',
    status: 'aktif',
    dibuat_oleh: 'System',
  });
  hargaJualList.push({
    harga_jual_id: `HJ-${kode}`,
    kode: `HJ-${kode}`,
    harga_jual: kode * 1000,
    tanggal_berlaku: '2026-01-01',
    status_aktif: true,
  });
}

// ---------- Rencana kupon ----------
type Mode = 'lunas' | 'siap_bayar' | 'kredit' | 'sebagian' | 'belum_timbang' | 'proses_sortir';
interface Rencana {
  hariLalu: number;
  mode: Mode;
  jumlahBal: number;
}
const HARI_LALU = [9, 9, 8, 8, 7, 7, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0];
const MODE: Mode[] = [
  'lunas', 'lunas', 'lunas', 'lunas', 'lunas', 'lunas', 'lunas', 'lunas', 'lunas', 'lunas', 'lunas', // 1-11
  'siap_bayar', // 12: kupon 180 bal, sudah ditimbang semua, menunggu dibayar
  'lunas', 'lunas', 'lunas', // 13-15
  'kredit', 'kredit', 'kredit', // 16-18: sudah ditimbang, belum dibayar
  'sebagian', // 19: sortir selesai, baru sebagian ditimbang
  'belum_timbang', // 20: sortir selesai, belum ditimbang
  'proses_sortir', 'proses_sortir', // 21-22: sortir masih berjalan
];
const INDEKS_KUPON_180 = 11;
const rencana: Rencana[] = HARI_LALU.map((hariLalu, i) => ({
  hariLalu,
  mode: MODE[i],
  jumlahBal: i === INDEKS_KUPON_180 ? 180 : int(18, 45),
}));

// ---------- Susunan bal dalam satu kupon ----------
const counter: Record<Kode, number> = { SB: 0, HF: 0, TS: 0, T: 0 };

/** Bal per kode dibuat berurutan (blok nomor berurutan), lalu blok-blok dicampur seperti hasil scan manual. */
function susunNoBal(total: number, semuaKode: boolean): Array<{ kode: Kode; noBal: string }> {
  const kodeDipakai = semuaKode ? [...KODE_BAL] : acak(KODE_BAL).slice(0, int(2, 4));
  const bobot = kodeDipakai.map((k) => ({ SB: 0.42, HF: 0.3, TS: 0.16, T: 0.12 }[k] * (0.6 + rnd() * 0.8)));
  const jumlahBobot = bobot.reduce((a, b) => a + b, 0);
  const jumlah = bobot.map((b) => Math.max(1, Math.round((b / jumlahBobot) * total)));
  // Sesuaikan agar totalnya persis
  let selisih = total - jumlah.reduce((a, b) => a + b, 0);
  for (let i = 0; selisih !== 0; i = (i + 1) % jumlah.length) {
    if (selisih > 0) {
      jumlah[i] += 1;
      selisih -= 1;
    } else if (jumlah[i] > 1) {
      jumlah[i] -= 1;
      selisih += 1;
    }
  }

  const blok: Array<{ kode: Kode; noBal: string }[]> = [];
  kodeDipakai.forEach((kode, idx) => {
    let sisa = jumlah[idx];
    // Blok besar kadang terpecah dua agar kode tampak bercampur di daftar sortir
    const bagian = sisa >= 10 && rnd() < 0.4 ? [Math.floor(sisa / 2), sisa - Math.floor(sisa / 2)] : [sisa];
    bagian.forEach((n) => {
      const isi: Array<{ kode: Kode; noBal: string }> = [];
      for (let i = 0; i < n; i++) {
        counter[kode] += 1;
        isi.push({ kode, noBal: formatNoBal(kode, counter[kode]) });
      }
      blok.push(isi);
      sisa -= n;
    });
  });
  // Nomor per kode tetap naik walau blok dicampur: blok pecahan pertama sudah memakai nomor lebih kecil
  return acak(blok).flat();
}

// ---------- Bangun transaksi ----------
const transaksiList: TransaksiPembelian[] = [];
const barangList: Barang[] = [];
const urutanPerHari = new Map<string, number>();

rencana.forEach((r, idx) => {
  const tanggal = tanggalMinus(r.hariLalu);
  const petani = pilih(petaniList);
  const nomorKe = (urutanPerHari.get(tanggal) || 0) + 1;
  urutanPerHari.set(tanggal, nomorKe);

  const transaksiId = generateTransaksiId(tanggal, transaksiList);
  const noKupon = `KUP${String(idx + 1).padStart(4, '0')}`;

  // Jam sortir: kupon ke-n pada hari itu dimulai 07:00 + (n-1) x 100 menit
  const mulaiSortir = epochJam(tanggal, 7, 0) + (nomorKe - 1) * 100 * 60_000;
  const daftar = susunNoBal(r.jumlahBal, idx === INDEKS_KUPON_180);
  const akhirSortir = mulaiSortir + daftar.length * 20_000;

  // Bal yang sudah ditimbang menurut status kupon
  const jumlahDitimbang =
    r.mode === 'lunas' || r.mode === 'siap_bayar' || r.mode === 'kredit'
      ? daftar.length
      : r.mode === 'sebagian'
        ? Math.round(daftar.length * 0.6)
        : r.mode === 'proses_sortir'
          ? Math.round(daftar.length * 0.25)
          : 0;

  const items: TransaksiItemBal[] = [];
  daftar.forEach(({ kode, noBal }, i) => {
    const kodeBeli = int(RENTANG_KODE[kode][0], RENTANG_KODE[kode][1]);
    const harga = kodeBeli * 1000;
    const gantiTikar = rnd() < 0.07;
    const ditimbang = i < jumlahDitimbang;
    const bruto = ditimbang ? int(RENTANG_BRUTO[kode][0], RENTANG_BRUTO[kode][1]) : 0;
    const tara = hitungPotonganTaraKg(bruto, gantiTikar, noBal, String(kodeBeli));
    const netto = ditimbang ? Math.max(0, bruto - tara) : 0;
    const potTikar = gantiTikar ? POTONGAN_GANTI_TIKAR : 0;
    const totalKotor = Math.round(netto * harga);
    const potongan = POTONGAN_KULI_PER_BAL + POTONGAN_TALI_PER_BAL + potTikar;
    const masukMs = mulaiSortir + i * 20_000;

    const item: TransaksiItemBal = {
      item_id: `BAL-ITEM-${masukMs}-${i + 1}`,
      no_bal: noBal,
      barcode: noBal,
      kode_grade: String(kodeBeli),
      harga_per_kg: harga,
      ganti_tikar: gantiTikar,
      berat_bruto_kg: bruto,
      potongan_tara_kg: tara,
      berat_kg: netto,
      potongan_kuli: POTONGAN_KULI_PER_BAL,
      potongan_tali: POTONGAN_TALI_PER_BAL,
      potongan_tikar: potTikar,
      potongan,
      total_kotor: totalKotor,
      subtotal_bersih: ditimbang ? Math.max(0, totalKotor - potongan) : 0,
      status_timbang: ditimbang ? 'selesai_timbang' : 'menunggu_timbang',
      ...(ditimbang ? { diubah_lokal_pada: akhirSortir + 5 * 60_000 + i * 45_000 } : {}),
    };
    item.barang_id = nextBarangId(transaksiId, items);
    items.push(item);
  });

  const petugasSortir = 'Admin Sortir';
  const base: TransaksiPembelian = {
    transaksi_id: transaksiId,
    no_kupon: noKupon,
    petani_id: petani.petani_id,
    nama_petani: petani.nama_petani,
    no_hp: petani.no_hp,
    desa_kecamatan: petani.alamat,
    no_bal: '',
    kode_grade: '-',
    items: [],
    jenis_timbang: 'bruto',
    berat_terukur_kg: 0,
    potongan_tara_kg: 0,
    berat_kg: 0,
    harga_per_kg: 0,
    potongan_kuli: 0,
    potongan_tikar: 0,
    total_potongan: 0,
    total_harga_beli: 0,
    harga_final: 0,
    status_transaksi: 'menunggu',
    status_tahap: r.mode === 'proses_sortir' ? 'proses_sortir' : 'menunggu_timbang',
    status_pembayaran: 'belum_lunas',
    status_nota: 'belum_cetak',
    unduh_nota_count: 0,
    tanggal_transaksi: tanggal,
    operator_nama: petugasSortir,
    petugas_sortir: petugasSortir,
    catatan_qc: r.mode === 'proses_sortir' ? 'Sortir sedang berjalan.' : `Sortir ${items.length} bal tembakau selesai.`,
  };

  let tx = hitungUlangKupon(base, items);
  if (jumlahDitimbang > 0) tx = { ...tx, petugas_timbang: 'Admin Timbang' };
  if (r.mode === 'lunas') {
    const dibayarMs = akhirSortir + 5 * 60_000 + items.length * 45_000 + 30 * 60_000;
    tx = {
      ...tx,
      status_pembayaran: 'lunas',
      metode_pembayaran: 'cash',
      dibayar_oleh: 'Admin Kasir',
      dibayar_pada: new Date(dibayarMs).toISOString(),
      status_nota: 'sudah_cetak',
      dicetak_pada: new Date(dibayarMs).toISOString(),
      dicetak_oleh: 'Admin Kasir',
    };
  }

  transaksiList.push(tx);
  (tx.items || []).forEach((it) => barangList.push(buildBarangDariItem(tx, it)));
});

// ---------- Statistik petani (seperti yang dihitung aplikasi) ----------
petaniList.forEach((p) => {
  const milik = transaksiList.filter((t) => t.petani_id === p.petani_id);
  const gradeHitung = new Map<string, number>();
  milik.forEach((t) => (t.items || []).forEach((it) => gradeHitung.set(it.kode_grade, (gradeHitung.get(it.kode_grade) || 0) + 1)));
  const gradeDominan = [...gradeHitung.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  p.statistik = {
    total_setoran_bal: milik.reduce((s, t) => s + (t.items || []).length, 0),
    total_berat_kg: Math.round(milik.reduce((s, t) => s + (t.berat_kg || 0), 0) * 1000) / 1000,
    kunjungan_terakhir: milik.map((t) => t.tanggal_transaksi).sort().pop(),
    ...(gradeDominan ? { grade_dominan: `Grade ${gradeDominan}` } : {}),
  };
});

// ---------- Pemeriksaan ----------
const galat: string[] = [];
const semuaNoBal = new Set<string>();
transaksiList.forEach((t) => {
  const jml = (t.items || []).length;
  if (jml < 18) galat.push(`${t.no_kupon} hanya ${jml} bal`);
  (t.items || []).forEach((it) => {
    if (semuaNoBal.has(it.no_bal)) galat.push(`No bal ganda ${it.no_bal}`);
    semuaNoBal.add(it.no_bal);
    const kode = KODE_BAL.find((k) => it.no_bal.startsWith(k) && /^\d+$/.test(it.no_bal.slice(k.length)));
    if (!kode) return galat.push(`Format no bal salah ${it.no_bal}`);
    const kb = Number(it.kode_grade);
    if (kb < RENTANG_KODE[kode][0] || kb > RENTANG_KODE[kode][1]) galat.push(`${it.no_bal} kode ${kb} di luar rentang ${kode}`);
    if (it.harga_per_kg !== kb * 1000) galat.push(`${it.no_bal} harga tidak sama dengan kode x 1000`);
    if (!hargaList.some((h) => h.kode_grade === it.kode_grade)) galat.push(`${it.no_bal} kode ${it.kode_grade} tidak ada di master harga`);
  });
});
if (!transaksiList.some((t) => (t.items || []).length === 180)) galat.push('Tidak ada kupon 180 bal');
if (galat.length) {
  console.error('GAGAL:\n' + galat.slice(0, 20).join('\n'));
  process.exit(1);
}

writeFileSync(
  new URL('./data-dummy.json', import.meta.url),
  JSON.stringify({ dibuat: new Date().toISOString(), petani: petaniList, harga: hargaList, hargaJual: hargaJualList, transaksi: transaksiList, barang: barangList }, null, 1)
);

// ---------- Ringkasan ----------
console.log(`Petani: ${petaniList.length} | Harga beli/jual: ${hargaList.length}/${hargaJualList.length} | Kupon: ${transaksiList.length} | Bal: ${barangList.length}`);
transaksiList.forEach((t) => {
  const per: Record<string, number> = {};
  (t.items || []).forEach((it) => {
    const k = KODE_BAL.find((kk) => it.no_bal.startsWith(kk))!;
    per[k] = (per[k] || 0) + 1;
  });
  const status = t.status_pembayaran === 'lunas' ? 'LUNAS' : t.status_tahap;
  console.log(
    `${t.no_kupon} ${t.tanggal_transaksi} ${t.nama_petani.padEnd(14)} ${String((t.items || []).length).padStart(3)} bal ` +
      `(${KODE_BAL.map((k) => `${k}:${per[k] || 0}`).join(' ')}) ditimbang ${t.bal_selesai_timbang}/${t.total_bal} ${status}`
  );
});
