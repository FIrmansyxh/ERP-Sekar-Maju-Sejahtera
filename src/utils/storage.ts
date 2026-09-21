import { hashPassword } from './crypto';
import { peringatanSimpanan } from './peringatanSimpanan';
import {
  Petani,
  Barang,
  TabelHarga,
  MasterHargaJual,
  TransaksiPembelian,
  PengirimanSample,
  BatchPengirimanSample,
  PengirimanBarang,
  User,
  AuditLogEntry,
} from '../types';
import LZString from 'lz-string';
import { pulihkanStatusSampleLama } from './kuponSortir';

import { INITIAL_BARANG_DATA } from '../data/initialBarangData';
import { INITIAL_HARGA_DATA } from '../data/initialHargaData';
import { INITIAL_HARGA_JUAL_DATA } from '../data/initialHargaJualData';
import { INITIAL_TRANSAKSI_DATA } from '../data/initialTransaksiData';
import { INITIAL_SAMPLE_DATA, INITIAL_BATCH_SAMPLE_DATA } from '../data/initialSampleData';
import { INITIAL_PENGIRIMAN_DATA } from '../data/initialPengirimanData';
import { INITIAL_USER_DATA } from '../data/initialUserData';

/**
 * Versi skema penyimpanan lokal.
 *
 * Naikkan versi ini hanya bila struktur data berubah dan data lama tidak lagi
 * kompatibel. Menaikkan versi akan menghapus seluruh data pada versi sebelumnya
 * dari peramban pengguna, jadi lakukan ekspor data terlebih dahulu.
 */
const STORAGE_VERSION = 'v40';
const NS = 'erp_tembakau_';

const KEY_PETANI = `${NS}petani_${STORAGE_VERSION}`;
const KEY_BARANG = `${NS}barang_${STORAGE_VERSION}`;
const KEY_HARGA = `${NS}harga_${STORAGE_VERSION}`;
const KEY_HARGA_JUAL = `${NS}harga_jual_${STORAGE_VERSION}`;
const KEY_TRANSAKSI = `${NS}transaksi_${STORAGE_VERSION}`;
const KEY_SAMPLE = `${NS}sample_${STORAGE_VERSION}`;
const KEY_BATCH_SAMPLE = `${NS}batch_sample_${STORAGE_VERSION}`;
const KEY_PENGIRIMAN = `${NS}pengiriman_${STORAGE_VERSION}`;
const KEY_USERS = `${NS}users_${STORAGE_VERSION}`;
const KEY_CURRENT_USER = `${NS}current_user_${STORAGE_VERSION}`;
const KEY_AUDIT_LOG = `${NS}audit_log_${STORAGE_VERSION}`;

/** Kunci yang dipantau untuk sinkronisasi kupon antar tab/jendela */
export const STORAGE_KEY_TRANSAKSI = KEY_TRANSAKSI;
export const STORAGE_KEY_BARANG = KEY_BARANG;
export const STORAGE_KEY_PETANI = KEY_PETANI;

/** Kunci sesi login (tidak dikompresi agar mudah dibersihkan saat logout). */
const KEY_RAW_AUTH = `${NS}auth_session`;
/** Penanda logout eksplisit supaya sesi tidak dipulihkan otomatis. */
const KEY_LOGOUT_FLAG = 'erp_explicit_logout';
/** Preferensi tampilan (modul terakhir dibuka). */
const KEY_ACTIVE_MODULE = `${NS}active_module`;

const DATA_KEYS = [
  KEY_PETANI,
  KEY_BARANG,
  KEY_HARGA,
  KEY_HARGA_JUAL,
  KEY_TRANSAKSI,
  KEY_SAMPLE,
  KEY_BATCH_SAMPLE,
  KEY_PENGIRIMAN,
  KEY_USERS,
  KEY_CURRENT_USER,
  KEY_AUDIT_LOG,
];

