/**
 * Service sinkronisasi data ERP Sekar Maju Sejahtera.
 * Mengimplementasikan pola "API-First with Offline LocalStorage Fallback".
 */

import { api, checkBackendHealth, setAuthToken } from './apiClient';
import { 
  Petani, 
  Barang, 
  TransaksiPembelian, 
  TabelHarga, 
  MasterHargaJual,
  User 
} from '../types';
import { 
  loadPetaniData, 
  savePetaniData,
  loadBarangData,
  saveBarangData,
  loadTransaksiData,
  saveTransaksiData,
  loadHargaData,
  saveHargaData,
  loadHargaJualData,
  saveHargaJualData,
  loadUserData,
  saveUserData,
  saveCurrentUser,
  authenticateUser as authenticateLocalUser
} from '../utils/storage';

export class ErpApiService {
  private static isOnlineState: boolean | null = null;

  /**
   * Cek status konektivitas server backend Laravel
   */
  public static async isBackendOnline(): Promise<boolean> {
    const online = await checkBackendHealth();
    this.isOnlineState = online;
    return online;
  }

  public static getCachedOnlineStatus(): boolean {
    return this.isOnlineState ?? false;
  }

  // --- AUTENTIKASI ---
  public static async login(username: string, password: string): Promise<{ success: boolean; user?: User; message: string; mode: 'api' | 'local' }> {
    // 1. Coba login ke API backend
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.post('/auth/login', { username, password });
        if (res.status === 'success' && res.data) {
          const { token, user } = res.data;
          setAuthToken(token);
          
          const localFormattedUser: User = {
            user_id: user.user_id,
            username: user.username,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            email: user.email,
            no_hp: user.no_hp,
            unit_penugasan: user.unit_penugasan,
            status_aktif: user.status_aktif,
            terakhir_login: user.terakhir_login,
            dibuat_pada: user.dibuat_pada,
          };
          saveCurrentUser(localFormattedUser);

          return { success: true, user: localFormattedUser, message: res.message || 'Login berhasil via Backend API', mode: 'api' };
        }
      }
    } catch (err: any) {
      console.warn('Gagal login via API backend, mencoba fallback lokal:', err?.message || err);
    }

    // 2. Fallback autentikasi lokal
    const localRes = await authenticateLocalUser(username, password);
    return { ...localRes, mode: 'local' };
  }

  // --- PETANI ---
  public static async getPetaniList(): Promise<{ data: Petani[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<Petani[]>('/petani');
        if (res.status === 'success' && Array.isArray(res.data)) {
          // Sync ke localStorage sebagai cache offline
          savePetaniData(res.data);
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil data petani dari backend API, menggunakan cache lokal:', err);
    }

    return { data: loadPetaniData(), fromBackend: false };
  }

  public static async savePetani(petani: Partial<Petani>, isEdit: boolean = false): Promise<Petani> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        if (isEdit && petani.petani_id) {
          // Update data yang sudah ada
          const res = await api.put<Petani>(`/petani/${petani.petani_id}`, petani);
          if (res.data) {
            const list = loadPetaniData().map(p => p.petani_id === res.data!.petani_id ? res.data! : p);
            savePetaniData(list);
            return res.data;
          }
        } else {
          // Create data baru ke PostgreSQL
          const res = await api.post<Petani>('/petani', {
            nama_petani: petani.nama_petani,
            alamat: petani.alamat,
            no_hp: petani.no_hp,
            desa_kecamatan: petani.desa_kecamatan || '',
            catatan: petani.catatan || '',
            tanggal_daftar: petani.tanggal_daftar || new Date().toISOString().split('T')[0],
          });
          if (res.data) {
            const list = [res.data, ...loadPetaniData().filter(p => p.petani_id !== res.data!.petani_id)];
            savePetaniData(list);
            return res.data;
          }
        }
      }
    } catch (err) {
      console.warn('Gagal simpan petani ke backend API:', err);
      throw err;
    }

    // Fallback simpan lokal jika backend offline
    const currentList = loadPetaniData();
    let resultPetani: Petani;
    if (isEdit && petani.petani_id) {
      resultPetani = { ...currentList.find(p => p.petani_id === petani.petani_id)!, ...petani } as Petani;
      savePetaniData(currentList.map(p => p.petani_id === resultPetani.petani_id ? resultPetani : p));
    } else {
      const year = new Date().getFullYear();
      const count = currentList.length + 1;
      const newId = `PTN-${year}-${String(count).padStart(3, '0')}`;
      resultPetani = {
        petani_id: newId,
        nama_petani: petani.nama_petani || '',
        no_hp: petani.no_hp || '',
        alamat: petani.alamat || '',
        status_aktif: true,
        tanggal_daftar: new Date().toISOString().split('T')[0],
        ...petani
      };
      savePetaniData([resultPetani, ...currentList]);
    }
    return resultPetani;
  }

  public static async deletePetani(petaniId: string, alasan?: string): Promise<boolean> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        await api.delete(`/petani/${petaniId}`);
        return true;
      }
    } catch (err) {
      console.warn('Gagal menonaktifkan petani di backend API:', err);
      throw err;
    }
    return false;
  }

  // --- TRANSAKSI ---
  public static async getTransaksiList(): Promise<{ data: TransaksiPembelian[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<TransaksiPembelian[]>('/transaksi');
        if (res.status === 'success' && Array.isArray(res.data)) {
          saveTransaksiData(res.data);
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil transaksi dari API, memakai fallback lokal:', err);
    }
    return { data: loadTransaksiData(), fromBackend: false };
  }

  // --- INVENTARIS BARANG / BAL ---
  public static async getBarangList(): Promise<{ data: Barang[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<Barang[]>('/barang');
        if (res.status === 'success' && Array.isArray(res.data)) {
          saveBarangData(res.data);
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil inventaris barang dari API, memakai fallback lokal:', err);
    }
    return { data: loadBarangData(), fromBackend: false };
  }

  // --- HARGA BELI & JUAL ---
  public static async getHargaList(): Promise<{ data: TabelHarga[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<TabelHarga[]>('/master/harga-beli');
        if (res.status === 'success' && Array.isArray(res.data)) {
          saveHargaData(res.data);
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil harga beli dari API:', err);
    }
    return { data: loadHargaData(), fromBackend: false };
  }

  // --- USERS MANAGEMENT ---
  public static async getUserList(): Promise<{ data: User[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<User[]>('/users');
        if (res.status === 'success' && Array.isArray(res.data)) {
          saveUserData(res.data);
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil daftar users dari API, memakai fallback lokal:', err);
    }
    return { data: loadUserData(), fromBackend: false };
  }

  public static async saveUser(user: Partial<User>, isEdit: boolean = false): Promise<User> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        if (isEdit && user.user_id) {
          const res = await api.put<User>(`/users/${user.user_id}`, {
            username: user.username,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            email: user.email || '',
            no_hp: user.no_hp || '',
            unit_penugasan: user.unit_penugasan || '',
            status_aktif: user.status_aktif,
            password: user.password || undefined,
          });
          if (res.data) {
            const list = loadUserData().map(u => u.user_id === res.data!.user_id ? res.data! : u);
            saveUserData(list);
            return res.data;
          }
        } else {
          const res = await api.post<User>('/users', {
            user_id: user.user_id,
            username: user.username,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            password: user.password,
            email: user.email || '',
            no_hp: user.no_hp || '',
            unit_penugasan: user.unit_penugasan || '',
          });
          if (res.data) {
            const list = [res.data, ...loadUserData().filter(u => u.user_id !== res.data!.user_id)];
            saveUserData(list);
            return res.data;
          }
        }
      }
    } catch (err) {
      console.warn('Gagal menyimpan user ke backend API:', err);
      throw err;
    }

    // Fallback simpan lokal jika offline
    const currentList = loadUserData();
    let resultUser: User;
    if (isEdit && user.user_id) {
      resultUser = { ...currentList.find(u => u.user_id === user.user_id)!, ...user } as User;
      saveUserData(currentList.map(u => u.user_id === resultUser.user_id ? resultUser : u));
    } else {
      const count = currentList.length + 1;
      const newId = user.user_id || `USR-${String(count).padStart(3, '0')}`;
      resultUser = {
        user_id: newId,
        username: user.username || '',
        nama_lengkap: user.nama_lengkap || '',
        role: user.role || 'superadmin',
        unit_penugasan: user.unit_penugasan || '',
        status_aktif: true,
        dibuat_pada: new Date().toISOString(),
        ...user,
      } as User;
      saveUserData([resultUser, ...currentList]);
    }
    return resultUser;
  }

  public static async toggleUserStatus(userId: string, nextStatus?: boolean): Promise<boolean> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        await api.put(`/users/${userId}/status`, { status_aktif: nextStatus });
        return true;
      }
    } catch (err) {
      console.warn('Gagal toggle status user di backend API:', err);
      throw err;
    }
    return false;
  }

  public static async resetUserPassword(userId: string, newPass: string): Promise<boolean> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        await api.put(`/users/${userId}/reset-password`, { password: newPass });
        return true;
      }
    } catch (err) {
      console.warn('Gagal reset password user di backend API:', err);
      throw err;
    }
    return false;
  }

  // --- HARGA JUAL ---
  public static async getHargaJualList(): Promise<{ data: MasterHargaJual[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<MasterHargaJual[]>('/master/harga-jual');
        if (res.status === 'success' && Array.isArray(res.data)) {
          saveHargaJualData(res.data);
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil harga jual dari API:', err);
    }
    return { data: loadHargaJualData(), fromBackend: false };
  }

  public static async saveHargaJual(item: Partial<MasterHargaJual>): Promise<MasterHargaJual> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.post<MasterHargaJual>('/master/harga-jual', {
          harga_jual_id: item.harga_jual_id,
          kode: item.kode,
          harga_jual: item.harga_jual,
          tanggal_berlaku: item.tanggal_berlaku,
          status_aktif: item.status_aktif,
        });
        if (res.data) {
          const list = loadHargaJualData();
          const exists = list.some(h => h.harga_jual_id === res.data!.harga_jual_id);
          const updated = exists
            ? list.map(h => h.harga_jual_id === res.data!.harga_jual_id ? res.data! : h)
            : [res.data, ...list];
          saveHargaJualData(updated);
          return res.data;
        }
      }
    } catch (err) {
      console.warn('Gagal simpan harga jual ke backend API:', err);
      throw err;
    }

    const currentList = loadHargaJualData();
    const exists = currentList.some(h => h.harga_jual_id === item.harga_jual_id);
    const resultItem = {
      harga_jual_id: item.harga_jual_id || `HJ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      kode: item.kode || '',
      harga_jual: item.harga_jual || 0,
      tanggal_berlaku: item.tanggal_berlaku || new Date().toISOString().split('T')[0],
      status_aktif: item.status_aktif ?? true,
    } as MasterHargaJual;
    const updated = exists
      ? currentList.map(h => h.harga_jual_id === resultItem.harga_jual_id ? resultItem : h)
      : [resultItem, ...currentList];
    saveHargaJualData(updated);
    return resultItem;
  }
}
