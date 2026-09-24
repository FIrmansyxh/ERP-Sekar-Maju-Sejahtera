import type { TransaksiPembelian } from '../types';
import { OperasiKupon, terapkanOperasi, uraianOperasi } from './operasiKupon';
import { catatAliasKupon } from '../utils/aliasKupon';
import { akhiranUnik } from '../utils/idUnik';

/**
 * Antrean operasi kupon (Sortir, Timbangan, Kasir).
 *
 * Setiap tombol di Sortir/Timbangan/Kasir menjadi satu operasi (lihat operasiKupon.ts) yang langsung tampil di layar
 * lalu dikirim ke server. Aturannya sengaja sederhana supaya tidak ada lagi data yang "mental" atau "muncul lagi":
 *
 *  - Operasi satu kupon dikirim BERURUTAN (tambah bal dulu, baru timbang bal itu); kupon berbeda berjalan sendiri.
 *  - Server menjawab berhasil -> kupon di layar diganti jawaban server (sumber kebenaran) dan operasinya selesai.
 *  - Server MENOLAK (4xx, mis. kupon sudah lunas, No. Bal kembar, bal sudah dihapus komputer lain) -> operasinya
 *    DIBATALKAN saat itu juga dan alasannya ditampilkan. Tidak pernah lagi disimpan diam-diam di satu komputer
 *    sehingga layar komputer ini berbeda dengan komputer lain.
 *  - Kupon sudah dihapus di server (410) -> semua operasinya dibuang dan kupon hilang dari layar.
 *  - Sesi login habis (401/403) -> antrean berhenti sampai login ulang, lalu lanjut sendiri.
 *  - Jaringan putus / server sibuk -> dicoba ulang dengan jeda makin panjang (juga setelah halaman dimuat ulang,
 *    karena antrean disimpan di peramban). Selama itu Header menampilkan jumlah simpanan yang belum sampai.
 *
 * Yang tampil di layar selalu = kupon dari server + operasi yang belum terkirim (terapkanKeDaftar).
 */

export interface TugasKupon {
  uid: string;
  transaksiId: string;
  noKupon: string;
  op: OperasiKupon;
  label: string;
  dibuatPada: number;
  percobaan: number;
  /** Berapa kali server menjawab galat 5xx; setelah beberapa kali dianggap penolakan agar antrean tidak macet */
  galatServer: number;
  berikutnyaPada: number;
  galat?: string;
}

export type PengirimOperasi = (transaksiId: string, op: OperasiKupon) => Promise<TransaksiPembelian>;

export interface RingkasanAntrianKupon {
  menunggu: number;
  berjalan: boolean;
  butuhLoginUlang: boolean;
  galatTerakhir?: string;
  rincian: Array<{ uid: string; label: string; percobaan: number; galat?: string }>;
}

const KUNCI_PENYIMPANAN = 'sms_antrian_kupon_v2';
const BATAS_GALAT_SERVER = 3;

/** Jeda percobaan ulang: 2, 4, 8, 15, 30, lalu tiap 60 detik. */
export function hitungJedaKupon(percobaan: number): number {
  const daftar = [2000, 4000, 8000, 15000, 30000];
  return percobaan <= 0 ? 0 : (daftar[percobaan - 1] ?? 60000);
}

const statusGalat = (err: unknown): number | undefined => {
  const s = (err as { status?: number } | null)?.status;
  return typeof s === 'number' ? s : undefined;
};
const pesanGalat = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Rute belum ada di server (backend belum diperbarui): simpanan ditahan, bukan dibuang. */
const ruteBelumAda = (err: unknown): boolean => {
  const s = statusGalat(err);
  return s === 405 || (s === 404 && /route|could not be found/i.test(pesanGalat(err)));
};

// ---------- Keadaan ----------
let daftar: TugasKupon[] = [];
/** Tugas yang sudah selesai / dibuang di tab ini, supaya tidak dihidupkan lagi dari salinan tab lain */
const selesaiDiTab = new Set<string>();
const berjalan = new Set<string>();
let pengirim: PengirimOperasi | null = null;
let butuhLoginUlang = false;
let sudahMuat = false;
let pewaktu: ReturnType<typeof setInterval> | null = null;
let jedaKustom: ((percobaan: number) => number) | null = null;
let versi = 0;

