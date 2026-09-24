import LZString from 'lz-string';

/**
 * Penyimpanan draf kerja yang belum sempat disimpan: daftar bal pada Sortir,
 * tabel draft batch Sample, dan manifest Pengiriman.
 *
 * Dua lapis penyimpanan dipakai bersamaan.
 *
 * - sessionStorage menjadi sumber utama. Isinya bertahan saat halaman
 *   di-refresh, saat operator berpindah modul, dan saat tab dipakai membuka
 *   halaman lain lalu kembali, tetapi ikut hilang begitu tab ditutup.
 * - localStorage menjadi cadangan khusus mati mendadak, karena sessionStorage
 *   ikut lenyap bersama proses peramban ketika listrik putus.
 *
 * Cadangan hanya dipulihkan bila peramban tidak sempat menandai penutupan yang
 * wajar. Penanda "ditutup dengan benar" ditulis ketika halaman ditinggalkan,
 * lalu dihapus lagi oleh denyut berkala selama aplikasi masih hidup, sehingga
 * menutup satu tab tidak membuat tab lain dianggap ikut tertutup.
 *
 * Namespace sengaja tidak memakai awalan erp_tembakau_ karena utils/storage.ts
 * membersihkan seluruh kunci berawalan itu yang bukan data resmi.
 */

const NS = 'erp_draft_';
const DRAFT_VERSION = 'v1';
const DATA_PREFIX = `${NS}${DRAFT_VERSION}_`;

/** Batas usia draf cadangan, disamakan dengan auto-logout 30 menit. */
export const DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

/** Waktu terakhir aplikasi diketahui masih hidup. */
const KEY_ALIVE = `${NS}meta_alive`;
/** Penanda bahwa halaman ditinggalkan secara wajar, bukan mati mendadak. */
const KEY_CLOSED = `${NS}meta_closed`;

/** Cadangan bila peramban memblokir storage (mode privat / kuota penuh). */
const memoryStore = new Map<string, string>();

function draftKey(scope: string, userId?: string): string {
  return `${DATA_PREFIX}${userId || 'anon'}_${scope}`;
}

function collectBackupKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DATA_PREFIX)) keys.push(k);
    }
  } catch {
    // Diabaikan bila storage tidak tersedia.
  }
  return keys;
}

// --- PEMULIHAN SETELAH MATI MENDADAK ---

const recoveryInfo = { restored: 0, discarded: 0 };

/**
 * Jumlah draf yang berhasil dipulihkan dari cadangan pada pemuatan ini.
 * Dipakai App untuk memberi tahu operator bahwa isiannya kembali.
 */
export function getDraftRecovery(): { restored: number; discarded: number } {
  return { ...recoveryInfo };
}

/**
 * Menentukan nasib draf cadangan tepat saat modul dimuat, sebelum komponen
 * mana pun sempat membaca drafnya sendiri.
 */
(function resolveDraftRecovery() {
  try {
    if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') return;

    const backupKeys = collectBackupKeys();
    if (backupKeys.length === 0) {
      localStorage.removeItem(KEY_CLOSED);
      return;
    }

    // Tab ini masih memegang draf sendiri: yang terjadi cuma refresh atau
    // kembali dari halaman lain, jadi cadangan tidak perlu ikut campur.
    let sessionHasDraft = false;
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(DATA_PREFIX)) {
        sessionHasDraft = true;
        break;
      }
    }

    if (!sessionHasDraft) {
      const closedCleanly = localStorage.getItem(KEY_CLOSED) === '1';
      const lastAlive = parseInt(localStorage.getItem(KEY_ALIVE) || '0', 10);
      const tooOld = !lastAlive || Date.now() - lastAlive > DRAFT_MAX_AGE_MS;

      if (closedCleanly || tooOld) {
        // Ditutup dengan sadar, atau ditinggal lebih dari batas auto-logout.
        backupKeys.forEach((k) => localStorage.removeItem(k));
        recoveryInfo.discarded = backupKeys.length;
      } else {
        // Peramban tidak sempat pamit: perlakukan sebagai mati mendadak.
        backupKeys.forEach((k) => {
          const val = localStorage.getItem(k);
          if (!val) return;
          try {
            sessionStorage.setItem(k, val);
            recoveryInfo.restored += 1;
          } catch {
            memoryStore.set(k, val);
            recoveryInfo.restored += 1;
          }
        });
      }
    }

    localStorage.removeItem(KEY_CLOSED);
  } catch (err) {
    console.error('Gagal memeriksa draf cadangan:', err);
  }
})();

