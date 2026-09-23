/**
 * Antrean perubahan ke server untuk semua data selain kupon (petani, harga, batch sample, Surat Jalan,
 * status bal, pengguna, penghapusan kupon). Kupon punya antrean sendiri (antrianSinkron.ts).
 *
 * Masalah yang dijawab (temuan pemakaian):
 *  1. Batch sample yang dihapus muncul lagi beberapa detik kemudian: penghapusan hanya terjadi di komputer
 *     ini, lalu data server dimuat ulang dan menggantikan layar.
 *  2. Perubahan data (edit petani, harga, batch, Surat Jalan) "mental" saat halaman dimuat ulang: gagal
 *     dikirim ke server tanpa percobaan ulang, atau server menjawab OK tetapi tidak menyimpan semuanya.
 *
 * Aturan:
 *  - Satu tugas per (entitas, id, aksi). Simpanan baru menggantikan yang lama (keadaan terbaru menang);
 *    penghapusan membatalkan simpanan yang menunggu untuk entitas yang sama.
 *  - Tugas disimpan di localStorage dan dicoba ulang dengan jeda makin panjang sampai berhasil, juga
 *    setelah halaman dimuat ulang. Tidak ada tugas yang dibuang diam-diam.
 *  - Data server yang dimuat ulang selalu ditimpa dulu dengan tugas yang belum selesai: simpanan menggantikan
 *    baris server, penghapusan membuang barisnya (terapkanKeDaftar).
 *  - Server yang menjawab OK tetapi isinya tidak cocok dengan yang dikirim ditandai, dikirim ulang, dan
 *    tetap terlihat di Header (bukan dianggap berhasil).
 */

export type EntitasMutasi =
  | 'petani'
  | 'harga_beli'
  | 'harga_jual'
  | 'user'
  | 'batch_sample'
  | 'pengiriman'
  | 'barang'
  | 'transaksi';

export type AksiMutasi = 'simpan' | 'hapus' | 'status' | 'reset_sandi' | 'ganti_id';

export interface TugasMutasi {
  kunci: string;
  entitas: EntitasMutasi;
  id: string;
  /** Kunci alami lain yang dipakai server untuk baris yang sama (mis. No. Surat Sample, No. Surat Jalan) */
  idAlt?: string;
  aksi: AksiMutasi;
  /** Keadaan terbaru entitas di perangkat ini (bahan kirim dan penimpaan daftar server) */
  data?: unknown;
  /** Keterangan bebas untuk pemulihan, mis. alasan hapus */
  tambahan?: Record<string, unknown>;
  /** Nama tampil untuk Header */
  label: string;
  versi: number;
  percobaan: number;
  percobaanCocok: number;
  berikutnyaPada: number;
  dibuatPada: number;
  /** Waktu simpanan terakhir; tugas dengan waktu lebih baru menang saat menimpa daftar server */
  diperbaruiPada?: number;
  galat?: string;
  /** Server menolak (mis. endpoint belum ada atau data ditolak): dicoba lagi pelan-pelan, bukan tiap detik */
  ditolak?: boolean;
  butuhLoginUlang?: boolean;
  selisih?: string[];
}

export interface HasilKirimMutasi {
  /** Jawaban server (dipakai verifikasi dan pemanggil) */
  hasil?: unknown;
  /** Penghapusan diganti pembatalan lunak di server: baris tetap ada di daftar server, sembunyikan terus */
  hapusLunak?: boolean;
}

export interface HandlerMutasi {
  kirim: (tugas: TugasMutasi) => Promise<HasilKirimMutasi>;
  /** Daftar selisih antara yang dikirim dan jawaban server; kosong berarti cocok */
  verifikasi?: (tugas: TugasMutasi, hasil: unknown) => string[];
}

export type PetaHandlerMutasi = Partial<Record<`${EntitasMutasi}:${AksiMutasi}`, HandlerMutasi>>;

export interface SpesifikasiMutasi {
  entitas: EntitasMutasi;
  id: string;
  idAlt?: string;
  aksi: AksiMutasi;
  data?: unknown;
  tambahan?: Record<string, unknown>;
  label?: string;
}