const pendengar = new Set<() => void>();
const pendengarBerhasil = new Set<(transaksiIdLama: string, tx: TransaksiPembelian, tugas: TugasKupon) => void>();
const pendengarDitolak = new Set<(tugas: TugasKupon, pesan: string) => void>();
const pendengarDihapus = new Set<(transaksiId: string, noKupon: string, pesan: string) => void>();
const pendengarLogin = new Set<() => void>();

/**
 * Menyimpan antrean ke peramban. Beberapa tab (mis. Sortir dan Timbangan di satu komputer) memakai kunci yang sama,
 * jadi isi tab lain yang masih menunggu dipertahankan; hanya tugas milik tab ini yang ditulis / dihapus.
 */
function simpan(): void {
  try {
    const mentah = localStorage.getItem(KUNCI_PENYIMPANAN);
    const tersimpan = mentah ? JSON.parse(mentah) : [];
    const milikTab = new Set(daftar.map((t) => t.uid));
    const lain = (Array.isArray(tersimpan) ? (tersimpan as TugasKupon[]) : []).filter(
      (t) => t && t.uid && !milikTab.has(t.uid) && !selesaiDiTab.has(t.uid)
    );
    const semua = [...lain, ...daftar];
    if (semua.length === 0) localStorage.removeItem(KUNCI_PENYIMPANAN);
    else localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(semua));
  } catch (err) {
    console.warn('[Antrean kupon] Gagal menyimpan antrean ke peramban:', err);
  }
}

/** Keluarkan tugas dari antrean tab ini (selesai / ditolak / dibatalkan) dan ingat agar tidak tersimpan lagi. */
function keluarkan(saring: (t: TugasKupon) => boolean): void {
  const tetap: TugasKupon[] = [];
  for (const t of daftar) {
    if (saring(t)) selesaiDiTab.add(t.uid);
    else tetap.push(t);
  }
  daftar = tetap;
}

function muat(): void {
  if (sudahMuat) return;
  sudahMuat = true;
  try {
    const mentah = localStorage.getItem(KUNCI_PENYIMPANAN);
    const isi = mentah ? JSON.parse(mentah) : [];
    if (Array.isArray(isi)) {
      daftar = (isi as TugasKupon[])
        .filter((t) => t && t.uid && t.transaksiId && t.op && t.op.jenis)
        .map((t) => ({ ...t, berikutnyaPada: 0, galatServer: t.galatServer || 0 }));
    }
  } catch (err) {
    console.warn('[Antrean kupon] Antrean tersimpan tidak terbaca:', err);
  }
}

function beritahu(): void {
  versi += 1;
  pendengar.forEach((fn) => {
    try {
      fn();
    } catch {
      // pendengar yang rusak tidak boleh menghentikan antrean
    }
  });
}

function panggil<A extends unknown[]>(daftarFn: Set<(...a: A) => void>, ...arg: A): void {
  daftarFn.forEach((fn) => {
    try {
      fn(...arg);
    } catch (err) {
      console.warn('[Antrean kupon] Pendengar galat:', err);
    }
  });
}

function pastikanPewaktu(): void {
  if (pewaktu || typeof setInterval === 'undefined') return;
  pewaktu = setInterval(() => {
    const sekarang = Date.now();
    const kupon = new Set(daftar.filter((t) => t.berikutnyaPada <= sekarang).map((t) => t.transaksiId));
    kupon.forEach((id) => void jalankan(id));
  }, 1000);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void kirimUlangSekarang());
    window.addEventListener('focus', () => void kirimUlangSekarang());
  }
}

