/**
 * Service sinkronisasi data ERP Sekar Maju Sejahtera.
 * Mengimplementasikan pola "API-First with Offline LocalStorage Fallback".
 */

import { api, checkBackendHealth, setAuthToken, getTerakhirGagalJaringan } from './apiClient';
import { hashPassword } from '../utils/crypto';
import { beratBrutoItemSample } from '../utils/beratKirim';
import { 
  Petani, 
  Barang, 
  TransaksiPembelian, 
  TransaksiItemBal,
  TabelHarga, 
  MasterHargaJual,
  User,
  BatchPengirimanSample,
  PengirimanBarang
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
  loadBatchSampleData,
  saveBatchSampleData,
  loadPengirimanData,
  savePengirimanData,
  saveCurrentUser,
  authenticateUser as authenticateLocalUser
} from '../utils/storage';
import { sortTransaksiItemsByInputOrder } from '../utils/kuponSortir';
import { generatePetaniId } from '../utils/formatters';

export class ErpApiService {
  private static isOnlineState: boolean | null = null;
  private static cekServerTerakhir: { online: boolean; pada: number } | null = null;
  private static cekServerBerjalan: Promise<boolean> | null = null;
  /** Status server disimpan sebentar agar setiap klik tidak menunggu cek server (maks. 3 detik) lagi */
  private static readonly MASA_BERLAKU_ONLINE_MS = 60000;
  private static readonly MASA_BERLAKU_OFFLINE_MS = 10000;

  /**
   * Cek status konektivitas server backend Laravel.
   * Hasil disimpan sementara dan pengecekan yang berjalan bersamaan digabung menjadi satu.
   */
  public static async isBackendOnline(): Promise<boolean> {
    const cache = this.cekServerTerakhir;
    if (
      cache &&
      Date.now() - cache.pada < (cache.online ? this.MASA_BERLAKU_ONLINE_MS : this.MASA_BERLAKU_OFFLINE_MS) &&
      getTerakhirGagalJaringan() <= cache.pada
    ) {
      return cache.online;
    }
    if (!this.cekServerBerjalan) {
      this.cekServerBerjalan = checkBackendHealth()
        .then((online) => {
          this.cekServerTerakhir = { online, pada: Date.now() };
          this.isOnlineState = online;
          return online;
        })
        .finally(() => {
          this.cekServerBerjalan = null;
        });
    }
    return this.cekServerBerjalan;
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
      console.warn('Gagal simpan petani ke backend API, beralih ke penyimpanan lokal:', err);
    }

