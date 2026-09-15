import { hashPassword } from './crypto';
import { 
  Petani, 
  Barang, 
  MasterBarang,
  StockOpnameSession,
  TabelHarga, 
  MasterHargaJual,
  TransaksiPembelian, 
  TransaksiItemBal,
  PengirimanSample, 
  BatchPengirimanSample,
  PengirimanBarang,
  User,
  AuditLogEntry
} from '../types';
import LZString from 'lz-string';

const memoryStore = new Map<string, string>();

const safeSetItem = (key: string, data: any) => {
  try {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(jsonStr);
    
    // Always persist to localStorage, with fallback to memoryStore if storage quota is exceeded
    try {
      localStorage.setItem(key, compressed);
    } catch (storageErr) {
      console.warn(`localStorage quota exceeded for ${key}, falling back to memory store`, storageErr);
      memoryStore.set(key, compressed);
    }
  } catch (err) {
    console.error(`Failed to save data for ${key}:`, err);
  }
};

const safeGetItem = (key: string) => {
  try {
    let compressed: string | null = null;
    try {
      compressed = localStorage.getItem(key);
    } catch (e) {
      // ignore
    }
    if (!compressed) {
      compressed = memoryStore.get(key) || null;
    }
    
    if (!compressed) return null;
    
    // Fallback for older uncompressed data
    if (compressed.startsWith('[') || compressed.startsWith('{')) {
      return compressed;
    }
    
    const decompressed = LZString.decompressFromUTF16(compressed);
    return decompressed;
  } catch (err) {
    console.error(`Failed to load data for ${key}:`, err);
    return null;
  }
};

import { INITIAL_PETANI_DATA } from '../data/initialPetaniData';
import { INITIAL_BARANG_DATA } from '../data/initialBarangData';
import { INITIAL_MASTER_BARANG_DATA } from '../data/initialMasterBarangData';
import { INITIAL_HARGA_DATA } from '../data/initialHargaData';
import { INITIAL_HARGA_JUAL_DATA } from '../data/initialHargaJualData';
import { INITIAL_TRANSAKSI_DATA } from '../data/initialTransaksiData';
import { INITIAL_SAMPLE_DATA, INITIAL_BATCH_SAMPLE_DATA } from '../data/initialSampleData';
import { INITIAL_PENGIRIMAN_DATA } from '../data/initialPengirimanData';
import { INITIAL_USER_DATA } from '../data/initialUserData';

const KEY_PETANI = 'erp_tembakau_petani_v31';
const KEY_BARANG = 'erp_tembakau_barang_v31';
const KEY_MASTER_BARANG = 'erp_tembakau_master_barang_v31';
const KEY_STOCK_OPNAME = 'erp_tembakau_stock_opname_v31';
const KEY_HARGA = 'erp_tembakau_harga_v31';
const KEY_HARGA_JUAL = 'erp_tembakau_harga_jual_v31';
const KEY_TRANSAKSI = 'erp_tembakau_transaksi_v31';
const KEY_SAMPLE = 'erp_tembakau_sample_v31';
const KEY_BATCH_SAMPLE = 'erp_tembakau_batch_sample_v31';
const KEY_PENGIRIMAN = 'erp_tembakau_pengiriman_v31';
const KEY_USERS = 'erp_tembakau_users_v31';
const KEY_CURRENT_USER = 'erp_tembakau_current_user_v31';
const KEY_AUDIT_LOG = 'erp_tembakau_audit_log_v31';