/** Menjalankan operasi satu kupon berurutan sampai habis, atau berhenti menunggu jaringan / login. */
async function jalankan(transaksiIdAwal: string): Promise<void> {
  if (!pengirim || butuhLoginUlang || berjalan.has(transaksiIdAwal)) return;
  let transaksiId = transaksiIdAwal;
  const jalur = new Set([transaksiId]);
  berjalan.add(transaksiId);
  beritahu();
  try {
    for (let putaran = 0; putaran < 200; putaran++) {
      const t = daftar.find((x) => x.transaksiId === transaksiId);
      if (!t || t.berikutnyaPada > Date.now() || butuhLoginUlang || !pengirim) return;
      try {
        const tx = await pengirim(t.transaksiId, t.op);
        // Jawaban server dipasang ke layar DAN operasinya dihapus dalam satu langkah (tidak ada kedipan)
        const idLama = t.transaksiId;
        const idServer = tx?.transaksi_id || idLama;
        panggil(pendengarBerhasil, idLama, tx, t);
        keluarkan((x) => x.uid === t.uid);
        if (idServer !== idLama) {
          // Server menggabungkan kupon ini ke kupon yang sama yang dibuka dari komputer lain: operasi berikutnya ikut
          catatAliasKupon(idLama, idServer);
          daftar = daftar.map((x) => (x.transaksiId === idLama ? { ...x, transaksiId: idServer } : x));
          transaksiId = idServer;
          jalur.add(idServer);
          berjalan.add(idServer);
        }
        simpan();
        beritahu();
      } catch (err) {
        const status = statusGalat(err);
        const pesan = pesanGalat(err);
        if (status === 410) {
          keluarkan((x) => x.transaksiId === t.transaksiId);
          simpan();
          beritahu();
          panggil(pendengarDihapus, t.transaksiId, t.noKupon, pesan);
          return;
        }
        if (status === 401 || status === 403) {
          t.galat = pesan;
          butuhLoginUlang = true;
          simpan();
          beritahu();
          panggil(pendengarLogin);
          return;
        }
        const sementara = status === undefined || status === 0 || status === 408 || status === 429 || ruteBelumAda(err);
        const galatServer = status !== undefined && status >= 500;
        if (galatServer) t.galatServer += 1;
        if (sementara || (galatServer && t.galatServer < BATAS_GALAT_SERVER)) {
          t.percobaan += 1;
          t.galat = ruteBelumAda(err) ? 'Server belum diperbarui ke versi terbaru; simpanan ditahan sampai server siap.' : pesan;
          t.berikutnyaPada = Date.now() + (jedaKustom ? jedaKustom(t.percobaan) : hitungJedaKupon(t.percobaan));
          console.warn(`[Antrean kupon] ${t.label}: belum terkirim (percobaan ${t.percobaan}):`, err);
          simpan();
          beritahu();
          return;
        }
        // Ditolak server: batalkan operasi ini. Kupon yang gagal dibuat -> operasi lanjutannya juga tidak berarti.
        keluarkan((x) => (t.op.jenis === 'buat' ? x.transaksiId === t.transaksiId : x.uid === t.uid));
        simpan();
        beritahu();
        panggil(pendengarDitolak, t, pesan);
      }
    }
  } finally {
    jalur.forEach((id) => berjalan.delete(id));
    beritahu();
  }
}

async function kirimUlangSekarang(): Promise<void> {
  muat();
  daftar.forEach((t) => {
    t.berikutnyaPada = 0;
  });
  const kupon = Array.from(new Set(daftar.map((t) => t.transaksiId)));
  await Promise.all(kupon.map((id) => jalankan(id)));
}