const PRESERVED_KEYS = new Set([...DATA_KEYS, KEY_RAW_AUTH, KEY_ACTIVE_MODULE]);

const memoryStore = new Map<string, string>();

const safeSetItem = (key: string, data: unknown) => {
  try {
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    try {
      localStorage.setItem(key, compressed);
    } catch (storageErr) {
      console.warn(`Kuota localStorage penuh untuk ${key}, memakai penyimpanan memori.`, storageErr);
      memoryStore.set(key, compressed);
      peringatanSimpanan.laporkanKuotaPenuh(key);
    }
  } catch (err) {
    console.error(`Gagal menyimpan data ${key}:`, err);
  }
};

const safeGetItem = (key: string): string | null => {
  try {
    let compressed: string | null = null;
    try {
      compressed = localStorage.getItem(key);
    } catch {
      // Peramban memblokir akses storage (mode privat).
    }
    if (!compressed) {
      compressed = memoryStore.get(key) || null;
    }
    if (!compressed) return null;

    // Data lama yang belum terkompresi disimpan sebagai JSON mentah.
    if (compressed.startsWith('[') || compressed.startsWith('{')) {
      return compressed;
    }
    return LZString.decompressFromUTF16(compressed);
  } catch (err) {
    console.error(`Gagal membaca data ${key}:`, err);
    return null;
  }
};

/** Membaca daftar tersimpan; mengembalikan null bila belum pernah diisi. */
function readList<T>(key: string): T[] | null {
  try {
    const saved = safeGetItem(key);
    if (saved === null) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch (err) {
    console.error(`Gagal memproses data ${key}:`, err);
    return null;
  }
}

/**
 * Menghapus sisa data dari versi skema sebelumnya agar instalasi baru
 * benar-benar bersih dan tidak tercampur data lama.
 */
(function purgeLegacyStorage() {
  try {
    if (typeof localStorage === 'undefined') return;
    const staleKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS) && !PRESERVED_KEYS.has(k)) {
        staleKeys.push(k);
      }
    }
    staleKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Diabaikan pada lingkungan non-peramban.
  }
})();

// --- MANAJEMEN PENGGUNA & OTENTIKASI (RBAC) ---

/**
 * Memuat daftar pengguna. Bila belum ada pengguna sama sekali, akun Super Admin
 * bawaan dipasang agar sistem tidak terkunci pada penggunaan perdana.
 */
export function loadUserData(): User[] {
  const saved = readList<User>(KEY_USERS);
  if (saved && saved.length > 0) {
    const hasActiveSuperadmin = saved.some((u) => u.role === 'superadmin' && u.status_aktif);
    if (!hasActiveSuperadmin) {
      const restored = [...saved, ...INITIAL_USER_DATA];
      saveUserData(restored);
      return restored;
    }
    return saved;
  }
  saveUserData(INITIAL_USER_DATA);
  return INITIAL_USER_DATA;
}

export function saveUserData(data: User[]): void {
  safeSetItem(KEY_USERS, data);
}

/**
 * Memulihkan sesi login. Sesi hanya dianggap sah bila pengguna masih terdaftar
 * dan berstatus aktif; data sesi yang tidak cocok diabaikan.
 */
export function loadCurrentUser(): User | null {
  try {
    if (localStorage.getItem(KEY_LOGOUT_FLAG) === 'true') {
      return null;
    }

    let rawData: string | null = safeGetItem(KEY_CURRENT_USER);
    if (!rawData) {
      rawData = localStorage.getItem(KEY_RAW_AUTH);
    }
    if (!rawData) return null;

    const parsed = JSON.parse(rawData);
    if (!parsed || typeof parsed !== 'object' || !parsed.user_id) return null;

    const found = loadUserData().find((u) => u.user_id === parsed.user_id && u.status_aktif);
    return found || null;
  } catch (err) {
    console.error('Gagal memulihkan sesi pengguna:', err);
    return null;
  }
}