// Clean up old version demo caches
(function purgeLegacyDemoCaches() {
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('erp_tembakau_') && !k.endsWith('_v31') && !k.endsWith('_date') && !k.endsWith('_snapshots_v1'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (e) {
    // Ignore in non-browser env
  }
})();

// --- USER MANAGEMENT & AUTH (RBAC) ---
export function loadUserData(): User[] {
  try {
    const saved = safeGetItem(KEY_USERS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure standard default accounts like adminkasir are present
        let hasMissingDefault = false;
        const merged = [...parsed];
        for (const defaultUser of INITIAL_USER_DATA) {
          if (!merged.some((u) => u.username.toLowerCase() === defaultUser.username.toLowerCase() || u.role === defaultUser.role)) {
            merged.push(defaultUser);
            hasMissingDefault = true;
          }
        }
        if (hasMissingDefault) {
          saveUserData(merged);
        }
        return merged;
      }
    }
  } catch (err) {
    console.error('Failed to load user data:', err);
  }
  saveUserData(INITIAL_USER_DATA);
  return INITIAL_USER_DATA;
}

export function saveUserData(data: User[]): void {
  try {
    safeSetItem(KEY_USERS, data);
  } catch (err) {
    console.error('Failed to save user data:', err);
  }
}

const KEY_RAW_AUTH = 'erp_tembakau_auth_session';
const KEY_LOGOUT_FLAG = 'erp_explicit_logout';

export function loadCurrentUser(): User | null {
  try {
    // If user explicitly clicked Logout, respect it
    if (localStorage.getItem(KEY_LOGOUT_FLAG) === 'true') {
      return null;
    }

    let rawData: string | null = null;
    try {
      rawData = safeGetItem(KEY_CURRENT_USER);
    } catch {
      // ignore
    }

    if (!rawData) {
      rawData = localStorage.getItem(KEY_RAW_AUTH) || localStorage.getItem(KEY_CURRENT_USER);
    }

    if (rawData) {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (parsed && typeof parsed === 'object' && parsed.user_id) {
        const allUsers = loadUserData();
        const found = allUsers.find((u) => u.user_id === parsed.user_id && u.status_aktif);
        if (found) return found;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load current user:', err);
  }
  return null;
}

export function saveCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.removeItem(KEY_LOGOUT_FLAG);
      safeSetItem(KEY_CURRENT_USER, user);
      try {
        localStorage.setItem(KEY_RAW_AUTH, JSON.stringify(user));
      } catch {
        // quota exceeded or private mode safe
      }
    } else {
      localStorage.setItem(KEY_LOGOUT_FLAG, 'true');
      localStorage.removeItem(KEY_CURRENT_USER);
      localStorage.removeItem(KEY_RAW_AUTH);
    }
  } catch (err) {
    console.error('Failed to save current user:', err);
  }
}



export async function authenticateUser(usernameInput: string, passwordInput: string): Promise<{ success: boolean; user?: User; message: string }> {
  const users = loadUserData();
  const cleanUsername = usernameInput.trim().toLowerCase();
  const found = users.find(
    (u) => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername)
  );

  if (!found) {
    return { success: false, message: 'Username atau email tidak terdaftar dalam sistem.' };
  }

  if (!found.status_aktif) {
    return { success: false, message: 'Akun ini telah dinonaktifkan oleh Administrator. Hubungi IT Gudang.' };
  }

  // Check password
  if (found.password) {
    // Migration fallback: if the stored password doesn't look like a SHA-256 hash (64 chars),
    // and matches the plain text exactly, we allow it (for dummy/legacy users).
    const isHash = found.password.length === 64;
    const inputHash = await hashPassword(passwordInput);

    if (isHash) {
      if (found.password !== inputHash) {
        return { success: false, message: 'Kata sandi (password) yang Anda masukkan salah.' };
      }
    } else {
      if (found.password !== passwordInput) {
        return { success: false, message: 'Kata sandi (password) yang Anda masukkan salah.' };
      }
    }
  }

  // Update last login
  const nowIso = new Date().toISOString();
  const updatedUsers = users.map((u) => u.user_id === found.user_id ? { ...u, terakhir_login: nowIso } : u);
  saveUserData(updatedUsers);

  const updatedCurrent = { ...found, terakhir_login: nowIso };
  saveCurrentUser(updatedCurrent);

  return { success: true, user: updatedCurrent, message: 'Login berhasil.' };
}