    // Fallback simpan lokal jika backend offline
    const currentList = loadPetaniData();
    let resultPetani: Petani;
    if (isEdit && petani.petani_id) {
      const existing = currentList.find(p => p.petani_id === petani.petani_id);
      resultPetani = {
        petani_id: petani.petani_id,
        nama_petani: petani.nama_petani || existing?.nama_petani || '',
        no_hp: petani.no_hp ?? existing?.no_hp ?? '',
        alamat: petani.alamat ?? existing?.alamat ?? '',
        desa_kecamatan: petani.desa_kecamatan ?? existing?.desa_kecamatan ?? '',
        status_aktif: petani.status_aktif !== undefined ? petani.status_aktif : (existing?.status_aktif ?? true),
        tanggal_daftar: petani.tanggal_daftar || existing?.tanggal_daftar || new Date().toISOString().split('T')[0],
        catatan: petani.catatan ?? existing?.catatan ?? '',
        statistik: existing?.statistik || {
          total_setoran_bal: 0,
          total_berat_kg: 0,
          kunjungan_terakhir: 'Belum Ada',
          grade_dominan: '-',
        },
        ...petani,
      };
      const updatedList = currentList.map(p => p.petani_id === resultPetani.petani_id ? resultPetani : p);
      savePetaniData(updatedList);
    } else {
      const newId = petani.petani_id || generatePetaniId(currentList);
      resultPetani = {
        petani_id: newId,
        nama_petani: petani.nama_petani || '',
        no_hp: petani.no_hp || '',
        alamat: petani.alamat || '',
        desa_kecamatan: petani.desa_kecamatan || petani.alamat || '',
        status_aktif: petani.status_aktif ?? true,
        tanggal_daftar: petani.tanggal_daftar || new Date().toISOString().split('T')[0],
        catatan: petani.catatan || '',
        statistik: {
          total_setoran_bal: 0,
          total_berat_kg: 0,
          kunjungan_terakhir: 'Belum Ada',
          grade_dominan: '-',
        },
        ...petani,
      };
      // Simpan di posisi paling atas (data baru di awal list)
      const filtered = currentList.filter(p => p.petani_id !== resultPetani.petani_id);
      savePetaniData([resultPetani, ...filtered]);
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
  public static mapBackendTransaksi(t: any): TransaksiPembelian {
    const items: TransaksiItemBal[] = Array.isArray(t.items)
      ? sortTransaksiItemsByInputOrder<TransaksiItemBal>(
          t.items.map((it: any): TransaksiItemBal => ({
      item_id: it.item_id,
      no_bal: String(it.no_bal || ''),
      kode_bal_pembeli: it.kode_bal_pembeli || undefined,
      barcode: it.barcode || undefined,
      kode_grade: it.kode_grade || it.grade?.kode_grade || '',
      harga_per_kg: Number(it.harga_per_kg) || 0,
      ganti_tikar: Boolean(it.ganti_tikar) || Number(it.potongan_tikar) > 0,
      berat_bruto_kg: it.berat_bruto_kg !== null && it.berat_bruto_kg !== undefined ? Number(it.berat_bruto_kg) : undefined,
      potongan_tara_kg: Number(it.potongan_tara_kg) || 0,
      is_netto_manual: Boolean(it.is_netto_manual),
      berat_kg: Number(it.berat_kg) || 0,
      potongan_kuli: Number(it.potongan_kuli) || 7000,
      potongan_tali: Number(it.potongan_tali) || 3000,
      potongan_tikar: Number(it.potongan_tikar) || (Boolean(it.ganti_tikar) ? 75000 : 0),
      potongan: Number(it.potongan) || ((Number(it.potongan_kuli) || 7000) + (Number(it.potongan_tali) || 3000) + (Number(it.potongan_tikar) || 0)),
      total_kotor: Number(it.total_kotor) || ((Number(it.berat_kg) || 0) * (Number(it.harga_per_kg) || 0)),
      subtotal_bersih: Number(it.subtotal_bersih) || (((Number(it.berat_kg) || 0) * (Number(it.harga_per_kg) || 0)) - (Number(it.potongan) || 10000)),
      status_timbang: it.status_timbang || (Number(it.berat_kg) > 0 ? 'selesai_timbang' : 'menunggu_timbang'),
      lokasi_simpan: it.lokasi_simpan || 'Blok A',
      sample_label_code: it.sample_label_code || undefined,
      sample_label_printed: Boolean(it.sample_label_printed),
      catatan: it.catatan || undefined,
    }))
        )
      : [];

    const totalBal = items.length > 0 ? items.length : (Number(t.total_bal) || 1);
    const balSelesai = items.filter((i: any) => i.status_timbang === 'selesai_timbang').length;
    const totalBerat = items.reduce((sum: number, i: any) => sum + (Number(i.berat_kg) || 0), 0) || Number(t.berat_kg) || 0;
    const totalKotor = items.reduce((sum: number, i: any) => sum + (Number(i.total_kotor) || 0), 0) || Number(t.total_harga_beli) || 0;
    const totalPotongan = items.reduce((sum: number, i: any) => sum + (Number(i.potongan) || 0), 0) || Number(t.total_potongan) || 0;
    const totalBersih = items.reduce((sum: number, i: any) => sum + (Number(i.subtotal_bersih) || 0), 0) || Number(t.harga_final) || (totalKotor - totalPotongan);

    const totalTara = items.reduce((sum: number, i: any) => sum + (Number(i.potongan_tara_kg) || 0), 0);
    const avgHarga = totalBerat > 0 ? Math.round(totalKotor / totalBerat) : (items[0]?.harga_per_kg || 0);
    const totalKuli = items.reduce((sum: number, i: any) => sum + (Number(i.potongan_kuli) || 7000), 0);
    const totalTikar = items.reduce((sum: number, i: any) => sum + (Number(i.potongan_tikar) || 0), 0);
    const totalTali = items.reduce((sum: number, i: any) => sum + (Number(i.potongan_tali) || 3000), 0);

    const firstGrade = items[0]?.kode_grade || t.kode_grade || 'A';
    const noBalSummary = items.map((i: any) => i.no_bal).filter(Boolean).join(', ') || t.no_bal || '1';

    return {
      transaksi_id: t.transaksi_id,
      no_kupon: t.no_kupon || '',
      petani_id: t.petani_id || t.petani?.petani_id || '',
      nama_petani: t.petani?.nama_petani || t.nama_petani || 'Petani',
      no_hp: t.petani?.no_hp || t.no_hp || '',
      desa_kecamatan: t.petani?.desa_kecamatan || t.desa_kecamatan || '',
      no_bal: noBalSummary,
      kode_bal_pembeli: t.kode_bal_pembeli || undefined,
      kode_grade: firstGrade,
      total_bal: totalBal,
      bal_selesai_timbang: balSelesai,
      items: items,
      barang_ids: t.barang_ids || undefined,
      jenis_timbang: t.jenis_timbang || 'netto',
      berat_terukur_kg: totalBerat,
      potongan_tara_kg: totalTara,
      berat_kg: totalBerat,
      harga_per_kg: avgHarga,
      total_kotor: totalKotor,
      potongan_kuli: totalKuli,
      potongan_tali: totalTali,
      potongan_tikar: totalTikar,
      total_potongan: totalPotongan,
      total_harga_beli: totalKotor,
      harga_final: totalBersih,
      status_transaksi: t.status_transaksi || 'menunggu',
      status_tahap: t.status_tahap || 'proses_sortir',
      status_pembayaran: t.status_pembayaran || 'belum_lunas',
      metode_pembayaran: t.metode_pembayaran || undefined,
      status_nota: t.status_nota || 'belum_cetak',
      tanggal_transaksi: t.tanggal_transaksi ? String(t.tanggal_transaksi).split('T')[0] : new Date().toISOString().split('T')[0],
      operator_nama: t.operator_nama || t.operator?.nama_lengkap || 'Staff Gudang',
      catatan: t.catatan || undefined,
      catatan_kasir: t.catatan_kasir || undefined,
      catatan_qc: t.catatan_qc || undefined,
      terakhir_diubah_pada: t.terakhir_diubah_pada || undefined,
    };
  }

  public static async getTransaksiList(): Promise<{ data: TransaksiPembelian[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any[]>('/transaksi');
        if (res.status === 'success' && Array.isArray(res.data)) {
          const mapped = res.data.map(t => this.mapBackendTransaksi(t));
          saveTransaksiData(mapped);
          return { data: mapped, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil transaksi dari API, memakai fallback lokal:', err);
    }
    return { data: loadTransaksiData(), fromBackend: false };
  }

  public static async storeSortirTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian | null> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const payload = {
          transaksi_id: tx.transaksi_id,
          no_kupon: tx.no_kupon,
          petani_id: tx.petani_id,
          tanggal_transaksi: tx.tanggal_transaksi || new Date().toISOString().split('T')[0],
          catatan: tx.catatan || '',
          items: (tx.items && tx.items.length > 0 ? tx.items : [{
            no_bal: tx.no_bal || '1',
            kode_grade: tx.kode_grade || 'A',
            harga_per_kg: (tx.total_harga_beli && tx.berat_kg) ? Math.round(tx.total_harga_beli / tx.berat_kg) : 100000,
            ganti_tikar: false,
            berat_bruto_kg: tx.berat_kg || 0,
            potongan_tara_kg: 0,
            berat_kg: tx.berat_kg || 0,
            lokasi_simpan: 'Blok A',
          }]).map(it => ({
            no_bal: it.no_bal,
            kode_bal_pembeli: it.kode_bal_pembeli || null,
            barcode: it.barcode || null,
            kode_grade: it.kode_grade,
            harga_per_kg: it.harga_per_kg,
            ganti_tikar: Boolean(it.ganti_tikar),
            berat_bruto_kg: it.berat_bruto_kg || 0,
            potongan_tara_kg: it.potongan_tara_kg || 0,
            berat_kg: it.berat_kg || 0,
            lokasi_simpan: it.lokasi_simpan || 'Blok A',
            sample_label_code: it.sample_label_code || null,
          })),
        };

        const res = await api.post<any>('/transaksi/sortir', payload);
        if (res.status === 'success' && res.data) {
          return this.mapBackendTransaksi(res.data);
        }
      }
    } catch (err) {
      console.warn('Gagal simpan transaksi sortir ke backend API:', err);
    }
    return null;
  }

