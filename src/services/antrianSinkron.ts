import type { TransaksiPembelian } from '../types';
import { mergeKuponParalel } from '../utils/kuponSortir';

/**
 * Antrean sinkronisasi kupon ke server.
 *
 * Masalah yang dijawab (temuan 3 hari pemakaian produksi):
 *  1. Simpanan yang gagal ke server dulu jatuh diam-diam ke penyimpanan lokal tanpa percobaan ulang,
 *     lalu terhapus saat data server dimuat ulang (login / buka laporan). Contohnya centang ganti
 *     tikar yang "kembali ke tidak GT" dan berat timbang yang hilang.
 *  2. Simpanan beruntun ke kupon yang sama dikirim bersamaan sehingga salinan lama bisa tiba
 *     terakhir di server dan menimpa yang baru.
 *
 * Aturan antrean:
 *  - Setiap kupon hanya punya SATU permintaan berjalan; simpanan berikutnya digabung dan dikirim
 *    sebagai keadaan terbaru sesudah yang berjalan selesai (tidak pernah bertabrakan).
 *  - Tugas disimpan di localStorage dan dicoba ulang dengan jeda yang makin panjang sampai berhasil,
 *    juga setelah halaman dimuat ulang.
 *  - Setelah server menjawab, hasilnya dicocokkan dengan yang dikirim (bal, berat, ganti tikar).
 *    Bila ada yang tidak tersimpan, dikirim ulang dan, bila tetap gagal, ditandai bermasalah.
 *  - Data server yang dimuat ulang selalu ditimpa dulu dengan tugas yang belum selesai
 *    (terapkanKeDaftar), sehingga perubahan lokal tidak pernah tertimpa data lama.
 */

/** Yang diketahui tentang kupon di server saat tugas dibuat; cukup untuk memilih jalur sinkron. */
export interface DasarServer {
  status_pembayaran?: TransaksiPembelian['status_pembayaran'];
  metode_pembayaran?: TransaksiPembelian['metode_pembayaran'];
}

/** Opsi tambahan kirim kupon (saat ini belum ada; tugas lama di peramban mungkin masih membawa { koreksi }). */
export type OpsiSinkron = Record<string, unknown>;

export interface HasilKirim {
  syncedTx: TransaksiPembelian;
  fromBackend: boolean;
}

export type FungsiKirim = (tx: TransaksiPembelian, dasar: DasarServer | undefined, opsi: OpsiSinkron) => Promise<HasilKirim>;

export interface Tugas {
  id: string;
  /** Keadaan kupon terbaru di perangkat ini, lengkap dengan semua bal. */
  tx: TransaksiPembelian;
  /** Kosong berarti kupon belum pernah sampai ke server (jalur buat baru). */
  dasar?: DasarServer;
  opsi: OpsiSinkron;
  /** Naik setiap ada simpanan baru; dipakai untuk tahu apakah yang terkirim masih yang terbaru. */
  versi: number;
  percobaan: number;
  /** Berapa kali server menjawab tetapi isinya tidak cocok dengan yang dikirim. */
  percobaanCocok: number;
  berikutnyaPada: number;
  dibuatPada: number;
  galat?: string;
  /** Sesi login habis (401/403): perlu login ulang, bukan sekadar jaringan. */
  butuhLoginUlang?: boolean;
  selisih?: string[];
}

export interface HasilMasukkan {
  /** Jawaban server bila permintaan ini termasuk yang berhasil dikirim. */
  hasil?: HasilKirim;
  /** Simpanan ini adalah keadaan terbaru yang terkirim; simpanan yang tergantikan tidak perlu digabung ke layar. */
  terbaru: boolean;
  /** Gagal dikirim sekarang; tersimpan di antrean dan akan dicoba lagi otomatis. */
  ditunda: boolean;
  selisih: string[];
}

export interface RingkasanAntrian {
  /** Kupon yang menunggu dikirim atau sedang dicoba ulang */
  menunggu: number;
  /** Sedang ada permintaan berjalan */
  berjalan: boolean;
  /** Server menjawab tetapi isinya tidak cocok setelah beberapa kali dicoba */
  bermasalah: number;
  butuhLoginUlang: boolean;
  galatTerakhir?: string;
  rincian: Array<{ id: string; noKupon: string; percobaan: number; galat?: string; selisih?: string[] }>;
}

const KUNCI_PENYIMPANAN = 'sms_antrian_sinkron_v1';
/** Tugas yang baru selesai tetap diingat sebentar agar muatan ulang yang datang terlambat tidak menimpa. */
const MASA_INGAT_SELESAI_MS = 30_000;
const BATAS_PERCOBAAN_COCOK = 3;