export function saveCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.removeItem(KEY_LOGOUT_FLAG);
      safeSetItem(KEY_CURRENT_USER, user);
      try {
        localStorage.setItem(KEY_RAW_AUTH, JSON.stringify(user));
      } catch {
        // Kuota penuh atau mode privat: sesi tetap berjalan di memori.
      }
    } else {
      localStorage.setItem(KEY_LOGOUT_FLAG, 'true');
      localStorage.removeItem(KEY_CURRENT_USER);
      localStorage.removeItem(KEY_RAW_AUTH);
      memoryStore.delete(KEY_CURRENT_USER);
    }
  } catch (err) {
    console.error('Gagal menyimpan sesi pengguna:', err);
  }
}

export async function authenticateUser(
  usernameInput: string,
  passwordInput: string,
): Promise<{ success: boolean; user?: User; message: string }> {
  const users = loadUserData();
  const cleanUsername = usernameInput.trim().toLowerCase();
  const found = users.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername ||
      (u.email && u.email.toLowerCase() === cleanUsername),
  );

  if (!found) {
    return { success: false, message: 'Username atau email tidak terdaftar dalam sistem.' };
  }

  if (!found.status_aktif) {
    return {
      success: false,
      message: 'Akun ini telah dinonaktifkan oleh Administrator. Hubungi IT Gudang.',
    };
  }

  if (!found.password) {
    return {
      success: false,
      message: 'Akun ini belum memiliki kata sandi. Hubungi Administrator untuk mengatur ulang.',
    };
  }

  // Kata sandi baku disimpan sebagai hash SHA-256 (64 karakter heksadesimal).
  // Perbandingan teks biasa hanya dipakai untuk akun lama yang belum ter-hash.
  const isHash = /^[0-9a-f]{64}$/i.test(found.password);
  const passwordMatches = isHash
    ? found.password.toLowerCase() === (await hashPassword(passwordInput)).toLowerCase()
    : found.password === passwordInput;

  if (!passwordMatches) {
    return { success: false, message: 'Kata sandi (password) yang Anda masukkan salah.' };
  }

  const nowIso = new Date().toISOString();
  saveUserData(users.map((u) => (u.user_id === found.user_id ? { ...u, terakhir_login: nowIso } : u)));

  const updatedCurrent = { ...found, terakhir_login: nowIso };
  saveCurrentUser(updatedCurrent);

  return { success: true, user: updatedCurrent, message: 'Login berhasil.' };
}

// --- MASTER PETANI ---
export function loadPetaniData(): Petani[] {
  return readList<Petani>(KEY_PETANI) ?? [];
}

export function savePetaniData(data: Petani[]): void {
  safeSetItem(KEY_PETANI, data);
}

// --- STOK BAL (BARANG) ---
export function loadBarangData(): Barang[] {
  // Status 'terkirim_sample' dari data lama dipulihkan: Batch Sample tidak mengubah status bal
  return (readList<Barang>(KEY_BARANG) ?? INITIAL_BARANG_DATA).map(pulihkanStatusSampleLama);
}

export function saveBarangData(data: Barang[]): void {
  safeSetItem(KEY_BARANG, data);
}

// --- MASTER HARGA BELI ---
export function loadHargaData(): TabelHarga[] {
  const saved = readList<TabelHarga>(KEY_HARGA);
  if (!saved) return INITIAL_HARGA_DATA;

  // Jaga agar tidak ada harga_id ganda yang membuat baris saling menimpa.
  const seenIds = new Set<string>();
  const cleaned: TabelHarga[] = [];
  let hasDuplicate = false;

  saved.forEach((item, index) => {
    if (!item || !item.harga_id) return;
    if (seenIds.has(item.harga_id)) {
      hasDuplicate = true;
      cleaned.push({ ...item, harga_id: `${item.harga_id}-dup-${index}` });
    } else {
      seenIds.add(item.harga_id);
      cleaned.push(item);
    }
  });

  if (hasDuplicate) saveHargaData(cleaned);
  return cleaned;
}