export interface RingkasanMutasi {
  menunggu: number;
  berjalan: boolean;
  /** Server menolak atau menjawab tetapi isinya tidak cocok */
  bermasalah: number;
  butuhLoginUlang: boolean;
  rincian: Array<{ kunci: string; label: string; percobaan: number; galat?: string; selisih?: string[]; ditolak?: boolean }>;
}

export interface OpsiOverlay<T> {
  ambilId: (baris: T) => string;
  ambilIdAlt?: (baris: T) => string | undefined;
  /** Menggabung baris server dengan keadaan lokal; bawaan: keadaan lokal menimpa baris server */
  gabung?: (server: T, lokal: T) => T;
}

const KUNCI_PENYIMPANAN = 'sms_antrian_mutasi_v1';
const KUNCI_TOMBSTONE = 'sms_antrian_mutasi_terhapus_v1';
/** Tugas yang baru selesai tetap diingat sebentar agar muatan ulang yang datang terlambat tidak menimpa. */
const MASA_INGAT_SELESAI_MS = 30_000;
const BATAS_PERCOBAAN_COCOK = 3;
/** Jeda percobaan ulang untuk tugas yang ditolak server (bukan gangguan jaringan) */
const JEDA_DITOLAK_MS = 5 * 60_000;

/** Jeda percobaan ulang: 3, 6, 12, 30, lalu tiap 60 detik selama belum berhasil. */
export function hitungJedaMutasi(percobaan: number): number {
  const daftar = [3000, 6000, 12000, 30000];
  return percobaan <= 0 ? 0 : (daftar[percobaan - 1] ?? 60000);
}

const statusGalat = (err: unknown): number | undefined => (err as { status?: number } | null)?.status;
const pesanGalat = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Endpoint belum ada di server (rute tidak ditemukan atau metode tidak diizinkan), bukan "barisnya tidak ada". */
export function endpointBelumAda(err: unknown): boolean {
  const status = statusGalat(err);
  if (status === 405) return true;
  return status === 404 && /route|could not be found|method/i.test(pesanGalat(err));
}

/** Baris yang dituju memang sudah tidak ada di server (404 model tidak ditemukan). */
export function barisSudahTiada(err: unknown): boolean {
  return statusGalat(err) === 404 && !endpointBelumAda(err);
}

// ---------- Keadaan ----------
const antrian = new Map<string, TugasMutasi>();
const berjalan = new Map<string, Promise<void>>();
const barusSelesai = new Map<string, { tugas: TugasMutasi; pada: number }>();
const tombstone = new Map<string, number>();
const pendengar = new Set<() => void>();
const pendengarSelesai = new Set<(tugas: TugasMutasi, hasil: unknown) => void>();
const pendengarDihapusServer = new Set<(tugas: TugasMutasi, pesan: string) => void>();
const pendengarHapusDitolak = new Set<(tugas: TugasMutasi, pesan: string) => void>();
let handler: PetaHandlerMutasi = {};
let pewaktu: ReturnType<typeof setInterval> | null = null;
let sudahMuat = false;
let jedaKustom: ((percobaan: number) => number) | null = null;

const kunciTugas = (entitas: EntitasMutasi, id: string, aksi: AksiMutasi) => `${entitas}|${id}|${aksi}`;
const kunciTombstone = (entitas: EntitasMutasi, id: string) => `${entitas}|${id}`;

function simpan(): void {
  try {
    if (antrian.size === 0) localStorage.removeItem(KUNCI_PENYIMPANAN);
    else localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(Array.from(antrian.values())));
  } catch (err) {
    console.warn('[Antrean mutasi] Gagal menyimpan antrean ke peramban:', err);
  }
}

function simpanTombstone(): void {
  try {
    if (tombstone.size === 0) localStorage.removeItem(KUNCI_TOMBSTONE);
    else localStorage.setItem(KUNCI_TOMBSTONE, JSON.stringify(Array.from(tombstone.entries())));
  } catch (err) {
    console.warn('[Antrean mutasi] Gagal menyimpan daftar terhapus:', err);
  }
}