/** Jeda percobaan ulang: 3, 6, 12, 30, lalu tiap 60 detik selama belum berhasil. */
export function hitungJeda(percobaan: number): number {
  const daftar = [3000, 6000, 12000, 30000];
  return percobaan <= 0 ? 0 : (daftar[percobaan - 1] ?? 60000);
}

const sama = (a?: number, b?: number, toleransi = 0.05) => Math.abs((a || 0) - (b || 0)) <= toleransi;

/**
 * Mencocokkan jawaban server dengan yang dikirim. Hanya bal yang kita kirim yang diperiksa (bal
 * tambahan dari Sortir di komputer lain diabaikan). Mengembalikan daftar selisih yang bisa dibaca.
 */
export function verifikasiHasil(server: TransaksiPembelian, terkirim: TransaksiPembelian): string[] {
  const selisih: string[] = [];
  const peta = new Map((server.items || []).map((it) => [String(it.no_bal).toUpperCase(), it] as const));
  for (const it of terkirim.items || []) {
    const di = peta.get(String(it.no_bal).toUpperCase());
    if (!di) {
      selisih.push(`${it.no_bal}: bal belum ada di server`);
      continue;
    }
    const gtKirim = Boolean(it.ganti_tikar) || (it.potongan_tikar || 0) > 0;
    const gtServer = Boolean(di.ganti_tikar) || (di.potongan_tikar || 0) > 0;
    if (gtKirim !== gtServer) {
      selisih.push(`${it.no_bal}: ganti tikar ${gtKirim ? 'aktif' : 'mati'} di layar tetapi ${gtServer ? 'aktif' : 'mati'} di server`);
    }
    if ((it.berat_kg || 0) > 0 && !sama(it.berat_kg, di.berat_kg)) {
      selisih.push(`${it.no_bal}: netto ${it.berat_kg} kg di layar tetapi ${di.berat_kg || 0} kg di server`);
    }
    if ((it.berat_kg || 0) > 0 && (it.berat_bruto_kg || 0) > 0 && !sama(it.berat_bruto_kg, di.berat_bruto_kg)) {
      selisih.push(`${it.no_bal}: bruto ${it.berat_bruto_kg} kg di layar tetapi ${di.berat_bruto_kg || 0} kg di server`);
    }
    if (it.kode_grade && di.kode_grade && String(it.kode_grade) !== String(di.kode_grade)) {
      selisih.push(`${it.no_bal}: kode ${it.kode_grade} di layar tetapi ${di.kode_grade} di server`);
    }
  }
  return selisih;
}

const galatHurufKecil = (err: unknown): string => (err instanceof Error ? err.message : String(err)).toLowerCase();
const statusGalat = (err: unknown): number | undefined => (err as { status?: number } | null)?.status;

// ---------- Keadaan ----------
const antrian = new Map<string, Tugas>();
const berjalan = new Map<string, Promise<HasilJalan>>();
const barusSelesai = new Map<string, { tx: TransaksiPembelian; pada: number }>();
const pendengar = new Set<() => void>();
let pengirim: FungsiKirim | null = null;
let jedaKustom: ((percobaan: number) => number) | null = null;
let pewaktu: ReturnType<typeof setInterval> | null = null;
let sudahMuat = false;

interface HasilJalan {
  hasil?: HasilKirim;
  ditunda: boolean;
  selisih: string[];
  versiTerakhirDikirim: number;
}

function simpan(): void {
  try {
    if (antrian.size === 0) {
      localStorage.removeItem(KUNCI_PENYIMPANAN);
    } else {
      localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(Array.from(antrian.values())));
    }
  } catch (err) {
    console.warn('[Antrian sinkron] Gagal menyimpan antrean ke peramban:', err);
  }
}

function muatDariPenyimpanan(): void {
  if (sudahMuat) return;
  sudahMuat = true;
  try {
    const mentah = localStorage.getItem(KUNCI_PENYIMPANAN);
    if (!mentah) return;
    const daftar = JSON.parse(mentah);
    if (!Array.isArray(daftar)) return;
    for (const t of daftar as Tugas[]) {
      if (t && t.id && t.tx) antrian.set(t.id, { ...t, berikutnyaPada: 0 });
    }
  } catch (err) {
    console.warn('[Antrian sinkron] Antrean tersimpan tidak terbaca:', err);
  }
}