export const antrianKupon = {
  /** Dipasang saat pengguna login; operasi yang tertinggal dari sesi sebelumnya langsung dikirim. */
  pasang(kirim: PengirimOperasi): void {
    pengirim = kirim;
    butuhLoginUlang = false;
    muat();
    pastikanPewaktu();
    beritahu();
    void kirimUlangSekarang();
  },

  /** Pengguna keluar: antrean berhenti (tetap tersimpan) sampai login berikutnya. */
  lepas(): void {
    pengirim = null;
    beritahu();
  },

  /** Menambahkan satu operasi di akhir antrean kupon ini lalu mulai mengirim. Layar langsung ikut berubah. */
  masukkan(transaksiId: string, noKupon: string, op: OperasiKupon): TugasKupon {
    muat();
    pastikanPewaktu();
    const tugas: TugasKupon = {
      uid: `${Date.now()}-${akhiranUnik(6)}`,
      transaksiId,
      noKupon,
      op,
      label: `Kupon ${noKupon}: ${uraianOperasi(op)}`,
      dibuatPada: Date.now(),
      percobaan: 0,
      galatServer: 0,
      berikutnyaPada: 0,
    };
    daftar = [...daftar, tugas];
    simpan();
    beritahu();
    void jalankan(transaksiId);
    return tugas;
  },

  /** Kupon dihapus: operasinya yang belum terkirim tidak berguna lagi. */
  batalkanKupon(transaksiId: string): void {
    const sebelum = daftar.length;
    keluarkan((t) => t.transaksiId === transaksiId);
    if (daftar.length !== sebelum) {
      simpan();
      beritahu();
    }
  },

  adaTugas(transaksiId: string): boolean {
    muat();
    return daftar.some((t) => t.transaksiId === transaksiId);
  },

  sedangDikirim(transaksiId: string): boolean {
    return berjalan.has(transaksiId);
  },

  /** Kupon yang hanya ada di antrean (belum pernah sampai ke server). */
  belumDiServer(transaksiId: string): boolean {
    muat();
    return daftar.some((t) => t.transaksiId === transaksiId && t.op.jenis === 'buat');
  },

  /**
   * Kupon untuk layar: data server ditambah operasi yang belum terkirim, berurutan. Kupon yang belum pernah sampai
   * ke server (operasi "buat" masih menunggu) tampil di paling atas.
   */
  terapkanKeDaftar(daftarServer: TransaksiPembelian[]): TransaksiPembelian[] {
    muat();
    if (daftar.length === 0) return daftarServer;
    const perKupon = new Map<string, OperasiKupon[]>();
    for (const t of daftar) {
      const ops = perKupon.get(t.transaksiId) || [];
      ops.push(t.op);
      perKupon.set(t.transaksiId, ops);
    }
    const hasil: TransaksiPembelian[] = [];
    for (const tx of daftarServer) {
      const ops = perKupon.get(tx.transaksi_id);
      if (!ops) {
        hasil.push(tx);
        continue;
      }
      perKupon.delete(tx.transaksi_id);
      const akhir = ops.reduce<TransaksiPembelian | undefined>((acc, op) => terapkanOperasi(acc, op), tx);
      hasil.push(akhir || tx);
    }
    const belumAda: TransaksiPembelian[] = [];
    perKupon.forEach((ops) => {
      const akhir = ops.reduce<TransaksiPembelian | undefined>((acc, op) => terapkanOperasi(acc, op), undefined);
      if (akhir) belumAda.push(akhir);
    });
    return belumAda.length > 0 ? [...belumAda, ...hasil] : hasil;
  },

  ringkasan(): RingkasanAntrianKupon {
    muat();
    return {
      menunggu: daftar.length,
      berjalan: berjalan.size > 0,
      butuhLoginUlang,
      galatTerakhir: daftar.map((t) => t.galat).filter(Boolean).pop(),
      rincian: daftar.map((t) => ({ uid: t.uid, label: t.label, percobaan: t.percobaan, galat: t.galat })),
    };
  },

  /** Angka yang naik setiap antrean berubah (untuk memoisasi tampilan). */
  versi(): number {
    return versi;
  },

  berlangganan(fn: () => void): () => void {
    pendengar.add(fn);
    return () => pendengar.delete(fn);
  },

  saatBerhasil(fn: (transaksiIdLama: string, tx: TransaksiPembelian, tugas: TugasKupon) => void): () => void {
    pendengarBerhasil.add(fn);
    return () => pendengarBerhasil.delete(fn);
  },

  saatDitolak(fn: (tugas: TugasKupon, pesan: string) => void): () => void {
    pendengarDitolak.add(fn);
    return () => pendengarDitolak.delete(fn);
  },

  saatKuponDihapus(fn: (transaksiId: string, noKupon: string, pesan: string) => void): () => void {
    pendengarDihapus.add(fn);
    return () => pendengarDihapus.delete(fn);
  },

  saatButuhLogin(fn: () => void): () => void {
    pendengarLogin.add(fn);
    return () => pendengarLogin.delete(fn);
  },

  kirimUlangSekarang,

  /** Hanya untuk pengujian. */
  aturJeda(fn: ((percobaan: number) => number) | null): void {
    jedaKustom = fn;
  },

  /** Hanya untuk pengujian: mengosongkan semua keadaan. */
  reset(): void {
    daftar = [];
    selesaiDiTab.clear();
    berjalan.clear();
    pengirim = null;
    butuhLoginUlang = false;
    sudahMuat = true;
    jedaKustom = null;
    pendengar.clear();
    pendengarBerhasil.clear();
    pendengarDitolak.clear();
    pendengarDihapus.clear();
    pendengarLogin.clear();
    if (pewaktu) clearInterval(pewaktu);
    pewaktu = null;
    try {
      localStorage.removeItem(KUNCI_PENYIMPANAN);
    } catch {
      // abaikan
    }
  },
};
