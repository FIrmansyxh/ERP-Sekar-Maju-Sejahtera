import { 
  Petani, 
  Barang, 
  MasterBarang,
  StockOpnameSession,
  TabelHarga, 
  MasterHargaJual,
  TransaksiPembelian, 
  PengirimanSample, 
  BatchPengirimanSample,
  PengirimanBarang,
  Gudang,
  User 
} from '../types';
import LZString from 'lz-string';

const memoryStore = new Map<string, string>();

const safeSetItem = (key: string, data: any) => {
  try {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(jsonStr);
    
    // Only persist User and Auth data to local storage to avoid forced logout on refresh
    if (key.includes('users') || key.includes('current_user') || key.includes('auth')) {
      localStorage.setItem(key, compressed);
    } else {
      memoryStore.set(key, compressed);
    }
  } catch (err) {
    console.error(`Failed to save data for ${key}:`, err);
  }
};

const safeGetItem = (key: string) => {
  try {
    let compressed = null;
    if (key.includes('users') || key.includes('current_user') || key.includes('auth')) {
      compressed = localStorage.getItem(key);
    } else {
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
import { INITIAL_GUDANG_DATA } from '../data/initialGudangData';
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
const KEY_GUDANG = 'erp_tembakau_gudang_v31';
const KEY_USERS = 'erp_tembakau_users_v31';
const KEY_CURRENT_USER = 'erp_tembakau_current_user_v31';

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

    // Default to the primary active superadmin user to prevent session drop on page reload
    const allUsers = loadUserData();
    const activeAdmin = allUsers.find((u) => u.role === 'superadmin' && u.status_aktif) || allUsers.find((u) => u.status_aktif);
    if (activeAdmin) {
      // Auto-heal session
      saveCurrentUser(activeAdmin);
      return activeAdmin;
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

export function authenticateUser(usernameInput: string, passwordInput: string): { success: boolean; user?: User; message: string } {
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
  if (found.password && found.password !== passwordInput) {
    return { success: false, message: 'Kata sandi (password) yang Anda masukkan salah.' };
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
  'Gudang Produksi Rokok',
  'Gudang Sumenep',
];

// --- BARANG ---
export function loadBarangData(): Barang[] {
  try {
    const saved = safeGetItem(KEY_BARANG);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Clean out items associated with deleted transactions and normalize locations
        const cleaned = parsed.map((b, idx) => {
          if (!b) return null;
          if (b.transaksi_id && PURGED_TX_IDS.includes(b.transaksi_id)) return null;
          if (b.barang_id && PURGED_BAL_PREFIXES.some((p) => b.barang_id.includes(p))) return null;
          
          let loc = b.lokasi_gudang || '';
          if (!loc || loc.includes('Gudang Utama') || loc === 'Gudang Pusat') {
            loc = MASTER_WH_LOCATIONS[idx % MASTER_WH_LOCATIONS.length];
          }
          return { ...b, lokasi_gudang: loc };
        }).filter(Boolean) as Barang[];
        
        if (cleaned.length !== parsed.length) {
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load harga data:', err);
  }
  saveHargaData(INITIAL_HARGA_DATA);
  return INITIAL_HARGA_DATA;
}

export function saveHargaData(data: TabelHarga[]): void {
  try {
    safeSetItem(KEY_HARGA, data);
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
        const cleaned = parsed.map((t, idx) => {
          if (!t) return null;
          if (t.transaksi_id && PURGED_TX_IDS.includes(t.transaksi_id)) {
            hasChanges = true;
            return null;
          }
          
          let loc = t.lokasi_gudang || '';
          if (!loc || loc.includes('Gudang Utama') || loc === 'Gudang Pusat') {
            loc = MASTER_WH_LOCATIONS[idx % MASTER_WH_LOCATIONS.length];
            hasChanges = true;
          }

          const clean = { ...t, lokasi_gudang: loc };

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

// --- MASTER GUDANG ---
export function loadGudangData(): Gudang[] {
  try {
    const saved = safeGetItem(KEY_GUDANG);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load gudang data:', err);
  }
  saveGudangData(INITIAL_GUDANG_DATA);
  return INITIAL_GUDANG_DATA;
}

export function saveGudangData(data: Gudang[]): void {
  try {
    safeSetItem(KEY_GUDANG, data);
  } catch (err) {
    console.error('Failed to save gudang data:', err);
  }
}

// --- LOG AKTIVITAS & AUDIT TRAIL (SUPER ADMIN EXCLUSIVE) ---




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
  saveGudangData(INITIAL_GUDANG_DATA);
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
    gudang: INITIAL_GUDANG_DATA,
    users: INITIAL_USER_DATA,
  };
}
