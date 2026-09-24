import { api } from './apiClient';
import { ErpApiService, mapPetaniFromApi, waktuServer } from './erpApi';
import { tandaiServerKenalDraft } from '../utils/statusBatchSample';
import type {
  Barang,
  BatchPengirimanSample,
  MasterHargaJual,
  PengirimanBarang,
  Petani,
  TabelHarga,
  TransaksiPembelian,
  User,
} from '../types';

/**
 * Sinkron lintas perangkat: layar setiap komputer mengikuti server.
 *
 * Beberapa detik sekali aplikasi bertanya ke server "apa yang berubah sejak terakhir saya bertanya"
 * (GET /sync/perubahan?sejak=...). Server menjawab baris yang berubah dan ID yang dihapus. Jawaban itu diterapkan apa
 * adanya: baris yang dihapus di komputer lain hilang dari layar, baris yang diubah ikut berubah, baris baru muncul.
 * Tidak ada lagi daftar lokal yang "menang" atas server.
 */

export type EntitasSinkron =
  | 'petani'
  | 'transaksi'
  | 'barang'
  | 'harga_beli'
  | 'harga_jual'
  | 'batch_sample'
  | 'pengiriman'
  | 'users';

export const SEMUA_ENTITAS: EntitasSinkron[] = [
  'petani',
  'transaksi',
  'barang',
  'harga_beli',
  'harga_jual',
  'batch_sample',
  'pengiriman',
  'users',
];

export interface PaketSinkron {
  /** Berisi SEMUA data (bukan hanya perubahan): baris yang tidak ada di paket berarti tidak ada di server */
  penuh: boolean;
  /** Waktu server saat paket dibaca; dikirim lagi sebagai `sejak` pada pertanyaan berikutnya */
  serverTime: string | null;
  petani?: Petani[];
  transaksi?: TransaksiPembelian[];
  barang?: Barang[];
  harga_beli?: TabelHarga[];
  harga_jual?: MasterHargaJual[];
  batch_sample?: BatchPengirimanSample[];
  pengiriman?: PengirimanBarang[];
  users?: User[];
  dihapus: Partial<Record<EntitasSinkron, string[]>>;
}

export const mapHargaBeli = (raw: any): TabelHarga => ({
  ...raw,
  harga_per_kg: Number(raw?.harga_per_kg) || 0,
  diperbarui_pada: waktuServer(raw),
});

export const mapHargaJual = (raw: any): MasterHargaJual => ({
  ...raw,
  harga_jual: Number(raw?.harga_jual) || 0,
  status_aktif: raw?.status_aktif !== false && raw?.status_aktif !== 0 && raw?.status_aktif !== 'false',
  diperbarui_pada: waktuServer(raw),
});

export const mapUser = (raw: any): User => {
  const { password_hash: _sandi, updated_at: _u, ...sisa } = raw || {};
  return {
    ...sisa,
    role: raw?.role || raw?.role_code || 'superadmin',
    status_aktif: raw?.status_aktif !== false && raw?.status_aktif !== 0 && raw?.status_aktif !== 'false',
    diperbarui_pada: waktuServer(raw),
  } as User;
};

const PEMETA: Record<EntitasSinkron, (raw: any) => any> = {
  petani: mapPetaniFromApi,
  transaksi: (t) => ErpApiService.mapBackendTransaksi(t),
  barang: (b) => ErpApiService.mapBackendBarang(b),
  harga_beli: mapHargaBeli,
  harga_jual: mapHargaJual,
  batch_sample: (b) => ErpApiService.mapBackendBatchSample(b),
  pengiriman: (p) => ErpApiService.mapBackendPengiriman(p),
  users: mapUser,
};

/** Endpoint lama per daftar, dipakai bila server belum punya /sync/perubahan. */
const ENDPOINT_LAMA: Record<EntitasSinkron, string> = {
  petani: '/petani',
  transaksi: '/transaksi',
  barang: '/barang',
  harga_beli: '/master/harga-beli',
  harga_jual: '/master/harga-jual',
  batch_sample: '/sample-batch',
  pengiriman: '/pengiriman',
  users: '/users',
};

const ruteBelumAda = (err: unknown): boolean => {
  const status = (err as { status?: number } | null)?.status;
  const pesan = err instanceof Error ? err.message : String(err);
  return status === 405 || (status === 404 && /route|could not be found/i.test(pesan));
};

function petakanPaket(mentah: Record<string, unknown>, paket: PaketSinkron): PaketSinkron {
  for (const e of SEMUA_ENTITAS) {
    const baris = mentah[e];
    if (Array.isArray(baris)) (paket as any)[e] = baris.map((r) => PEMETA[e](r));
  }
  if (paket.batch_sample?.some((b) => b.status === 'draft')) tandaiServerKenalDraft(true);
  return paket;
}

/** Server lama tanpa /sync/perubahan: semua daftar dimuat penuh dari endpoint masing-masing. */
async function ambilSemuaDaftarLama(): Promise<PaketSinkron> {
  const hasil = await Promise.all(
    SEMUA_ENTITAS.map(async (e) => {
      const res = await api.get<any[]>(ENDPOINT_LAMA[e]);
      return [e, Array.isArray(res.data) ? res.data : []] as const;
    })
  );
  return petakanPaket(Object.fromEntries(hasil), { penuh: true, serverTime: null, dihapus: {} });
}