function muatDariPenyimpanan(): void {
  if (sudahMuat) return;
  sudahMuat = true;
  try {
    const mentah = localStorage.getItem(KUNCI_PENYIMPANAN);
    if (mentah) {
      const daftar = JSON.parse(mentah);
      if (Array.isArray(daftar)) {
        for (const t of daftar as TugasMutasi[]) {
          if (t && t.kunci && t.entitas && t.aksi) antrian.set(t.kunci, { ...t, berikutnyaPada: 0 });
        }
      }
    }
    const daftarTombstone = localStorage.getItem(KUNCI_TOMBSTONE);
    if (daftarTombstone) {
      const daftar = JSON.parse(daftarTombstone);
      if (Array.isArray(daftar)) for (const [k, v] of daftar as Array<[string, number]>) tombstone.set(k, v);
    }
  } catch (err) {
    console.warn('[Antrean mutasi] Antrean tersimpan tidak terbaca:', err);
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
      if (!berjalan.has(t.kunci) && t.berikutnyaPada <= sekarang) void jalankan(t.kunci);
    }
  }, 1000);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void kirimUlangSekarang());
    window.addEventListener('focus', () => void kirimUlangSekarang());
  }
}

function jalankan(kunci: string): Promise<void> {
  const sudah = berjalan.get(kunci);
  if (sudah) return sudah;

  const p = (async () => {
    for (let putaran = 0; putaran < 20; putaran++) {
      const t = antrian.get(kunci);
      if (!t) return;
      const h = handler[`${t.entitas}:${t.aksi}` as keyof PetaHandlerMutasi];
      if (!h) {
        t.galat = 'Pengirim data belum siap';
        return;
      }
      const versiDikirim = t.versi;
      beritahu();
      try {
        const hasil = await h.kirim(t);
        t.percobaan = 0;
        t.galat = undefined;
        t.ditolak = false;
        t.butuhLoginUlang = false;

        if (t.versi !== versiDikirim) {
          // Ada simpanan lebih baru saat permintaan berjalan: kirim keadaan terbaru sekarang
          simpan();
          continue;
        }

        const selisih = h.verifikasi ? h.verifikasi(t, hasil.hasil) : [];
        if (selisih.length > 0) {
          t.percobaanCocok += 1;
          t.selisih = selisih;
          t.berikutnyaPada = Date.now() + (t.percobaanCocok < BATAS_PERCOBAAN_COCOK ? 1500 : 60_000);
          console.warn(`[Antrean mutasi] ${t.label}: hasil di server tidak cocok`, selisih);
          simpan();
          beritahu();
          return;
        }

        antrian.delete(kunci);
        barusSelesai.set(kunci, { tugas: t, pada: Date.now() });
        if (t.aksi === 'hapus' && hasil.hapusLunak) {
          tombstone.set(kunciTombstone(t.entitas, t.id), Date.now());
          if (t.idAlt) tombstone.set(kunciTombstone(t.entitas, t.idAlt), Date.now());
          simpanTombstone();
        }
        simpan();
        beritahu();
        pendengarSelesai.forEach((fn) => {
          try {
            fn(t, hasil.hasil);
          } catch (err) {
            console.warn('[Antrean mutasi] Pendengar selesai galat:', err);
          }
        });
        return;
      } catch (err) {
        const status = statusGalat(err);
        if (status === 410) {
          // Data sudah dihapus di server (dari perangkat lain). Simpanan ini dibuang agar tidak membuatnya ulang,
          // dan data itu disembunyikan terus di perangkat ini.
          antrian.delete(kunci);
          if (t.aksi !== 'hapus') {
            tombstone.set(kunciTombstone(t.entitas, t.id), Date.now());
            if (t.idAlt) tombstone.set(kunciTombstone(t.entitas, t.idAlt), Date.now());
            simpanTombstone();
          }
          simpan();
          beritahu();
          const pesan = pesanGalat(err);
          pendengarDihapusServer.forEach((fn) => {
            try {
              fn(t, pesan);
            } catch (e) {
              console.warn('[Antrean mutasi] Pendengar hapus galat:', e);
            }
          });
          return;
        }
        const butuhLogin = status === 401 || status === 403 || pesanGalat(err).toLowerCase().includes('unauthenticated');
        if (t.aksi === 'hapus' && status && status >= 400 && status < 500 && ![404, 405, 408, 429].includes(status) && !butuhLogin) {
          // Server menolak penghapusan dengan alasan yang jelas (mis. Surat Jalan sudah Selesai di perangkat lain).
          // Jangan disembunyikan diam-diam selamanya di perangkat ini: batalkan, tampilkan alasannya, dan muat ulang
          // datanya sehingga yang tampil sama dengan server.
          antrian.delete(kunci);
          simpan();
          beritahu();
          const pesan = pesanGalat(err);
          pendengarHapusDitolak.forEach((fn) => {
            try {
              fn(t, pesan);
            } catch (e) {
              console.warn('[Antrean mutasi] Pendengar hapus ditolak galat:', e);
            }
          });
          return;
        }
        t.percobaan += 1;
        t.galat = pesanGalat(err);
        t.butuhLoginUlang = butuhLogin;
        // Server menjawab dengan penolakan (bukan gangguan jaringan): jangan menghujani server tiap detik.
        // 429 (terlalu banyak permintaan) dan 408 hanyalah gangguan sesaat: dicoba ulang seperti gangguan jaringan.
        t.ditolak = Boolean(status && status >= 400 && status < 500 && status !== 429 && status !== 408 && !t.butuhLoginUlang);
        t.berikutnyaPada =
          Date.now() + (t.ditolak ? JEDA_DITOLAK_MS : jedaKustom ? jedaKustom(t.percobaan) : hitungJedaMutasi(t.percobaan));
        console.warn(`[Antrean mutasi] ${t.label}: gagal dikirim (percobaan ${t.percobaan}):`, err);
        simpan();
        beritahu();
        return;
      }
    }
  })().finally(() => {
    berjalan.delete(kunci);
    beritahu();
  });

  berjalan.set(kunci, p);
  return p;
}