// --- MASTER BARANG ---
export function loadMasterBarangData(): MasterBarang[] {
  try {
    const saved = safeGetItem(KEY_MASTER_BARANG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load master barang data:', err);
  }
  saveMasterBarangData(INITIAL_MASTER_BARANG_DATA);
  return INITIAL_MASTER_BARANG_DATA;
}

export function saveMasterBarangData(data: MasterBarang[]): void {
  try {
    safeSetItem(KEY_MASTER_BARANG, data);
  } catch (err) {
    console.error('Failed to save master barang data:', err);
  }
}

// --- STOCK OPNAME SESSIONS ---
export function loadStockOpnameData(): StockOpnameSession[] {
  try {
    const saved = safeGetItem(KEY_STOCK_OPNAME);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load stock opname data:', err);
  }
  return [];
}

export function saveStockOpnameData(data: StockOpnameSession[]): void {
  try {
    safeSetItem(KEY_STOCK_OPNAME, data);
  } catch (err) {
    console.error('Failed to save stock opname data:', err);
  }
}

// --- PETANI ---
export function loadPetaniData(): Petani[] {
  try {
    const saved = safeGetItem(KEY_PETANI);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 34) return parsed;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length < 34) {
        const existingIds = new Set(parsed.map((p: Petani) => p.petani_id));
        const combined = [...parsed];
        for (const item of INITIAL_PETANI_DATA) {
          if (!existingIds.has(item.petani_id) && combined.length < 34) {
            combined.push(item);
            existingIds.add(item.petani_id);
          }
        }
        if (combined.length === 34) {
          savePetaniData(combined);
          return combined;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load petani data:', err);
  }
  savePetaniData(INITIAL_PETANI_DATA);
  return INITIAL_PETANI_DATA;
}

export function savePetaniData(data: Petani[]): void {
  try {
    safeSetItem(KEY_PETANI, data);
  } catch (err) {
    console.error('Failed to save petani data:', err);
  }
}

// IDs to be purged permanently per user request
const PURGED_TX_IDS = ['OJ/2026/VIII/0263', 'OJ/2026/VIII/0293'];
const PURGED_BAL_PREFIXES = ['A-250826-2630', 'A-250826-2930', 'A-250826-2931', 'A-250826-2932'];

const MASTER_WH_LOCATIONS = [
  'Gudang Utama Pamekasan',
];

// --- BARANG ---
export function loadBarangData(): Barang[] {
  try {
    const saved = safeGetItem(KEY_BARANG);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        let hasChanges = false;
        // Clean out items associated with deleted transactions and normalize locations
        const cleaned = parsed.map((b) => {
          if (!b) return null;
          if (b.transaksi_id && PURGED_TX_IDS.includes(b.transaksi_id)) {
            hasChanges = true;
            return null;
          }
          if (b.barang_id && PURGED_BAL_PREFIXES.some((p) => b.barang_id.includes(p))) {
            hasChanges = true;
            return null;
          }
          // SB and HF are bal codes, not price codes. Convert to Master Harga Beli code and keep bal code in no_bal
          if (b.kode_grade && (b.kode_grade.toUpperCase() === 'SB' || b.kode_grade.toUpperCase() === 'HF')) {
            const isSB = b.kode_grade.toUpperCase() === 'SB';
            const balPrefix = isSB ? 'SB' : 'HF';
            if (b.no_bal && !b.no_bal.toUpperCase().includes(balPrefix)) {
              b.no_bal = `${balPrefix}-${b.no_bal}`;
            }
            const price = b.harga_per_kg || (isSB ? 55000 : 45000);
            b.kode_grade = String(Math.round(price / 1000));
            hasChanges = true;
          }
          return b;
        }).filter(Boolean) as Barang[];
        
        if (hasChanges || cleaned.length !== parsed.length) {
          saveBarangData(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Failed to load barang data:', err);
  }
  saveBarangData(INITIAL_BARANG_DATA);
  return INITIAL_BARANG_DATA;
}

export function saveBarangData(data: Barang[]): void {
  try {
    safeSetItem(KEY_BARANG, data);
  } catch (err) {
    console.error('Failed to save barang data:', err);
  }
}

// --- TABEL HARGA ---
export function loadHargaData(): TabelHarga[] {
  try {
    const saved = safeGetItem(KEY_HARGA);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Clean up duplicate harga_id if any exists
        const seenIds = new Set<string>();
        const cleaned: TabelHarga[] = [];
        let hasDuplicate = false;

        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (!item || !item.harga_id) continue;
          if (seenIds.has(item.harga_id)) {
            hasDuplicate = true;
            if (item.status === 'nonaktif') {
              cleaned.push({
                ...item,
                harga_id: `${item.harga_id}-archived-${i}`,
              });
            } else {
              const existing = cleaned.find((c) => c.harga_id === item.harga_id);
              if (
                existing &&
                existing.harga_per_kg === item.harga_per_kg &&
                existing.kode_grade === item.kode_grade
              ) {
                // Exact duplicate copy: discard it
                continue;
              }
              cleaned.push({
                ...item,
                harga_id: `${item.harga_id}-dup-${i}`,
              });
            }
          } else {
            seenIds.add(item.harga_id);
            cleaned.push(item);
          }
        }

        if (hasDuplicate) {
          saveHargaData(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Failed to load harga data:', err);
  }
  saveHargaData(INITIAL_HARGA_DATA);
  return INITIAL_HARGA_DATA;
}

export function saveHargaData(data: TabelHarga[]): void {
  try {
    const seenIds = new Set<string>();
    const sanitized: TabelHarga[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item || !item.harga_id) continue;
      if (seenIds.has(item.harga_id)) {
        sanitized.push({
          ...item,
          harga_id: `${item.harga_id}-rev-${i}`,
        });
      } else {
        seenIds.add(item.harga_id);
        sanitized.push(item);
      }
    }
    safeSetItem(KEY_HARGA, sanitized);
  } catch (err) {
    console.error('Failed to save harga data:', err);
  }
}

// --- MASTER HARGA JUAL ---
export function loadHargaJualData(): MasterHargaJual[] {
  try {
    const saved = safeGetItem(KEY_HARGA_JUAL);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load harga jual data:', err);
  }
  saveHargaJualData(INITIAL_HARGA_JUAL_DATA);
  return INITIAL_HARGA_JUAL_DATA;
}

export function saveHargaJualData(data: MasterHargaJual[]): void {
  try {
    safeSetItem(KEY_HARGA_JUAL, data);
  } catch (err) {
    console.error('Failed to save harga jual data:', err);
  }
}

// --- TRANSAKSI PEMBELIAN ---
export function loadTransaksiData(): TransaksiPembelian[] {
  try {
    const saved = safeGetItem(KEY_TRANSAKSI);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        let hasChanges = false;
        const dateCounter: Record<string, number> = {};
        const idMap = new Map<string, string>();

        // Clean out transactions requested to be deleted, normalize IDs to TRX-DDMMYYYY-XXX, and remove no_bukti_kas
        const cleaned = parsed.map((t) => {
          if (!t) return null;
          if (t.transaksi_id && PURGED_TX_IDS.includes(t.transaksi_id)) {
            hasChanges = true;
            return null;
          }
          
          let clean = { ...t };

          // Remove redundant no_bukti_kas if present
          if ('no_bukti_kas' in clean) {
            delete (clean as Record<string, unknown>).no_bukti_kas;
            hasChanges = true;
          }

          const oldId = clean.transaksi_id || '';
          let newId = oldId;

          // Check if format is old TRX-YYYYMMDD-XXXX (e.g. TRX-20260908-8757)
          const ymdMatch = oldId.match(/^TRX-(\d{4})(\d{2})(\d{2})(-\d+)?$/);
          if (ymdMatch) {
            const [, y, m, d] = ymdMatch;
            const dateCode = `${d}${m}${y}`; // DDMMYYYY
            const count = (dateCounter[dateCode] || 0) + 1;
            dateCounter[dateCode] = count;
            newId = `TRX-${dateCode}-${String(count).padStart(3, '0')}`;
          } else {
            // Check if format is already TRX-DDMMYYYY-XXX
            const dmyMatch = oldId.match(/^TRX-(\d{2})(\d{2})(\d{4})-(\d+)$/);
            if (dmyMatch) {
              const [, d, m, y] = dmyMatch;
              const dateCode = `${d}${m}${y}`;
              const count = (dateCounter[dateCode] || 0) + 1;
              dateCounter[dateCode] = count;
              newId = `TRX-${dateCode}-${String(count).padStart(3, '0')}`;
            }
          }

          if (oldId && newId && oldId !== newId) {
            clean.transaksi_id = newId;
            idMap.set(oldId, newId);
            hasChanges = true;
          }

          // SB and HF are bal codes, not price codes. Ensure items have correct Master Harga Beli code and keep bal code in no_bal
          if (clean.items && Array.isArray(clean.items)) {
            clean.items = clean.items.map((it: TransaksiItemBal) => {
              if (it.kode_grade && (it.kode_grade.toUpperCase() === 'SB' || it.kode_grade.toUpperCase() === 'HF')) {
                const isSB = it.kode_grade.toUpperCase() === 'SB';
                const balPrefix = isSB ? 'SB' : 'HF';
                let noBal = it.no_bal || '';
                if (!noBal.toUpperCase().includes(balPrefix)) {
                  noBal = `${balPrefix}-${noBal}`;
                }
                const price = it.harga_per_kg || (isSB ? 55000 : 45000);
                const gradeCode = String(Math.round(price / 1000));
                hasChanges = true;
                return {
                  ...it,
                  no_bal: noBal,
                  kode_grade: gradeCode,
                };
              }
              return it;
            });
          }

          return clean;
        }).filter(Boolean) as TransaksiPembelian[];
        
        if (hasChanges || cleaned.length !== parsed.length) {
          saveTransaksiData(cleaned);

          // If transaction IDs were updated, sync any associated Barang records
          if (idMap.size > 0) {
            try {
              const savedBarang = safeGetItem(KEY_BARANG);
              if (savedBarang) {
                const parsedBarang = JSON.parse(savedBarang);
                if (Array.isArray(parsedBarang)) {
                  let barangChanged = false;
                  const updatedBarang = parsedBarang.map((b) => {
                    let bCopy = b;
                    if (b.transaksi_pembelian_id && idMap.has(b.transaksi_pembelian_id)) {
                      bCopy = { ...bCopy, transaksi_pembelian_id: idMap.get(b.transaksi_pembelian_id) };
                      barangChanged = true;
                    }
                    if (b.transaksi_id && idMap.has(b.transaksi_id)) {
                      bCopy = { ...bCopy, transaksi_id: idMap.get(b.transaksi_id) };
                      barangChanged = true;
                    }
                    return bCopy;
                  });
                  if (barangChanged) {
                    safeSetItem(KEY_BARANG, updatedBarang);
                  }
                }
              }
            } catch (err) {
              console.error('Failed to sync updated transaction IDs to barang:', err);
            }
          }
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Failed to load transaksi data:', err);
  }
  saveTransaksiData(INITIAL_TRANSAKSI_DATA);
  return INITIAL_TRANSAKSI_DATA;
}

export function saveTransaksiData(data: TransaksiPembelian[]): void {
  try {
    safeSetItem(KEY_TRANSAKSI, data);
  } catch (err) {
    console.error('Failed to save transaksi data:', err);
  }
}

// --- PENGIRIMAN SAMPLE ---
export function loadSampleData(): PengirimanSample[] {
  try {
    const saved = safeGetItem(KEY_SAMPLE);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load sample data:', err);
  }
  saveSampleData(INITIAL_SAMPLE_DATA);
  return INITIAL_SAMPLE_DATA;
}

export function saveSampleData(data: PengirimanSample[]): void {
  try {
    safeSetItem(KEY_SAMPLE, data);
  } catch (err) {
    console.error('Failed to save sample data:', err);
  }
}

// --- BATCH PENGIRIMAN SAMPLE ---
export function loadBatchSampleData(): BatchPengirimanSample[] {
  try {
    const saved = safeGetItem(KEY_BATCH_SAMPLE);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load batch sample data:', err);
  }
  saveBatchSampleData(INITIAL_BATCH_SAMPLE_DATA);
  return INITIAL_BATCH_SAMPLE_DATA;
}

export function saveBatchSampleData(data: BatchPengirimanSample[]): void {
  try {
    safeSetItem(KEY_BATCH_SAMPLE, data);
  } catch (err) {
    console.error('Failed to save batch sample data:', err);
  }
}

// --- PENGIRIMAN BARANG ---
export function loadPengirimanData(): PengirimanBarang[] {
  try {
    const saved = safeGetItem(KEY_PENGIRIMAN);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load pengiriman data:', err);
  }
  savePengirimanData(INITIAL_PENGIRIMAN_DATA);
  return INITIAL_PENGIRIMAN_DATA;
}

export function savePengirimanData(data: PengirimanBarang[]): void {
  try {
    safeSetItem(KEY_PENGIRIMAN, data);
  } catch (err) {
    console.error('Failed to save pengiriman data:', err);
  }
}

// --- LOG AKTIVITAS & AUDIT TRAIL (SUPER ADMIN EXCLUSIVE) ---
export function loadAuditLogData(): AuditLogEntry[] {
  try {
    const saved = safeGetItem(KEY_AUDIT_LOG);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load audit log data:', err);
  }
  return [];
}

export function saveAuditLogData(data: AuditLogEntry[]): void {
  try {
    safeSetItem(KEY_AUDIT_LOG, data);
  } catch (err) {
    console.error('Failed to save audit log data:', err);
  }
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'log_id' | 'timestamp'>): void {
  try {
    const logs = loadAuditLogData();
    const newEntry: AuditLogEntry = {
      ...entry,
      log_id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    // Keep last 500 audit logs to preserve storage
    const updated = [newEntry, ...logs].slice(0, 500);
    saveAuditLogData(updated);
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}




// --- RESET ALL DATA (DEMO DATASET) ---
export function resetToDemoData(): Petani[] {
  resetAllERPData();
  return INITIAL_PETANI_DATA;
}

export function resetAllERPData() {
  savePetaniData(INITIAL_PETANI_DATA);
  saveBarangData(INITIAL_BARANG_DATA);
  saveMasterBarangData(INITIAL_MASTER_BARANG_DATA);
  saveStockOpnameData([]);
  saveHargaData(INITIAL_HARGA_DATA);
  saveHargaJualData(INITIAL_HARGA_JUAL_DATA);
  saveTransaksiData(INITIAL_TRANSAKSI_DATA);
  saveSampleData(INITIAL_SAMPLE_DATA);
  saveBatchSampleData(INITIAL_BATCH_SAMPLE_DATA);
  savePengirimanData(INITIAL_PENGIRIMAN_DATA);
  saveUserData(INITIAL_USER_DATA);
  return {
    petani: INITIAL_PETANI_DATA,
    barang: INITIAL_BARANG_DATA,
    master_barang: INITIAL_MASTER_BARANG_DATA,
    stock_opname: [],
    harga: INITIAL_HARGA_DATA,
    harga_jual: INITIAL_HARGA_JUAL_DATA,
    transaksi: INITIAL_TRANSAKSI_DATA,
    sample: INITIAL_SAMPLE_DATA,
    batch_sample: INITIAL_BATCH_SAMPLE_DATA,
    pengiriman: INITIAL_PENGIRIMAN_DATA,
    users: INITIAL_USER_DATA,
  };
}