/**
 * Perubahan sejak `sejak` (null = semua data). Melempar galat bila server tidak terjangkau / menolak; pemanggil
 * tetap menampilkan data terakhir yang diketahui.
 */
export async function ambilPerubahan(sejak: string | null): Promise<PaketSinkron> {
  let res: any;
  try {
    res = await api.get<any>(`/sync/perubahan${sejak ? `?sejak=${encodeURIComponent(sejak)}` : ''}`);
  } catch (err) {
    if (ruteBelumAda(err)) return ambilSemuaDaftarLama();
    throw err;
  }
  const dihapus: PaketSinkron['dihapus'] = {};
  const mentahHapus = (res?.dihapus || {}) as Record<string, unknown>;
  for (const e of SEMUA_ENTITAS) {
    const id = mentahHapus[e];
    if (Array.isArray(id) && id.length > 0) dihapus[e] = id.map(String);
  }
  return petakanPaket((res?.data || {}) as Record<string, unknown>, {
    penuh: Boolean(res?.penuh) || !sejak,
    serverTime: typeof res?.server_time === 'string' ? res.server_time : null,
    dihapus,
  });
}

// ---------- Penggabungan ke daftar di layar ----------

const waktu = (baris: unknown): number => {
  const v = (baris as { diperbarui_pada?: string } | null)?.diperbarui_pada;
  const n = v ? Date.parse(v) : NaN;
  return Number.isNaN(n) ? 0 : n;
};

const sama = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

export interface OpsiGabung<T> {
  ambilId: (baris: T) => string;
  /** Menggabung baris server dengan baris di layar (untuk rincian yang memang tidak disimpan server) */
  gabung?: (lokal: T | undefined, server: T) => T;
  /** ID yang baru saja dihapus dari perangkat ini: data yang datang terlambat tidak boleh menghidupkannya lagi */
  abaikan?: ReadonlySet<string>;
  /** Waktu server paket; pada muatan penuh baris di layar yang lebih baru dari ini (baru disimpan) dipertahankan */
  waktuPaket?: string | null;
}

/**
 * Menerapkan paket server ke satu daftar. Aturan:
 *  - baris yang dihapus di server dibuang;
 *  - baris server menggantikan baris di layar, KECUALI baris di layar lebih baru (jawaban simpanan yang tiba lebih
 *    dulu daripada paket sinkron yang sudah dibaca server sebelumnya);
 *  - muatan penuh: baris yang tidak ada di server dibuang (sudah dihapus / tidak pernah tersimpan), kecuali yang
 *    tersimpan setelah paket itu dibaca.
 * Mengembalikan daftar yang sama (referensi sama) bila tidak ada yang berubah, supaya layar tidak digambar ulang.
 */
export function gabungDaftar<T>(
  lama: T[],
  server: T[] | undefined,
  dihapus: string[] | undefined,
  penuh: boolean,
  opsi: OpsiGabung<T>
): T[] {
  const { ambilId, gabung, abaikan } = opsi;
  if (!server && !(dihapus && dihapus.length > 0)) return lama;
  const petaLama = new Map(lama.map((x) => [ambilId(x), x] as const));
  const siapkan = (s: T): T | null => {
    const id = ambilId(s);
    if (abaikan?.has(id)) return null;
    const l = petaLama.get(id);
    if (l && waktu(l) > waktu(s)) return l;
    return gabung ? gabung(l, s) : s;
  };

  if (penuh && server) {
    const batas = opsi.waktuPaket ? Date.parse(opsi.waktuPaket) : NaN;
    const ada = new Set<string>();
    const hasil: T[] = [];
    for (const s of server) {
      const v = siapkan(s);
      if (!v) continue;
      ada.add(ambilId(s));
      hasil.push(v);
    }
    if (!Number.isNaN(batas)) {
      const lebihBaru = lama.filter((l) => {
        const id = ambilId(l);
        return !ada.has(id) && !abaikan?.has(id) && waktu(l) > batas;
      });
      if (lebihBaru.length > 0) hasil.unshift(...lebihBaru);
    }
    return hasil.length === lama.length && hasil.every((x, i) => sama(x, lama[i])) ? lama : hasil;
  }

  const hapus = new Set(dihapus || []);
  let berubah = false;
  const ganti = new Map<string, T>();
  const baru: T[] = [];
  for (const s of server || []) {
    const id = ambilId(s);
    if (hapus.has(id)) continue;
    const v = siapkan(s);
    if (!v) continue;
    const l = petaLama.get(id);
    if (l) {
      if (!sama(l, v)) {
        ganti.set(id, v);
        berubah = true;
      }
    } else if (!baru.some((b) => ambilId(b) === id)) {
      baru.push(v);
      berubah = true;
    }
  }
  const sisa = lama.filter((x) => !hapus.has(ambilId(x)));
  if (sisa.length !== lama.length) berubah = true;
  if (!berubah) return lama;
  return [...baru, ...sisa.map((x) => ganti.get(ambilId(x)) ?? x)];
}