  public static async updateTimbangTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian | null> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline && tx.transaksi_id) {
        const payload = {
          status_tahap: tx.status_tahap,
          items: (tx.items || []).map(it => ({
            item_id: it.item_id,
            no_bal: it.no_bal,
            berat_bruto_kg: it.berat_bruto_kg || it.berat_kg || 0,
            potongan_tara_kg: it.potongan_tara_kg || 0,
            berat_kg: it.berat_kg || 0,
            is_netto_manual: Boolean(it.is_netto_manual),
            lokasi_simpan: (it as any).lokasi_simpan || 'Blok A',
            ganti_tikar: Boolean(it.ganti_tikar),
            potongan_tikar: it.ganti_tikar ? (Number(it.potongan_tikar) || 75000) : 0,
            potongan_kuli: it.potongan_kuli,
            potongan_tali: it.potongan_tali,
          })),
        };

        const res = await api.put<any>(`/transaksi/${tx.transaksi_id}/timbang`, payload);
        if (res.status === 'success' && res.data) {
          return this.mapBackendTransaksi(res.data);
        }
      }
    } catch (err) {
      console.warn('Gagal update timbangan transaksi ke backend API:', err);
    }
    return null;
  }

  public static async updateSortirItemsTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian | null> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline && tx.transaksi_id) {
        const payload = {
          catatan: tx.catatan || '',
          status_tahap: tx.status_tahap,
          items: (tx.items && tx.items.length > 0 ? tx.items : [{
            no_bal: tx.no_bal || '1',
            kode_grade: tx.kode_grade || 'A',
            harga_per_kg: (tx.total_harga_beli && tx.berat_kg) ? Math.round(tx.total_harga_beli / tx.berat_kg) : 100000,
            ganti_tikar: false,
          }]).map(it => ({
            item_id: it.item_id || null,
            no_bal: it.no_bal,
            kode_bal_pembeli: it.kode_bal_pembeli || null,
            barcode: it.barcode || null,
            kode_grade: it.kode_grade,
            harga_per_kg: it.harga_per_kg,
            ganti_tikar: Boolean(it.ganti_tikar),
            potongan_tikar: it.ganti_tikar ? (Number(it.potongan_tikar) || 75000) : 0,
            berat_bruto_kg: it.berat_bruto_kg || 0,
            potongan_tara_kg: it.potongan_tara_kg || 0,
            berat_kg: it.berat_kg || 0,
            lokasi_simpan: it.lokasi_simpan || 'Blok A',
            sample_label_code: it.sample_label_code || null,
            potongan_kuli: it.potongan_kuli,
            potongan_tali: it.potongan_tali,
          })),
        };

        const res = await api.put<any>(`/transaksi/${tx.transaksi_id}/sortir-items`, payload);
        if (res.status === 'success' && res.data) {
          return this.mapBackendTransaksi(res.data);
        }
      }
    } catch (err) {
      console.warn('Gagal sync item sortir ke backend API:', err);
    }
    return null;
  }

  public static async bayarTransaksi(
    txId: string, 
    metode: 'cash' | 'kredit' = 'cash', 
    gudangId: string = 'PMK-01', 
    catatanKasir?: string
  ): Promise<TransaksiPembelian | null> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline && txId) {
        const payload = {
          metode_pembayaran: metode,
          gudang_id: gudangId,
          catatan_kasir: catatanKasir || null,
        };

        const res = await api.put<any>(`/transaksi/${txId}/bayar`, payload);
        if (res.status === 'success' && res.data) {
          return this.mapBackendTransaksi(res.data);
        }
      }
    } catch (err) {
      console.warn('Gagal pelunasan kasir ke backend API:', err);
    }
    return null;
  }

  public static async koreksiTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian | null> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline && tx.transaksi_id) {
        const payload = {
          petani_id: tx.petani_id,
          tanggal_transaksi: (tx.tanggal_transaksi || '').split(' ')[0],
          status_pembayaran: tx.status_pembayaran === 'lunas' ? 'lunas' : 'belum_lunas',
          metode_pembayaran: tx.metode_pembayaran === 'cash' || tx.metode_pembayaran === 'kredit'
            ? tx.metode_pembayaran
            : (tx.status_pembayaran === 'lunas' ? 'cash' : null),
          catatan: tx.catatan || '',
          catatan_kasir: tx.catatan_kasir || '',
          alasan_perubahan: tx.alasan_perubahan_terakhir || 'Koreksi transaksi kasir',
          terakhir_diubah_oleh: tx.terakhir_diubah_oleh || null,
          items: (tx.items || []).map((it) => ({
            no_bal: it.no_bal,
            kode_grade: it.kode_grade,
            harga_per_kg: it.harga_per_kg,
            berat_bruto_kg: it.berat_bruto_kg || it.berat_kg || 0,
            potongan_tara_kg: it.potongan_tara_kg || 0,
            berat_kg: it.berat_kg || 0,
            potongan_kuli: it.potongan_kuli,
            potongan_tali: it.potongan_tali,
            potongan_tikar: it.potongan_tikar,
            barcode: it.barcode || it.no_bal,
            catatan: it.catatan || null,
            lokasi_simpan: it.lokasi_simpan || 'Blok A',
          })),
        };
        const res = await api.put<any>(`/transaksi/${tx.transaksi_id}/koreksi`, payload);
        if (res.status === 'success' && res.data) {
          return this.mapBackendTransaksi(res.data);
        }
      }
    } catch (err) {
      console.warn('Gagal koreksi transaksi ke backend API:', err);
      throw err;
    }
    return null;
  }

  public static async syncTransaksi(
    newTx: TransaksiPembelian, 
    oldTx?: TransaksiPembelian,
    options?: { koreksi?: boolean }
  ): Promise<{ syncedTx: TransaksiPembelian; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        // Koreksi kasir (petani / tanggal / status / bal) — endpoint khusus
        if (options?.koreksi && oldTx) {
          const corrected = await this.koreksiTransaksi(newTx);
          if (corrected) return { syncedTx: corrected, fromBackend: true };
          throw new Error('Koreksi transaksi gagal disimpan ke server');
        }

        // Kasus 1: Pelunasan Kasir
        if (newTx.status_pembayaran === 'lunas' && (!oldTx || oldTx.status_pembayaran !== 'lunas')) {
          const metode = (newTx.metode_pembayaran === 'cash' || newTx.metode_pembayaran === 'kredit') 
            ? newTx.metode_pembayaran 
            : 'cash';
          const res = await this.bayarTransaksi(newTx.transaksi_id, metode, 'PMK-01', newTx.catatan_kasir);
          if (res) return { syncedTx: res, fromBackend: true };
        }

        const hasWeights = Boolean(newTx.items?.some((i) => (i.berat_kg || 0) > 0));

        // Kasus 2: Kupon existing → sync daftar bal sortir, lalu timbang dengan BERAT dari FE (newTx)
        if (oldTx) {
          const sortirSynced = await this.updateSortirItemsTransaksi(newTx);

          if (hasWeights) {
            // Samakan item_id dari BE bila ada, tapi tetap kirim berat/tara dari FE
            const timbangPayload: TransaksiPembelian = sortirSynced
              ? {
                  ...newTx,
                  transaksi_id: sortirSynced.transaksi_id || newTx.transaksi_id,
                  items: (newTx.items || []).map((feItem) => {
                    const beItem = (sortirSynced.items || []).find(
                      (b) => String(b.no_bal) === String(feItem.no_bal)
                    );
                    return beItem ? { ...feItem, item_id: beItem.item_id || feItem.item_id } : feItem;
                  }),
                }
              : newTx;

            const weighed = await this.updateTimbangTransaksi(timbangPayload);
            if (weighed) return { syncedTx: weighed, fromBackend: true };
          }

          if (sortirSynced) return { syncedTx: sortirSynced, fromBackend: true };
        }

        // Kasus 3: Input Baru di Loket Sortir
        if (!oldTx) {
          const created = await this.storeSortirTransaksi(newTx);
          if (created && hasWeights) {
            const timbangPayload: TransaksiPembelian = {
              ...newTx,
              transaksi_id: created.transaksi_id || newTx.transaksi_id,
              items: (newTx.items || []).map((feItem) => {
                const beItem = (created.items || []).find(
                  (b) => String(b.no_bal) === String(feItem.no_bal)
                );
                return beItem ? { ...feItem, item_id: beItem.item_id || feItem.item_id } : feItem;
              }),
            };
            const weighed = await this.updateTimbangTransaksi(timbangPayload);
            if (weighed) return { syncedTx: weighed, fromBackend: true };
          }
          if (created) return { syncedTx: created, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Sinkronisasi transaksi ke backend dialihkan ke mode offline:', err);
      if (options?.koreksi) throw err;
    }

    return { syncedTx: newTx, fromBackend: false };
  }

  // --- INVENTARIS BARANG / BAL ---
  /** Flatten nested BE `item` (berat/harga) ke bentuk Barang FE. */
  public static mapBackendBarang(b: any): Barang {
    const item = b?.item && typeof b.item === 'object' ? b.item : {};
    const berat = Number(item.berat_kg ?? b.berat_kg ?? 0);
    const harga = Number(item.harga_per_kg ?? b.harga_per_kg ?? 0);
    const bruto = Number(item.berat_bruto_kg ?? b.berat_bruto_kg ?? (berat || 0));
    const tara = Number(item.potongan_tara_kg ?? b.potongan_tara_kg ?? 0);
    const tanggalMasuk = b.tanggal_masuk
      ? String(b.tanggal_masuk).split('T')[0]
      : '';
    const tanggalKeluar = b.tanggal_keluar
      ? String(b.tanggal_keluar).split('T')[0]
      : undefined;

    return {
      barang_id: String(b.barang_id || ''),
      kode_grade: String(b.kode_grade || item.kode_grade || ''),
      no_bal: String(b.no_bal || item.no_bal || ''),
      kode_bal_pembeli: item.kode_bal_pembeli || b.kode_bal_pembeli || undefined,
      berat_kg: berat,
      harga_per_kg: harga || undefined,
      total_harga: berat * harga || undefined,
      berat_bruto_kg: bruto || undefined,
      potongan_tara_kg: tara || undefined,
      status_stok: (b.status_stok || 'di_gudang') as Barang['status_stok'],
      tanggal_masuk: tanggalMasuk,
      tanggal_keluar: tanggalKeluar,
      petani_id: String(b.petani_id || ''),
      transaksi_pembelian_id: b.transaksi_id || b.transaksi_pembelian_id || undefined,
      nama_petani: b.petani?.nama_petani || b.nama_petani || undefined,
      desa_kecamatan:
        b.petani?.alamat || b.petani?.desa_kecamatan || b.desa_kecamatan || undefined,
      catatan: b.catatan || undefined,
    };
  }

  public static async getBarangList(): Promise<{ data: Barang[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any[]>('/barang');
        if (res.status === 'success' && Array.isArray(res.data)) {
          const mapped = res.data.map((b) => this.mapBackendBarang(b));
          saveBarangData(mapped);
          return { data: mapped, fromBackend: true };
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

  public static async saveHargaBeli(harga: Partial<TabelHarga>): Promise<TabelHarga> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.post<TabelHarga>('/master/harga-beli', {
          harga_id: harga.harga_id,
          kode_grade: harga.kode_grade,
          harga_per_kg: harga.harga_per_kg,
          rate_potongan_per_bal: harga.rate_potongan_per_bal ?? 0,
          berat_standar_kg: harga.berat_standar_kg,
          tanggal_berlaku: harga.tanggal_berlaku,
          status: harga.status ?? 'aktif',
          deskripsi: harga.deskripsi,
        });
        if (res.data) {
          const list = loadHargaData();
          const exists = list.some(h => h.harga_id === res.data!.harga_id || (h.kode_grade === res.data!.kode_grade && res.data!.status === 'aktif'));
          const updated = exists
            ? list.map(h => (h.harga_id === res.data!.harga_id || (h.kode_grade === res.data!.kode_grade && res.data!.status === 'aktif')) ? res.data! : h)
            : [res.data, ...list];
          saveHargaData(updated);
          return res.data;
        }
      }
    } catch (err) {
      console.warn('Gagal simpan harga beli ke backend API, beralih ke penyimpanan lokal:', err);
      throw err;
    }
    return harga as TabelHarga;
  }

  public static async updateBarang(barang: Partial<Barang>): Promise<Barang> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline && barang.barang_id) {
        const res = await api.put<Barang>(`/barang/${barang.barang_id}/status`, {
          status_stok: barang.status_stok,
          catatan: barang.catatan,
        });
        if (res.data) {
          const list = loadBarangData().map(b => b.barang_id === res.data!.barang_id ? { ...b, ...res.data! } : b);
          saveBarangData(list);
          return { ...barang, ...res.data } as Barang;
        }
      }
    } catch (err) {
      console.warn('Gagal update barang ke backend API, beralih ke penyimpanan lokal:', err);
    }
    return barang as Barang;
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
    let isOnline = false;
    try {
      isOnline = await this.isBackendOnline();
      if (isOnline) {
        if (isEdit && user.user_id) {
          const res = await api.put<User>(`/users/${user.user_id}`, {
            username: user.username,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            role_code: user.role,
            email: user.email || '',
            no_hp: user.no_hp || '',
            unit_penugasan: user.unit_penugasan || '',
            status_aktif: user.status_aktif,
            password: user.password || undefined,
          });
          if (res.data) {
            const formatted: User = {
              ...res.data,
              role: res.data.role || (res.data as any).role_code || user.role || 'superadmin',
              status_aktif: Boolean(res.data.status_aktif),
            };
            const list = loadUserData().map(u => u.user_id === formatted.user_id ? formatted : u);
            saveUserData(list);
            return formatted;
          }
        } else {
          const res = await api.post<User>('/users', {
            user_id: user.user_id,
            username: user.username,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            role_code: user.role,
            password: user.password,
            email: user.email || '',
            no_hp: user.no_hp || '',
            unit_penugasan: user.unit_penugasan || '',
          });
          if (res.data) {
            const formatted: User = {
              ...res.data,
              role: res.data.role || (res.data as any).role_code || user.role || 'superadmin',
              status_aktif: Boolean(res.data.status_aktif),
            };
            const list = [formatted, ...loadUserData().filter(u => u.user_id !== formatted.user_id)];
            saveUserData(list);
            return formatted;
          }
        }
      }
    } catch (err) {
      if (isOnline) {
        throw err instanceof Error ? err : new Error('Server menolak penyimpanan akun pengguna.');
      }
      console.warn('Gagal menyimpan user ke backend API, beralih ke penyimpanan lokal:', err);
    }

    // Fallback simpan lokal jika offline; kata sandi disimpan sebagai hash
    const localUser: Partial<User> = { ...user };
    if (localUser.password) {
      localUser.password = await hashPassword(localUser.password);
    } else {
      delete localUser.password;
    }
    const currentList = loadUserData();
    let resultUser: User;
    if (isEdit && user.user_id) {
      resultUser = { ...currentList.find(u => u.user_id === user.user_id)!, ...localUser } as User;
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
        ...localUser,
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
      console.warn('Gagal simpan harga jual ke backend API, beralih ke penyimpanan lokal:', err);
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

  // --- BATCH SAMPLE PENGIRIMAN ---
  public static mapBackendBatchSample(b: any): BatchPengirimanSample {
    const rawItems = b.items || [];
    const items = rawItems.map((it: any) => {
      const beratKg = Number(it.barang?.item?.berat_kg ?? it.barang?.berat_kg ?? 0);
      const tawaranKg = Number(it.harga_tawaran_kg || 0);
      const dealKg = it.harga_deal_kg !== null && it.harga_deal_kg !== undefined ? Number(it.harga_deal_kg) : undefined;
      return {
        sample_item_id: it.sample_item_id,
        batch_id: b.batch_id,
        barang_id: it.barang_id,
        no_bal: it.barang?.no_bal || it.no_bal || '',
        kode_grade: it.barang?.kode_grade || it.kode_grade || '',
        kode_harga_jual: it.kode_harga_jual,
        berat_bal_kg: beratKg,
        berat_bruto_kg: Number(it.barang?.item?.berat_bruto_kg ?? it.barang?.berat_bruto_kg ?? beratKg),
        potongan_tara_kg: Number(it.barang?.item?.potongan_tara_kg ?? 0),
        berat_sample_gram: Number(it.berat_sample_gram || 200),
        harga_tawaran_kg: tawaranKg,
        harga_deal_kg: dealKg,
        status_item: it.status_item || 'sample',
        alasan_tolak: it.alasan_tolak || undefined,
        catatan_nego: it.catatan_nego || undefined,
        tanggal_evaluasi: it.tanggal_evaluasi || undefined,
        sudah_dikirim_do: Boolean(it.sudah_dikirim_do),
      };
    });

    const totalEstimasi = items.reduce((sum: number, it: any) => sum + (it.berat_bal_kg * (it.harga_tawaran_kg || 0)), 0);
    const totalDeal = items.reduce((sum: number, it: any) => sum + (it.berat_bal_kg * (it.harga_deal_kg || 0)), 0);

    return {
      batch_id: b.batch_id,
      kode_batch: b.kode_batch,
      tujuan_buyer: b.tujuan_buyer,
      permintaan_buyer: b.permintaan_buyer,
      sumber_gudang: b.gudang?.nama_gudang || b.sumber_gudang_id || 'Gudang Utama',
      tanggal_kirim: b.tanggal_kirim ? String(b.tanggal_kirim).split('T')[0] : '',
      tanggal_respon: b.tanggal_respon ? String(b.tanggal_respon).split('T')[0] : undefined,
      status: b.status,
      dikirim_oleh: b.dikirim_oleh || 'Staff Lab',
      petugas_qc_pabrik: b.petugas_qc_pabrik || undefined,
      catatan: b.catatan || undefined,
      items: items,
      total_sample_bal: items.length,
      total_bal_disetujui: items.filter((it: any) => it.status_item === 'disetujui').length,
      total_bal_ditolak: items.filter((it: any) => it.status_item === 'ditolak').length,
      total_bal_nego: items.filter((it: any) => it.status_item === 'nego').length,
      total_estimasi_nilai: totalEstimasi,
      total_nilai_deal: totalDeal,
    };
  }

  public static mapBackendPengiriman(p: any): PengirimanBarang {
    const items = Array.isArray(p.items) ? p.items : [];
    const barangIds: string[] = [];
    const hargaDealMap: Record<string, number> = {};
    const kodeHargaJualMap: Record<string, string> = {};
    const beratKirimMap: Record<string, number> = {};
    let totalBerat = 0;
    let totalNilai = 0;

    for (const it of items) {
      const barangId = String(it.barang_id || '');
      if (barangId) barangIds.push(barangId);

      // Pengiriman memakai berat bruto; netto hanya cadangan bila bruto tidak tersedia
      const bruto = Number(
        it.berat_kirim_kg ??
          it.barang?.item?.berat_bruto_kg ??
          it.barang?.berat_bruto_kg ??
          it.berat_bruto_kg ??
          0
      );
      const berat = bruto > 0
        ? bruto
        : Number(it.barang?.item?.berat_kg ?? it.barang?.berat_kg ?? it.berat_kg ?? 0);
      const hargaDeal = Number(it.harga_deal_per_kg ?? 0);
      totalBerat += berat;
      totalNilai += berat * hargaDeal;

      if (barangId) {
        beratKirimMap[barangId] = berat;
        if (hargaDeal > 0) hargaDealMap[barangId] = hargaDeal;
        if (it.kode_harga_jual) kodeHargaJualMap[barangId] = String(it.kode_harga_jual);
      }
    }

    return {
      pengiriman_id: p.pengiriman_id,
      no_surat_jalan: p.no_surat_jalan,
      tujuan: p.tujuan,
      jenis_pengeluaran: p.jenis_pengeluaran,
      driver_nama: p.driver_nama,
      plat_nomor: p.plat_nomor,
      tanggal_kirim: p.tanggal_kirim ? String(p.tanggal_kirim).split('T')[0] : '',
      status: p.status,
      nomor_kontrak: p.nomor_kontrak,
      catatan: p.catatan,
      batch_sample_id_ref: p.batch_sample_id_ref,
      barang_ids: barangIds,
      total_bal: Number(p.total_bal) || items.length,
      total_berat_kg: Number(p.total_berat_kg) || totalBerat,
      total_nilai_deal: Number(p.total_nilai_deal) || totalNilai,
      harga_deal_map: Object.keys(hargaDealMap).length ? hargaDealMap : undefined,
      kode_harga_jual_map: Object.keys(kodeHargaJualMap).length ? kodeHargaJualMap : undefined,
      berat_kirim_map: Object.keys(beratKirimMap).length ? beratKirimMap : undefined,
    };
  }

  /**
   * Gabungkan data DO dari server ke data lokal. Server menjadi acuan untuk ID, status, dan
   * nilai yang dikirimnya; rincian yang tidak disimpan server (berat kirim per bal, total berat,
   * petugas, rincian grade) tetap memakai data lokal. Nilai kosong / 0 dari server diabaikan.
   */
  public static gabungPengirimanServer(
    lokal: PengirimanBarang | undefined,
    server: PengirimanBarang
  ): PengirimanBarang {
    if (!lokal) return server;
    const hasil = { ...lokal } as PengirimanBarang;
    (Object.keys(server) as (keyof PengirimanBarang)[]).forEach((k) => {
      const v = server[k];
      const kosong =
        v === undefined || v === null || v === '' ||
        (typeof v === 'number' && v === 0) ||
        (Array.isArray(v) && v.length === 0);
      if (!kosong) (hasil as any)[k] = v;
    });
    if (lokal.berat_kirim_map && Object.keys(lokal.berat_kirim_map).length > 0) {
      hasil.berat_kirim_map = lokal.berat_kirim_map;
    }
    if (lokal.total_berat_kg) hasil.total_berat_kg = lokal.total_berat_kg;
    return hasil;
  }

  /**
   * Gabungkan batch sample dari server ke data lokal. Server menjadi acuan untuk ID dan hasil
   * evaluasi pabrik; No. Surat Sample yang diketik manual serta rincian bal tetap dari data lokal.
   */
  public static gabungBatchServer(
    lokal: BatchPengirimanSample | undefined,
    server: BatchPengirimanSample
  ): BatchPengirimanSample {
    if (!lokal) return server;
    const itemsLokal = lokal.items || [];
    const sumber = server.items && server.items.length > 0 ? server.items : itemsLokal;
    const items = sumber.map((sv) => {
      const lk = itemsLokal.find(
        (l) => (sv.barang_id && l.barang_id === sv.barang_id) || (sv.sample_item_id && l.sample_item_id === sv.sample_item_id)
      );
      if (!lk || lk === sv) return sv;
      return {
        ...lk,
        sample_item_id: sv.sample_item_id || lk.sample_item_id,
        status_item: sv.status_item || lk.status_item,
        harga_tawaran_kg: sv.harga_tawaran_kg || lk.harga_tawaran_kg,
        harga_deal_kg: sv.harga_deal_kg ?? lk.harga_deal_kg,
        kode_harga_jual: sv.kode_harga_jual || lk.kode_harga_jual,
        alasan_tolak: sv.alasan_tolak ?? lk.alasan_tolak,
        catatan_nego: sv.catatan_nego ?? lk.catatan_nego,
        tanggal_evaluasi: sv.tanggal_evaluasi ?? lk.tanggal_evaluasi,
        sudah_dikirim_do: Boolean(sv.sudah_dikirim_do || lk.sudah_dikirim_do),
      };
    });
    const disetujui = items.filter((it) => it.status_item === 'disetujui');
    return {
      ...lokal,
      batch_id: server.batch_id || lokal.batch_id,
      status: server.status || lokal.status,
      tanggal_respon: server.tanggal_respon || lokal.tanggal_respon,
      petugas_qc_pabrik: server.petugas_qc_pabrik || lokal.petugas_qc_pabrik,
      catatan: server.catatan || lokal.catatan,
      items,
      total_sample_bal: items.length,
      total_bal_disetujui: disetujui.length,
      total_bal_ditolak: items.filter((it) => it.status_item === 'ditolak').length,
      total_bal_nego: items.filter((it) => it.status_item === 'nego').length,
      total_estimasi_nilai: items.reduce((s, it) => s + beratBrutoItemSample(it) * (it.harga_tawaran_kg || 0), 0),
      total_nilai_deal: disetujui.reduce(
        (s, it) => s + beratBrutoItemSample(it) * (it.harga_deal_kg || it.harga_tawaran_kg || 0),
        0
      ),
    };
  }

  public static async getDashboardStats(): Promise<{
    data: {
      transaksi: {
        total_transaksi: number;
        total_bal: number;
        total_berat_kg: number;
        total_pembelian: number;
      } | null;
      stok_valuasi: Array<{
        gudang_id?: string;
        kode_grade?: string;
        bal_di_gudang?: number;
        kg_di_gudang?: number;
        valuasi_beli?: number;
      }>;
      pengiriman: {
        total_pengiriman: number;
        total_bal_terkirim: number;
        total_berat_terkirim: number;
        total_nilai_deal: number;
      } | null;
      pengiriman_terkirim?: {
        total_pengiriman: number;
        total_bal_terkirim: number;
        total_berat_terkirim: number;
        total_nilai_deal: number;
      } | null;
    } | null;
    fromBackend: boolean;
  }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any>('/dashboard/stats');
        if (res.status === 'success' && res.data) {
          return { data: res.data, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil dashboard stats dari API:', err);
    }
    return { data: null, fromBackend: false };
  }

  public static async getBatchSampleList(): Promise<{ data: BatchPengirimanSample[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any[]>('/sample-batch');
        if (res.status === 'success' && Array.isArray(res.data)) {
          const lokal = loadBatchSampleData();
          const mapped = res.data.map((b: any) => {
            const server = this.mapBackendBatchSample(b);
            const cocok = lokal.find((l) => l.batch_id === server.batch_id || l.kode_batch === server.kode_batch);
            return this.gabungBatchServer(cocok, server);
          });
          saveBatchSampleData(mapped);
          return { data: mapped, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil batch sample dari API, memakai fallback lokal:', err);
    }
    return { data: loadBatchSampleData(), fromBackend: false };
  }

  public static async saveBatchSample(batch: Partial<BatchPengirimanSample>): Promise<BatchPengirimanSample> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const payload = {
          kode_batch: batch.kode_batch,
          dikirim_oleh: batch.dikirim_oleh,
          tujuan_buyer: batch.tujuan_buyer,
          permintaan_buyer: batch.permintaan_buyer,
          tanggal_kirim: batch.tanggal_kirim || new Date().toISOString().split('T')[0],
          items: (batch.items || []).map(it => ({
            barang_id: it.barang_id,
            kode_harga_jual: it.kode_harga_jual,
            berat_sample_gram: it.berat_sample_gram || 200,
            harga_tawaran_kg: it.harga_tawaran_kg,
            harga_deal_kg: it.harga_deal_kg,
          })),
        };
        const res = await api.post<any>('/sample-batch', payload);
        if (res.data) {
          const savedBatch = this.gabungBatchServer(batch as BatchPengirimanSample, this.mapBackendBatchSample(res.data));
          const list = loadBatchSampleData();
          saveBatchSampleData([savedBatch, ...list.filter(b => b.batch_id !== savedBatch.batch_id && b.batch_id !== batch.batch_id)]);
          return savedBatch;
        }
      }
      throw new Error('Backend offline atau respons sample tidak valid');
    } catch (err) {
      console.warn('Gagal simpan batch sample ke API, beralih ke lokal:', err);
      throw err;
    }
  }

  public static async updateBatchSample(batch: BatchPengirimanSample): Promise<BatchPengirimanSample> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline && batch.batch_id) {
        const payload = {
          status: batch.status,
          tujuan_buyer: batch.tujuan_buyer,
          permintaan_buyer: batch.permintaan_buyer,
          tanggal_kirim: batch.tanggal_kirim,
          tanggal_respon: batch.tanggal_respon,
          petugas_qc_pabrik: batch.petugas_qc_pabrik,
          catatan: batch.catatan,
          items: (batch.items || []).map((it) => ({
            sample_item_id: it.sample_item_id,
            status_item: it.status_item,
            harga_tawaran_kg: it.harga_tawaran_kg,
            harga_deal_kg: it.harga_deal_kg,
            berat_sample_gram: it.berat_sample_gram,
            kode_harga_jual: it.kode_harga_jual,
            alasan_tolak: it.alasan_tolak,
            catatan_nego: it.catatan_nego,
            tanggal_evaluasi: it.tanggal_evaluasi,
            sudah_dikirim_do: it.sudah_dikirim_do,
          })),
        };
        const res = await api.put<any>(`/sample-batch/${batch.batch_id}`, payload);
        if (res.data) {
          const saved = this.gabungBatchServer(batch, this.mapBackendBatchSample(res.data));
          const list = loadBatchSampleData().map((b) => (b.batch_id === saved.batch_id || b.batch_id === batch.batch_id ? saved : b));
          saveBatchSampleData(list);
          return saved;
        }
      }
      throw new Error('Backend offline atau respons update sample tidak valid');
    } catch (err) {
      console.warn('Gagal update batch sample ke API, beralih ke lokal:', err);
      throw err;
    }
  }

  // --- PENGIRIMAN REGULER (DO) ---
  public static async getPengirimanList(): Promise<{ data: PengirimanBarang[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any[]>('/pengiriman');
        if (res.status === 'success' && Array.isArray(res.data)) {
          const lokal = loadPengirimanData();
          const mapped = res.data.map((p: any) => {
            const server = this.mapBackendPengiriman(p);
            const cocok = lokal.find(
              (l) => l.pengiriman_id === server.pengiriman_id || (server.no_surat_jalan && l.no_surat_jalan === server.no_surat_jalan)
            );
            return this.gabungPengirimanServer(cocok, server);
          });
          savePengirimanData(mapped);
          return { data: mapped, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil data pengiriman dari API, memakai fallback lokal:', err);
    }
    return { data: loadPengirimanData(), fromBackend: false };
  }

  public static async savePengiriman(pengiriman: Partial<PengirimanBarang>, items: any[]): Promise<PengirimanBarang> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const payload = {
          no_surat_jalan: pengiriman.no_surat_jalan,
          tujuan: pengiriman.tujuan,
          jenis_pengeluaran: pengiriman.jenis_pengeluaran || 'Pabrik Rokok',
          driver_nama: pengiriman.driver_nama,
          plat_nomor: pengiriman.plat_nomor,
          tanggal_kirim: pengiriman.tanggal_kirim,
          batch_sample_id_ref: pengiriman.batch_sample_id_ref,
          nomor_kontrak: pengiriman.nomor_kontrak,
          catatan: pengiriman.catatan,
          items: items.map(it => {
            const bId = typeof it === 'string' ? it : it.barang_id;
            return {
              barang_id: bId,
              kode_harga_jual: it.kode_harga_jual || pengiriman.kode_harga_jual_map?.[bId],
              harga_deal_per_kg: it.harga_deal_per_kg || pengiriman.harga_deal_map?.[bId] || 0,
            };
          }),
        };
        const res = await api.post<any>('/pengiriman', payload);
        if (res.data) {
          const saved = this.gabungPengirimanServer(pengiriman as PengirimanBarang, this.mapBackendPengiriman(res.data));
          const list = loadPengirimanData();
          savePengirimanData([
            saved,
            ...list.filter(
              (p) => p.pengiriman_id !== saved.pengiriman_id && p.pengiriman_id !== pengiriman.pengiriman_id
            ),
          ]);
          return saved;
        }
      }
      throw new Error('Backend offline atau respons pengiriman tidak valid');
    } catch (err) {
      console.warn('Gagal simpan pengiriman ke API, beralih ke lokal:', err);
      throw err;
    }
  }
}