function beritahu(): void {
  pendengar.forEach((fn) => {
    try {
      fn();
    } catch {
      // pendengar yang rusak tidak boleh menghentikan antrean
    }
  });
}

function pastikanPewaktu(): void {
  if (pewaktu || typeof setInterval === 'undefined') return;
  pewaktu = setInterval(() => {
    const sekarang = Date.now();
    for (const t of antrian.values()) {
      if (!berjalan.has(t.id) && t.berikutnyaPada <= sekarang) void jalankan(t.id);
    }
  }, 1000);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void kirimUlangSekarang());
    window.addEventListener('focus', () => void kirimUlangSekarang());
  }
}

/** Menjalankan satu kupon sampai antreannya kosong atau gagal; selalu mengirim keadaan terbaru. */
function jalankan(id: string): Promise<HasilJalan> {
  const sudah = berjalan.get(id);
  if (sudah) return sudah;

  const p = (async (): Promise<HasilJalan> => {
    let terakhir: HasilJalan = { ditunda: false, selisih: [], versiTerakhirDikirim: 0 };
    for (let putaran = 0; putaran < 50; putaran++) {
      const t = antrian.get(id);
      if (!t) break;
      if (!pengirim) {
        t.galat = 'Pengirim data belum siap';
        return { ...terakhir, ditunda: true };
      }
      const versiDikirim = t.versi;
      const terkirim = t.tx;
      beritahu();
      try {
        const hasil = await pengirim(terkirim, t.dasar, t.opsi);
        if (!hasil.fromBackend) throw new Error('Server tidak dapat dihubungi');

        // Server menjawab: kupon pasti sudah ada di server, dan bayar sudah tercatat bila tercantum
        t.dasar = {
          status_pembayaran: hasil.syncedTx.status_pembayaran === 'lunas' || terkirim.status_pembayaran === 'lunas' ? 'lunas' : t.dasar?.status_pembayaran || 'belum_lunas',
          metode_pembayaran: hasil.syncedTx.metode_pembayaran || terkirim.metode_pembayaran,
        };
        t.percobaan = 0;
        t.galat = undefined;
        t.butuhLoginUlang = false;

        const selisih = verifikasiHasil(hasil.syncedTx, terkirim);
        terakhir = { hasil, ditunda: false, selisih, versiTerakhirDikirim: versiDikirim };

        if (t.versi !== versiDikirim) {
          // Ada simpanan lebih baru saat permintaan berjalan: kirim keadaan terbaru sekarang
          simpan();
          continue;
        }
        if (selisih.length === 0) {
          antrian.delete(id);
          barusSelesai.set(id, { tx: terkirim, pada: Date.now() });
          simpan();
          beritahu();
          return terakhir;
        }
        // Server menjawab tetapi ada yang tidak tersimpan (mis. ganti tikar): kirim ulang beberapa kali
        t.percobaanCocok += 1;
        t.selisih = selisih;
        t.berikutnyaPada = Date.now() + (t.percobaanCocok < BATAS_PERCOBAAN_COCOK ? 1500 : 60000);
        console.warn(`[Antrian sinkron] ${terkirim.no_kupon}: hasil di server tidak cocok`, selisih);
        simpan();
        beritahu();
        return { ...terakhir, ditunda: true };
      } catch (err) {
        t.percobaan += 1;
        t.galat = err instanceof Error ? err.message : String(err);
        const status = statusGalat(err);
        t.butuhLoginUlang = status === 401 || status === 403 || galatHurufKecil(err).includes('unauthenticated');
        t.berikutnyaPada = Date.now() + (jedaKustom ? jedaKustom(t.percobaan) : hitungJeda(t.percobaan));
        console.warn(`[Antrian sinkron] ${terkirim.no_kupon}: gagal dikirim (percobaan ${t.percobaan}):`, err);
        simpan();
        beritahu();
        return { ...terakhir, ditunda: true, selisih: t.selisih ?? [] };
      }
    }
    return terakhir;
  })().finally(() => {
    berjalan.delete(id);
    beritahu();
  });

  berjalan.set(id, p);
  return p;
}