export function saveHargaData(data: TabelHarga[]): void {
  safeSetItem(KEY_HARGA, data);
}

// --- MASTER HARGA JUAL ---
export function loadHargaJualData(): MasterHargaJual[] {
  return readList<MasterHargaJual>(KEY_HARGA_JUAL) ?? INITIAL_HARGA_JUAL_DATA;
}

export function saveHargaJualData(data: MasterHargaJual[]): void {
  safeSetItem(KEY_HARGA_JUAL, data);
}

// --- TRANSAKSI PEMBELIAN ---
export function loadTransaksiData(): TransaksiPembelian[] {
  return readList<TransaksiPembelian>(KEY_TRANSAKSI) ?? INITIAL_TRANSAKSI_DATA;
}

export function saveTransaksiData(data: TransaksiPembelian[]): void {
  safeSetItem(KEY_TRANSAKSI, data);
}

// --- PENGIRIMAN SAMPLE ---
export function loadSampleData(): PengirimanSample[] {
  return readList<PengirimanSample>(KEY_SAMPLE) ?? INITIAL_SAMPLE_DATA;
}

export function saveSampleData(data: PengirimanSample[]): void {
  safeSetItem(KEY_SAMPLE, data);
}

// --- BATCH PENGIRIMAN SAMPLE ---
export function loadBatchSampleData(): BatchPengirimanSample[] {
  return readList<BatchPengirimanSample>(KEY_BATCH_SAMPLE) ?? INITIAL_BATCH_SAMPLE_DATA;
}

export function saveBatchSampleData(data: BatchPengirimanSample[]): void {
  safeSetItem(KEY_BATCH_SAMPLE, data);
}

// --- PENGIRIMAN BARANG ---
export function loadPengirimanData(): PengirimanBarang[] {
  return readList<PengirimanBarang>(KEY_PENGIRIMAN) ?? INITIAL_PENGIRIMAN_DATA;
}

export function savePengirimanData(data: PengirimanBarang[]): void {
  safeSetItem(KEY_PENGIRIMAN, data);
}

// --- LOG AKTIVITAS & AUDIT TRAIL ---
export function loadAuditLogData(): AuditLogEntry[] {
  return readList<AuditLogEntry>(KEY_AUDIT_LOG) ?? [];
}

export function saveAuditLogData(data: AuditLogEntry[]): void {
  safeSetItem(KEY_AUDIT_LOG, data);
}

/** Batas jumlah baris audit yang disimpan agar kuota peramban tidak penuh. */
const AUDIT_LOG_LIMIT = 500;

export function recordAuditLog(entry: Omit<AuditLogEntry, 'log_id' | 'timestamp'>): void {
  try {
    const logs = loadAuditLogData();
    const newEntry: AuditLogEntry = {
      ...entry,
      log_id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    saveAuditLogData([newEntry, ...logs].slice(0, AUDIT_LOG_LIMIT));
  } catch (err) {
    console.error('Gagal mencatat log audit:', err);
  }
}

/**
 * Mengosongkan seluruh data operasional dan master pada peramban ini,
 * lalu mengembalikan sistem ke kondisi instalasi baru.
 *
 * Sesi login dan daftar pengguna ikut dikosongkan, sehingga setelah dipanggil
 * pengguna harus login ulang memakai akun Super Admin bawaan.
 */
export function resetAllERPData(): void {
  savePetaniData([]);
  saveBarangData([]);
  saveHargaData([]);
  saveHargaJualData([]);
  saveTransaksiData([]);
  saveSampleData([]);
  saveBatchSampleData([]);
  savePengirimanData([]);
  saveAuditLogData([]);
  saveUserData(INITIAL_USER_DATA);
  saveCurrentUser(null);
}