async function kirimUlangSekarang(): Promise<void> {
  muatDariPenyimpanan();
  const tugas = Array.from(antrian.values());
  tugas.forEach((t) => {
    t.berikutnyaPada = 0;
  });
  await Promise.all(tugas.filter((t) => !berjalan.has(t.kunci)).map((t) => jalankan(t.kunci)));
}

// ---------- Antarmuka ----------
export const antrianMutasi = {
  /** Dipasang sekali saat aplikasi mulai; memuat tugas yang tertinggal dari sesi sebelumnya lalu mengirimnya. */
  pasang(peta: PetaHandlerMutasi): void {
    handler = peta;
    muatDariPenyimpanan();
    pastikanPewaktu();
    if (antrian.size > 0) void kirimUlangSekarang();
    beritahu();
  },

  /** Hanya untuk pengujian. */
  aturJeda(fn: ((percobaan: number) => number) | null): void {
    jedaKustom = fn;
  },

  /** Hanya untuk pengujian: mengosongkan semua keadaan. */
  reset(): void {
    antrian.clear();
    berjalan.clear();
    barusSelesai.clear();
    tombstone.clear();
    handler = {};
    sudahMuat = true;
    jedaKustom = null;
    if (pewaktu) clearInterval(pewaktu);
    pewaktu = null;
    try {
      localStorage.removeItem(KUNCI_PENYIMPANAN);
      localStorage.removeItem(KUNCI_TOMBSTONE);
    } catch {
      // abaikan
    }
    beritahu();
  },

  /**
   * Menaruh sebuah perubahan ke antrean dan mengirimnya. Aman dipanggil berkali-kali: simpanan yang
   * menumpuk digabung dan yang gagal dicoba ulang otomatis. Mengembalikan janji yang selesai saat
   * percobaan pertama berakhir (berhasil atau tertunda); tidak pernah menolak.
   */
  async masukkan(spek: SpesifikasiMutasi): Promise<void> {
    muatDariPenyimpanan();
    pastikanPewaktu();
    const kunci = kunciTugas(spek.entitas, spek.id, spek.aksi);

    if (spek.aksi === 'hapus') {
      // Yang menunggu untuk entitas ini tidak berguna lagi
      for (const k of ['simpan', 'status', 'ganti_id', 'reset_sandi'] as AksiMutasi[]) antrian.delete(kunciTugas(spek.entitas, spek.id, k));
    } else if (spek.aksi === 'simpan') {
      // Dibuat lagi setelah dihapus: penghapusan yang menunggu dibatalkan
      antrian.delete(kunciTugas(spek.entitas, spek.id, 'hapus'));
      tombstone.delete(kunciTombstone(spek.entitas, spek.id));
    }

    let t = antrian.get(kunci);
    if (t) {
      t.data = spek.data;
      t.idAlt = spek.idAlt ?? t.idAlt;
      // Data yang belum pernah sampai ke server tetap berstatus "baru" walau sudah diedit lagi sebelum terkirim;
      // dengan begitu tugas yang tidak baru (ubah) memang merujuk data yang sudah ada di server.
      const masihBaru = t.tambahan?.baru === true;
      t.tambahan = spek.tambahan ?? t.tambahan;
      if (masihBaru) t.tambahan = { ...(t.tambahan || {}), baru: true };
      t.label = spek.label ?? t.label;
      t.diperbaruiPada = Date.now();
      t.versi += 1;
      t.percobaanCocok = 0;
      t.berikutnyaPada = 0;
    } else {
      t = {
        kunci,
        entitas: spek.entitas,
        id: spek.id,
        idAlt: spek.idAlt,
        aksi: spek.aksi,
        data: spek.data,
        tambahan: spek.tambahan,
        label: spek.label || `${spek.entitas} ${spek.id}`,
        versi: 1,
        percobaan: 0,
        percobaanCocok: 0,
        berikutnyaPada: 0,
        dibuatPada: Date.now(),
        diperbaruiPada: Date.now(),
      };
      antrian.set(kunci, t);
    }
    simpan();
    simpanTombstone();
    beritahu();
    await jalankan(kunci);
  },

  /** Menghapus semua tugas sebuah entitas (mis. entitas yang dibuat lalu dibatalkan sebelum terkirim). */
  batalkan(entitas: EntitasMutasi, id: string): void {
    for (const k of ['simpan', 'hapus', 'status', 'ganti_id', 'reset_sandi'] as AksiMutasi[]) antrian.delete(kunciTugas(entitas, id, k));
    simpan();
    beritahu();
  },

  adaTugas(entitas: EntitasMutasi, id: string, aksi?: AksiMutasi): boolean {
    muatDariPenyimpanan();
    if (aksi) return antrian.has(kunciTugas(entitas, id, aksi));
    return Array.from(antrian.values()).some((t) => t.entitas === entitas && t.id === id);
  },

  ringkasan(): RingkasanMutasi {
    muatDariPenyimpanan();
    const daftar = Array.from(antrian.values());
    return {
      menunggu: daftar.length,
      berjalan: berjalan.size > 0,
      bermasalah: daftar.filter((t) => t.ditolak || t.percobaanCocok >= BATAS_PERCOBAAN_COCOK).length,
      butuhLoginUlang: daftar.some((t) => t.butuhLoginUlang),
      rincian: daftar.map((t) => ({
        kunci: t.kunci,
        label: t.label,
        percobaan: t.percobaan,
        galat: t.galat,
        selisih: t.selisih,
        ditolak: t.ditolak,
      })),
    };
  },

  berlangganan(fn: () => void): () => void {
    pendengar.add(fn);
    return () => pendengar.delete(fn);
  },

  /** Dipanggil setiap kali satu tugas berhasil dan terverifikasi. */
  saatSelesai(fn: (tugas: TugasMutasi, hasil: unknown) => void): () => void {
    pendengarSelesai.add(fn);
    return () => pendengarSelesai.delete(fn);
  },

  /** Dipanggil bila server menjawab datanya sudah dihapus (410); simpanan dibuang, layar harus membuang datanya. */
  saatDihapusServer(fn: (tugas: TugasMutasi, pesan: string) => void): () => void {
    pendengarDihapusServer.add(fn);
    return () => pendengarDihapusServer.delete(fn);
  },

  /** Dipanggil bila server menolak penghapusan dengan alasan tetap (mis. sudah Selesai); datanya harus tampil lagi. */
  saatHapusDitolak(fn: (tugas: TugasMutasi, pesan: string) => void): () => void {
    pendengarHapusDitolak.add(fn);
    return () => pendengarHapusDitolak.delete(fn);
  },

  kirimUlangSekarang,

  /** ID entitas yang sedang atau baru saja dihapus (belum tentu sudah hilang dari daftar server). */
  daftarTerhapus(entitas: EntitasMutasi): Set<string> {
    muatDariPenyimpanan();
    const hasil = new Set<string>();
    for (const t of antrian.values()) if (t.entitas === entitas && t.aksi === 'hapus') hasil.add(t.id);
    for (const s of barusSelesai.values()) if (s.tugas.entitas === entitas && s.tugas.aksi === 'hapus') hasil.add(s.tugas.id);
    for (const k of tombstone.keys()) {
      const [e, ...sisa] = k.split('|');
      if (e === entitas) hasil.add(sisa.join('|'));
    }
    return hasil;
  },

  /**
   * Menimpa daftar server yang baru dimuat dengan perubahan yang belum (atau baru saja) selesai:
   * simpanan menggantikan barisnya atau ditambahkan bila belum ada, penghapusan membuang barisnya.
   */
  terapkanKeDaftar<T>(entitas: EntitasMutasi, daftarServer: T[], opsi: OpsiOverlay<T>): T[] {
    muatDariPenyimpanan();
    const sekarang = Date.now();
    for (const [k, s] of barusSelesai) {
      if (sekarang - s.pada > MASA_INGAT_SELESAI_MS) barusSelesai.delete(k);
    }

    const tugas = new Map<string, TugasMutasi>();
    for (const [k, s] of barusSelesai) if (s.tugas.entitas === entitas) tugas.set(k, s.tugas);
    for (const [k, t] of antrian) if (t.entitas === entitas) tugas.set(k, t);

    const terhapus = new Set<string>();
    for (const k of tombstone.keys()) {
      const [e, ...sisa] = k.split('|');
      if (e === entitas) terhapus.add(sisa.join('|'));
    }

    // Tugas yang membawa keadaan entitas (simpan, status, ganti_id): yang terbaru per entitas menang
    const simpanan = new Map<string, TugasMutasi>();
    for (const t of tugas.values()) {
      if (t.aksi === 'hapus') {
        terhapus.add(t.id);
        if (t.idAlt) terhapus.add(t.idAlt);
      } else if (t.data !== undefined) {
        const lama = simpanan.get(t.id);
        if (!lama || (t.diperbaruiPada || t.dibuatPada) >= (lama.diperbaruiPada || lama.dibuatPada)) simpanan.set(t.id, t);
      }
    }
    if (terhapus.size === 0 && simpanan.size === 0) return daftarServer;

    // Setiap kunci yang dikenal sebuah tugas (ID sekarang dan kunci alami / ID lama) menunjuk ke tugas itu
    const menurutKunci = new Map<string, TugasMutasi>();
    for (const t of simpanan.values()) {
      menurutKunci.set(t.id, t);
      if (t.idAlt) menurutKunci.set(t.idAlt, t);
    }
    const cocokTugas = (baris: T): TugasMutasi | undefined => {
      const id = opsi.ambilId(baris);
      const alt = opsi.ambilIdAlt?.(baris);
      return menurutKunci.get(id) || (alt ? menurutKunci.get(alt) : undefined);
    };
    const dihapus = (baris: T): boolean => {
      const id = opsi.ambilId(baris);
      const alt = opsi.ambilIdAlt?.(baris);
      return terhapus.has(id) || Boolean(alt && terhapus.has(alt));
    };

    const dipakai = new Set<string>();
    const hasil: T[] = [];
    for (const baris of daftarServer) {
      if (dihapus(baris)) continue;
      const t = cocokTugas(baris);
      if (!t) {
        hasil.push(baris);
        continue;
      }
      // Beberapa baris server bisa menunjuk tugas yang sama (mis. ID lama dan baru): tampilkan sekali
      if (dipakai.has(t.id)) continue;
      dipakai.add(t.id);
      hasil.push(opsi.gabung ? opsi.gabung(baris, t.data as T) : (t.data as T));
    }
    // Simpanan yang belum pernah sampai ke server tetap tampil
    const baru: T[] = [];
    for (const t of simpanan.values()) {
      if (!dipakai.has(t.id) && !terhapus.has(t.id)) baru.push(t.data as T);
    }
    return [...baru, ...hasil];
  },
};