// ---------- Antarmuka ----------
export const antrianSinkron = {
  /** Dipasang sekali saat aplikasi mulai; memuat tugas yang tertinggal dari sesi sebelumnya lalu mengirimnya. */
  pasang(kirim: FungsiKirim): void {
    pengirim = kirim;
    muatDariPenyimpanan();
    pastikanPewaktu();
    if (antrian.size > 0) void kirimUlangSekarang();
    beritahu();
  },

  /** Hanya untuk pengujian: mengganti jeda percobaan ulang. */
  aturJeda(fn: ((percobaan: number) => number) | null): void {
    jedaKustom = fn;
  },

  /**
   * Menaruh keadaan terbaru sebuah kupon ke antrean dan mengirimnya. Selalu aman dipanggil
   * berkali-kali: simpanan yang menumpuk digabung, dan yang gagal dicoba ulang otomatis.
   */
  async masukkan(tx: TransaksiPembelian, sebelumnya: DasarServer | undefined, opsi: OpsiSinkron = {}): Promise<HasilMasukkan> {
    muatDariPenyimpanan();
    pastikanPewaktu();
    const id = tx.transaksi_id;
    let t = antrian.get(id);
    if (t) {
      t.tx = tx;
      t.versi += 1;
      t.opsi = { ...t.opsi, ...opsi };
      t.percobaanCocok = 0;
      t.berikutnyaPada = 0;
    } else {
      t = {
        id,
        tx,
        dasar: sebelumnya ? { status_pembayaran: sebelumnya.status_pembayaran, metode_pembayaran: sebelumnya.metode_pembayaran } : undefined,
        opsi,
        versi: 1,
        percobaan: 0,
        percobaanCocok: 0,
        berikutnyaPada: 0,
        dibuatPada: Date.now(),
      };
      antrian.set(id, t);
    }
    const versiSaya = t.versi;
    simpan();
    beritahu();
    const jalan = await jalankan(id);
    return {
      hasil: jalan.hasil,
      terbaru: jalan.versiTerakhirDikirim === versiSaya && !jalan.ditunda,
      ditunda: jalan.ditunda,
      selisih: jalan.selisih,
    };
  },

  /** Kupon dihapus di layar: tugasnya tidak perlu dikirim lagi. */
  batalkan(id: string): void {
    antrian.delete(id);
    barusSelesai.delete(id);
    simpan();
    beritahu();
  },

  adaTugas(id: string): boolean {
    muatDariPenyimpanan();
    return antrian.has(id);
  },

  ringkasan(): RingkasanAntrian {
    muatDariPenyimpanan();
    const daftar = Array.from(antrian.values());
    return {
      menunggu: daftar.length,
      berjalan: berjalan.size > 0,
      bermasalah: daftar.filter((t) => t.percobaanCocok >= BATAS_PERCOBAAN_COCOK).length,
      butuhLoginUlang: daftar.some((t) => t.butuhLoginUlang),
      galatTerakhir: daftar.map((t) => t.galat).filter(Boolean).pop(),
      rincian: daftar.map((t) => ({ id: t.id, noKupon: t.tx.no_kupon, percobaan: t.percobaan, galat: t.galat, selisih: t.selisih })),
    };
  },

  berlangganan(fn: () => void): () => void {
    pendengar.add(fn);
    return () => pendengar.delete(fn);
  },

  kirimUlangSekarang,

  /**
   * Menimpa data server yang baru dimuat dengan tugas yang belum (atau baru saja) selesai, supaya
   * perubahan di perangkat ini tidak tertimpa data lama. Kupon yang belum pernah sampai ke server
   * tetap tampil.
   */
  terapkanKeDaftar(daftarServer: TransaksiPembelian[]): TransaksiPembelian[] {
    muatDariPenyimpanan();
    const sekarang = Date.now();
    for (const [id, s] of barusSelesai) {
      if (sekarang - s.pada > MASA_INGAT_SELESAI_MS) barusSelesai.delete(id);
    }
    if (antrian.size === 0 && barusSelesai.size === 0) return daftarServer;

    const lokal = new Map<string, TransaksiPembelian>();
    for (const [id, s] of barusSelesai) lokal.set(id, s.tx);
    for (const t of antrian.values()) lokal.set(t.id, t.tx);

    const hasil = daftarServer.map((srv) => {
      const punyaKita = lokal.get(srv.transaksi_id);
      if (!punyaKita) return srv;
      lokal.delete(srv.transaksi_id);
      return mergeKuponParalel(srv, punyaKita);
    });
    // Kupon yang belum pernah sampai ke server
    for (const tx of lokal.values()) hasil.unshift(tx);
    return hasil;
  },
};

async function kirimUlangSekarang(): Promise<void> {
  muatDariPenyimpanan();
  const tugas = Array.from(antrian.values());
  tugas.forEach((t) => {
    t.berikutnyaPada = 0;
  });
  await Promise.all(tugas.filter((t) => !berjalan.has(t.id)).map((t) => jalankan(t.id)));
}