// --- DENYUT & PENANDA PENUTUPAN ---

/**
 * Menandai aplikasi masih hidup sekaligus membatalkan penanda penutupan yang
 * mungkin ditinggalkan tab lain yang baru saja ditutup.
 */
export function touchDraftAlive(): void {
  try {
    localStorage.setItem(KEY_ALIVE, String(Date.now()));
    localStorage.removeItem(KEY_CLOSED);
  } catch {
    // Diabaikan bila storage tidak tersedia.
  }
}

/** Menandai halaman ditinggalkan secara wajar (tutup tab, pindah halaman). */
export function markDraftCleanExit(): void {
  try {
    localStorage.setItem(KEY_CLOSED, '1');
  } catch {
    // Diabaikan bila storage tidak tersedia.
  }
}

// --- BACA & TULIS DRAF ---

export function saveDraft(scope: string, userId: string | undefined, data: unknown): void {
  const key = draftKey(scope, userId);
  try {
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    try {
      sessionStorage.setItem(key, compressed);
      memoryStore.delete(key);
    } catch (storageErr) {
      console.warn(`Kuota sessionStorage penuh untuk draf ${scope}, memakai penyimpanan memori.`, storageErr);
      memoryStore.set(key, compressed);
    }
    try {
      // Cadangan mati mendadak; kegagalannya tidak boleh mengganggu draf utama.
      localStorage.setItem(key, compressed);
      localStorage.setItem(KEY_ALIVE, String(Date.now()));
    } catch {
      // Kuota localStorage penuh: draf utama tetap aman di sessionStorage.
    }
  } catch (err) {
    console.error(`Gagal menyimpan draf ${scope}:`, err);
  }
}

export function loadDraft<T>(scope: string, userId?: string): T | null {
  const key = draftKey(scope, userId);
  try {
    let compressed: string | null = null;
    try {
      compressed = sessionStorage.getItem(key);
    } catch {
      // Peramban memblokir akses storage (mode privat).
    }
    if (!compressed) {
      compressed = memoryStore.get(key) || null;
    }
    if (!compressed) return null;

    const raw = LZString.decompressFromUTF16(compressed);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Gagal membaca draf ${scope}:`, err);
    return null;
  }
}

export function clearDraft(scope: string, userId?: string): void {
  const key = draftKey(scope, userId);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Diabaikan bila storage tidak tersedia.
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // Diabaikan bila storage tidak tersedia.
  }
  memoryStore.delete(key);
}

/**
 * Membuang seluruh draf beserta cadangannya. Dipanggil saat logout, baik
 * logout manual maupun otomatis karena sesi habis, agar draf tidak berpindah
 * pengguna dan tidak ikut dipulihkan pada pembukaan berikutnya.
 */
export function clearAllDrafts(): void {
  try {
    const staleKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(NS)) staleKeys.push(k);
    }
    staleKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Diabaikan pada lingkungan non-peramban.
  }

  try {
    collectBackupKeys().forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(KEY_ALIVE);
    localStorage.removeItem(KEY_CLOSED);
  } catch {
    // Diabaikan pada lingkungan non-peramban.
  }

  memoryStore.clear();
  recoveryInfo.restored = 0;
  recoveryInfo.discarded = 0;
}
