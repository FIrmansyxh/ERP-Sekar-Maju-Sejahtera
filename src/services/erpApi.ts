/**
 * Service sinkronisasi data ERP Sekar Maju Sejahtera.
 * Mengimplementasikan pola "API-First with Offline LocalStorage Fallback".
 */

import { api, ApiError, checkBackendHealth, setAuthToken, getTerakhirGagalJaringan } from './apiClient';
import { hashPassword } from '../utils/crypto';
import { beratBrutoItemSample } from '../utils/beratKirim';
import { statusSetelahSinkron, tandaiServerKenalDraft } from '../utils/statusBatchSample';
import {
  overlayBarang,
  overlayBatchSample,
  overlayHargaBeli,
  overlayHargaJual,
  overlayPengiriman,
  overlayPetani,
  overlayTransaksi,
  overlayUser,
} from './overlayDaftar';
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
import { hitungUlangKupon, lengkapiBalDariKupon, mergeKuponParalel, pulihkanStatusSampleLama, sortTransaksiItemsByInputOrder } from '../utils/kuponSortir';
import { balDihapusDariKupon, konfirmasiBalDihapus } from '../utils/balDihapus';
import { generatePetaniId } from '../utils/formatters';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../config/aturanTimbang';
import { hariIniLokal } from '../utils/rentangTanggal';

/** Angka dari server; kosong (null/undefined/'') memakai nilai cadangan, 0 tetap 0. */
const angkaAtau = (nilai: unknown, cadangan: number): number =>
  nilai === null || nilai === undefined || nilai === '' || Number.isNaN(Number(nilai)) ? cadangan : Number(nilai);

/**
 * Cap waktu perubahan disengaja pada satu bal. Server hanya menerima GT / berat yang lebih baru dari yang
 * tersimpan; null berarti bal ini tidak diubah di perangkat ini sehingga nilainya di server dipertahankan.
 */
const capWaktuBal = (it: Partial<TransaksiItemBal>) => ({
  ganti_tikar_diubah_pada: it.gt_diubah_pada ?? null,
  timbang_diubah_pada: it.diubah_lokal_pada ?? null,
});

/** Potongan tikar yang berlaku untuk satu bal: hanya bila ganti tikar, tarif dari isian atau tarif standar. */
const tikarBal = (it: Partial<TransaksiItemBal>): number => (it.ganti_tikar ? Number(it.potongan_tikar) || POTONGAN_GANTI_TIKAR : 0);

function mapTanggalPetani(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.slice(0, 10);
  }
  if (value && typeof value === 'object' && 'date' in (value as Record<string, unknown>)) {
    const dateVal = (value as { date?: unknown }).date;
    if (typeof dateVal === 'string') return dateVal.slice(0, 10);
  }
  return undefined;
}

export function mapPetaniFromApi(raw: any): Petani {
  return {
    petani_id: String(raw?.petani_id || ''),
    nama_petani: String(raw?.nama_petani || '').trim(),
    no_hp: raw?.no_hp ? String(raw.no_hp) : '',
    alamat: raw?.alamat ? String(raw.alamat) : '',
    desa_kecamatan: raw?.desa_kecamatan ? String(raw.desa_kecamatan) : '',
    status_aktif: raw?.status_aktif !== false && raw?.status_aktif !== 0 && raw?.status_aktif !== '0' && raw?.status_aktif !== 'false',
    alasan_nonaktif: raw?.alasan_nonaktif || undefined,
    tanggal_daftar: mapTanggalPetani(raw?.tanggal_daftar),
    catatan: raw?.catatan || '',
    statistik: raw?.statistik,
  };
}

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
  /**
   * Login. Server adalah penentu: bila server menjawab dan menolak (mis. sandi salah, akun nonaktif, 4xx),
   * login GAGAL dan tidak pernah dilanjutkan ke akun lokal. Autentikasi lokal hanya dipakai saat server
   * tidak dapat dijangkau (offline, timeout, atau galat 5xx) agar operasional gudang tetap berjalan.
   */
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
        return { success: false, message: res.message || 'Login gagal. Periksa kembali username dan password.', mode: 'api' };
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        return { success: false, message: err.message || 'Login gagal. Periksa kembali username dan password.', mode: 'api' };
      }
      console.warn('Server tidak dapat dijangkau saat login, memakai autentikasi lokal:', err instanceof Error ? err.message : err);
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
          const dariServer = res.data.map(mapPetaniFromApi).filter((p) => p.petani_id && p.nama_petani);
          // Perubahan di perangkat ini yang belum sampai ke server tidak boleh tertimpa data server yang lebih lama
          const mapped = overlayPetani(dariServer);
          savePetaniData(mapped);
          return { data: mapped, fromBackend: true };
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
            const saved = mapPetaniFromApi(res.data);
            const list = loadPetaniData().map(p => p.petani_id === saved.petani_id ? saved : p);
            savePetaniData(list);
            return saved;
          }
        } else {
          // Create data baru ke PostgreSQL
          const payload = {
            petani_id: petani.petani_id,
            nama_petani: petani.nama_petani,
            alamat: petani.alamat || '',
            no_hp: petani.no_hp || '',
            desa_kecamatan: petani.desa_kecamatan || petani.alamat || '',
            catatan: petani.catatan || '',
            status_aktif: petani.status_aktif ?? true,
            tanggal_daftar: petani.tanggal_daftar || hariIniLokal(),
          };
          const res = await api.post<Petani>('/petani', payload);
          if (res.data) {
            const saved = mapPetaniFromApi(res.data);
            const list = [saved, ...loadPetaniData().filter(p => p.petani_id !== saved.petani_id)];
            savePetaniData(list);
            return saved;
          }
        }
      }
    } catch (err) {
      console.warn('Gagal simpan petani ke backend API, beralih ke penyimpanan lokal:', err);
    }

    // Fallback simpan lokal jika backend offline atau gagal
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
        tanggal_daftar: petani.tanggal_daftar || existing?.tanggal_daftar || hariIniLokal(),
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
        tanggal_daftar: petani.tanggal_daftar || hariIniLokal(),
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

  // --- TRANSAKSI ---
  public static mapBackendTransaksi(t: any): TransaksiPembelian {
    const items: TransaksiItemBal[] = Array.isArray(t.items)
      ? sortTransaksiItemsByInputOrder<TransaksiItemBal>(
          t.items.map((it: any): TransaksiItemBal => {
      const berat = Number(it.berat_kg) || 0;
      const harga = Number(it.harga_per_kg) || 0;
      const gantiTikar = Boolean(it.ganti_tikar) || Number(it.potongan_tikar) > 0;
      const kuli = angkaAtau(it.potongan_kuli, POTONGAN_KULI_PER_BAL);
      const tali = angkaAtau(it.potongan_tali, POTONGAN_TALI_PER_BAL);
      const tikar = gantiTikar ? Number(it.potongan_tikar) || POTONGAN_GANTI_TIKAR : 0;
      const potongan = angkaAtau(it.potongan, kuli + tali + tikar);
      const kotor = angkaAtau(it.total_kotor, Math.round(berat * harga));
      return {
      item_id: it.item_id,
      barang_id: it.barang_id ? String(it.barang_id) : it.barang?.barang_id ? String(it.barang.barang_id) : undefined,
      no_bal: String(it.no_bal || ''),
      kode_bal_pembeli: it.kode_bal_pembeli || undefined,
      barcode: it.barcode || undefined,
      kode_grade: it.kode_grade || it.grade?.kode_grade || '',
      harga_per_kg: harga,
      ganti_tikar: gantiTikar,
      berat_bruto_kg: it.berat_bruto_kg !== null && it.berat_bruto_kg !== undefined ? Number(it.berat_bruto_kg) : undefined,
      potongan_tara_kg: Number(it.potongan_tara_kg) || 0,
      is_netto_manual: Boolean(it.is_netto_manual),
      berat_kg: berat,
      potongan_kuli: kuli,
      potongan_tali: tali,
      potongan_tikar: tikar,
      potongan,
      total_kotor: kotor,
      // Bal yang belum ditimbang belum bernilai (kolom hitungan server bisa negatif: 0 kg dikurangi potongan);
      // jumlah bayar tidak pernah negatif
      subtotal_bersih: berat > 0 ? Math.max(0, angkaAtau(it.subtotal_bersih, kotor - potongan)) : 0,
      status_timbang: it.status_timbang || (Number(it.berat_kg) > 0 ? 'selesai_timbang' : 'menunggu_timbang'),
      // Cap waktu perubahan disengaja yang disimpan server: dipakai saat menggabungkan dengan salinan layar
      gt_diubah_pada: Number(it.ganti_tikar_diubah_pada) || undefined,
      diubah_lokal_pada: Number(it.timbang_diubah_pada) || undefined,
      lokasi_simpan: it.lokasi_simpan || 'Blok A',
      sample_label_code: it.sample_label_code || undefined,
      sample_label_printed: Boolean(it.sample_label_printed),
      catatan: it.catatan || undefined,
    };
          })
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
    const totalKuli = items.reduce((sum, i) => sum + (i.potongan_kuli ?? POTONGAN_KULI_PER_BAL), 0);
    const totalTikar = items.reduce((sum: number, i: any) => sum + (Number(i.potongan_tikar) || 0), 0);
    const totalTali = items.reduce((sum, i) => sum + (i.potongan_tali ?? POTONGAN_TALI_PER_BAL), 0);

    const firstGrade = items[0]?.kode_grade || t.kode_grade || '-';
    const noBalSummary = items.map((i) => i.no_bal).filter(Boolean).join(', ') || t.no_bal || '';

    return {
      transaksi_id: t.transaksi_id,
      no_kupon: t.no_kupon || '',
      petani_id: t.petani_id || t.petani?.petani_id || '',
      nama_petani: t.petani?.nama_petani || t.nama_petani || '',
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
      tanggal_transaksi: t.tanggal_transaksi ? String(t.tanggal_transaksi).split('T')[0] : hariIniLokal(),
      operator_nama: t.operator_nama || t.operator?.nama_lengkap || '',
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
          // Perubahan di perangkat ini yang belum sampai ke server tidak boleh tertimpa data server yang lebih lama
          const gabungan = overlayTransaksi(mapped);
          saveTransaksiData(gabungan);
          return { data: gabungan, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil transaksi dari API, memakai fallback lokal:', err);
    }
    return { data: loadTransaksiData(), fromBackend: false };
  }

  /**
   * Kupon tunggal terbaru dari server, dipakai untuk menyegarkan salinan lokal SESAAT SEBELUM mengirim
   * simpanan (bukan lewat tampilan) supaya bal saudara yang sudah basi tidak ikut menimpa balik data
   * yang sudah benar di server (mis. ganti tikar yang diubah dari perangkat lain). Tidak pernah melempar
   * galat — kegagalan di sini tidak boleh menahan simpanan; pengirim tetap jalan pakai data lokal.
   */
  public static async getTransaksiSatu(transaksiId: string): Promise<TransaksiPembelian | undefined> {
    try {
      const res = await api.get<any>(`/transaksi/${transaksiId}`);
      if (res.status === 'success' && res.data) return this.mapBackendTransaksi(res.data);
    } catch (err) {
      console.warn(`Gagal menyegarkan kupon ${transaksiId} sebelum kirim, memakai salinan lokal:`, err);
    }
    return undefined;
  }

  /**
   * Permintaan kirim kupon ke server. Semuanya MELEMPAR galat bila gagal, supaya antrean sinkron
   * (antrianSinkron.ts) tahu dan mencoba lagi; dulu galat ditelan dan data hanya tersimpan lokal.
   */
  public static async storeSortirTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian> {
    const itemKupon: Partial<TransaksiItemBal>[] = tx.items || [];
    const payload = {
      transaksi_id: tx.transaksi_id,
      no_kupon: tx.no_kupon,
      petani_id: tx.petani_id,
      tanggal_transaksi: tx.tanggal_transaksi || hariIniLokal(),
      catatan: tx.catatan || '',
      items: itemKupon.map(it => ({
        no_bal: it.no_bal,
        kode_bal_pembeli: it.kode_bal_pembeli || null,
        barcode: it.barcode || null,
        kode_grade: it.kode_grade,
        harga_per_kg: it.harga_per_kg,
        ganti_tikar: Boolean(it.ganti_tikar),
        potongan_tikar: tikarBal(it),
        berat_bruto_kg: it.berat_bruto_kg || 0,
        potongan_tara_kg: it.potongan_tara_kg || 0,
        berat_kg: it.berat_kg || 0,
        lokasi_simpan: it.lokasi_simpan || 'Blok A',
        sample_label_code: it.sample_label_code || null,
        potongan_kuli: it.potongan_kuli,
        potongan_tali: it.potongan_tali,
        ...capWaktuBal(it),
      })),
    };

    const res = await api.post<any>('/transaksi/sortir', payload);
    if (res.status === 'success' && res.data) return this.mapBackendTransaksi(res.data);
    throw new Error(res.message || 'Server menolak menyimpan kupon baru');
  }

  public static async updateTimbangTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian> {
    const payload = {
      status_tahap: tx.status_tahap,
      items: (tx.items || []).map(it => ({
        item_id: it.item_id,
        no_bal: it.no_bal,
        berat_bruto_kg: it.berat_bruto_kg || it.berat_kg || 0,
        potongan_tara_kg: it.potongan_tara_kg || 0,
        berat_kg: it.berat_kg || 0,
        is_netto_manual: Boolean(it.is_netto_manual),
        lokasi_simpan: it.lokasi_simpan || 'Blok A',
        ganti_tikar: Boolean(it.ganti_tikar),
        potongan_tikar: tikarBal(it),
        potongan_kuli: it.potongan_kuli,
        potongan_tali: it.potongan_tali,
        ...capWaktuBal(it),
      })),
    };

    const res = await api.put<any>(`/transaksi/${tx.transaksi_id}/timbang`, payload);
    if (res.status === 'success' && res.data) return this.mapBackendTransaksi(res.data);
    throw new Error(res.message || 'Server menolak menyimpan hasil timbang');
  }

  public static async updateSortirItemsTransaksi(tx: TransaksiPembelian): Promise<TransaksiPembelian> {
    const itemKupon: Partial<TransaksiItemBal>[] = tx.items || [];
    const payload = {
      catatan: tx.catatan || '',
      status_tahap: tx.status_tahap,
      // No Bal yang sengaja dihapus operator: server menghapusnya walau sudah ditimbang (kupon belum lunas)
      bal_dihapus: Array.from(balDihapusDariKupon(tx.transaksi_id)),
      items: itemKupon.map(it => ({
        item_id: it.item_id || null,
        no_bal: it.no_bal,
        kode_bal_pembeli: it.kode_bal_pembeli || null,
        barcode: it.barcode || null,
        kode_grade: it.kode_grade,
        harga_per_kg: it.harga_per_kg,
        ganti_tikar: Boolean(it.ganti_tikar),
        potongan_tikar: tikarBal(it),
        berat_bruto_kg: it.berat_bruto_kg || 0,
        potongan_tara_kg: it.potongan_tara_kg || 0,
        berat_kg: it.berat_kg || 0,
        lokasi_simpan: it.lokasi_simpan || 'Blok A',
        sample_label_code: it.sample_label_code || null,
        potongan_kuli: it.potongan_kuli,
        potongan_tali: it.potongan_tali,
        ...capWaktuBal(it),
      })),
    };

    const res = await api.put<any>(`/transaksi/${tx.transaksi_id}/sortir-items`, payload);
    if (res.status === 'success' && res.data) return this.mapBackendTransaksi(res.data);
    throw new Error(res.message || 'Server menolak menyimpan daftar bal');
  }

  public static async bayarTransaksi(
    txId: string,
    metode: 'cash' | 'kredit' = 'cash',
    gudangId: string = 'PMK-01',
    catatanKasir?: string
  ): Promise<TransaksiPembelian> {
    const payload = {
      metode_pembayaran: metode,
      gudang_id: gudangId,
      catatan_kasir: catatanKasir || null,
    };

    const res = await api.put<any>(`/transaksi/${txId}/bayar`, payload);
    if (res.status === 'success' && res.data) return this.mapBackendTransaksi(res.data);
    throw new Error(res.message || 'Server menolak pelunasan');
  }

  /** Galat "kupon belum ada di server" (mis. dulu tersimpan lokal saja): jalur ubah harus diganti jalur buat baru. */
  private static galatBelumAda(err: unknown): boolean {
    const status = (err as { status?: number } | null)?.status;
    const pesan = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return status === 404 || /tidak ditemukan|not found|no query results/.test(pesan);
  }

  /** Galat "kupon sudah ada di server" (mis. permintaan buat sebelumnya sampai tetapi jawabannya hilang). */
  private static galatSudahAda(err: unknown): boolean {
    const status = (err as { status?: number } | null)?.status;
    const pesan = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return status === 409 || /sudah (ada|digunakan|terdaftar)|already|unique|duplicate|has already been taken|exists/.test(pesan);
  }

  /**
   * Mengirim keadaan terakhir sebuah kupon ke server. Dipanggil oleh antrean sinkron
   * (antrianSinkron.ts), yang menjamin hanya satu permintaan per kupon berjalan dan mengulang bila gagal.
   *
   * Urutan pasti: (buat baru | ubah daftar bal + hasil timbang | hasil timbang saja) lalu pelunasan bila baru dibayar.
   * Melempar galat bila gagal; fromBackend=false hanya bila server memang tidak terjangkau.
   */
  public static async syncTransaksi(
    newTx: TransaksiPembelian,
    oldTx?: { status_pembayaran?: TransaksiPembelian['status_pembayaran'] },
    options?: { tanpaCekKesehatan?: boolean; hanyaTimbang?: string[] }
  ): Promise<{ syncedTx: TransaksiPembelian; fromBackend: boolean }> {
    // Antrean mencoba permintaan sungguhan; cek kesehatan yang sekali gagal tidak boleh memblokir simpanan
    if (!options?.tanpaCekKesehatan) {
      const isOnline = await this.isBackendOnline();
      if (!isOnline) return { syncedTx: newTx, fromBackend: false };
    }

    const lunasBaru = newTx.status_pembayaran === 'lunas' && (!oldTx || oldTx.status_pembayaran !== 'lunas');

    // Samakan item_id dengan milik server (dicocokkan lewat No Bal), tetapi berat/tara/tikar tetap dari yang dikirim
    const denganIdServer = (dariServer: TransaksiPembelian, sumber: TransaksiPembelian): TransaksiPembelian => ({
      ...sumber,
      transaksi_id: dariServer.transaksi_id || sumber.transaksi_id,
      items: (sumber.items || []).map((feItem) => {
        const beItem = (dariServer.items || []).find((b) => String(b.no_bal) === String(feItem.no_bal));
        return beItem ? { ...feItem, item_id: beItem.item_id || feItem.item_id } : feItem;
      }),
    });

    // Berat dikirim dari versi yang sama dengan daftar bal (sudah digabung dengan server), supaya salinan
    // layar yang basi tidak menimpa hasil timbang bal lain yang baru dikerjakan perangkat lain.
    const kirimBerat = async (dariServer: TransaksiPembelian, sumber: TransaksiPembelian = newTx): Promise<TransaksiPembelian> => {
      if (!sumber.items?.some((i) => (i.berat_kg || 0) > 0)) return dariServer;
      return this.updateTimbangTransaksi(denganIdServer(dariServer, sumber));
    };

    // Server sudah tidak memuat bal yang dihapus di sini: penandanya tidak dibutuhkan lagi
    const konfirmasiHapus = (dariServer: TransaksiPembelian): TransaksiPembelian => {
      konfirmasiBalDihapus(newTx.transaksi_id, (dariServer.items || []).map((i) => i.no_bal));
      return dariServer;
    };

    // Kupon sudah ada di server: ganti daftar bal, lalu hasil timbang. Bila ternyata belum ada, buat baru.
    //
    // Sebelum mengirim, kupon ini disegarkan dulu dari server dan digabung ke salinan layar
    // (mergeKuponParalel) SESAAT sebelum dikirim — bukan lewat tampilan, jadi kolom yang sedang diisi
    // operator tidak pernah tersentuh. Ini menutup celah "kupon dibiarkan terbuka lama, bal saudara
    // berubah dari perangkat lain, lalu simpanan berikutnya dari sini menimpa balik ganti tikar/grade/
    // harga bal itu ke nilai lama": tanpa ini, endpoint sortir-items mengganti SELURUH daftar bal apa
    // adanya dari layar, termasuk bagian yang sudah basi.
    const perbarui = async (bolehBuat: boolean): Promise<TransaksiPembelian> => {
      try {
        const segar = await this.getTransaksiSatu(newTx.transaksi_id);
        const untukDikirim = segar ? mergeKuponParalel(newTx, segar, { incomingDariServer: true }) : newTx;
        const dariServer = konfirmasiHapus(await this.updateSortirItemsTransaksi(untukDikirim));
        return await kirimBerat(dariServer, untukDikirim);
      } catch (err) {
        if (bolehBuat && this.galatBelumAda(err)) return buatBaru(false);
        throw err;
      }
    };

    // Kupon belum ada di server. Bila permintaan buat sebelumnya sebenarnya sudah sampai, lanjut sebagai ubah.
    const buatBaru = async (bolehUbah: boolean): Promise<TransaksiPembelian> => {
      try {
        return await kirimBerat(await this.storeSortirTransaksi(newTx));
      } catch (err) {
        if (bolehUbah && this.galatSudahAda(err)) return perbarui(false);
        throw err;
      }
    };

    // Hasil timbang saja (Timbangan): bal yang ditimbang diterapkan ke versi server terbaru lalu dikirim lewat PUT
    // timbang. Daftar bal (sortir-items) tidak dikirim ulang dari salinan layar Timbangan; dulu bal yang baru
    // ditambah Sortir di komputer lain di antara GET dan PUT ikut terhapus di server.
    const timbangSaja = async (noBal: string[]): Promise<TransaksiPembelian> => {
      const segar = await this.getTransaksiSatu(newTx.transaksi_id);
      if (!segar) return perbarui(true);
      const kunci = (it: TransaksiItemBal) => String(it.no_bal).toUpperCase();
      const target = new Set(noBal.map((n) => n.toUpperCase()));
      const hilang = [...target].filter((k) => !(segar.items || []).some((it) => kunci(it) === k));
      if (hilang.length > 0) throw new Error(`Bal ${hilang.join(', ')} sudah dihapus atau diganti nomornya di Sortir (Kupon ${newTx.no_kupon}); berat tidak disimpan`);
      const dariLayar = new Map((mergeKuponParalel(newTx, segar, { incomingDariServer: true }).items || []).map((it) => [kunci(it), it]));
      const items = (segar.items || []).map((it) => (target.has(kunci(it)) ? { ...(dariLayar.get(kunci(it)) ?? it), item_id: it.item_id } : it));
      return this.updateTimbangTransaksi(hitungUlangKupon(segar, items));
    };

    let terakhir: TransaksiPembelian;
    if (!oldTx) {
      terakhir = await buatBaru(true);
    } else if (lunasBaru) {
      // Bal yang baru ditimbang harus sudah di server sebelum dibayar (antrean bisa menggabung simpanan).
      // Kegagalan langkah ini tidak boleh menahan pelunasan; antrean memeriksanya lagi sesudahnya.
      try {
        terakhir = await perbarui(true);
      } catch (err) {
        console.warn('Daftar bal belum terkirim sebelum pelunasan, dilanjutkan ke pelunasan:', err);
        terakhir = newTx;
      }
    } else if (options?.hanyaTimbang?.length) {
      terakhir = await timbangSaja(options.hanyaTimbang);
    } else {
      terakhir = await perbarui(true);
    }

    if (lunasBaru) {
      const metode = (newTx.metode_pembayaran === 'cash' || newTx.metode_pembayaran === 'kredit')
        ? newTx.metode_pembayaran
        : 'cash';
      const dibayar = await this.bayarTransaksi(newTx.transaksi_id, metode, 'PMK-01', newTx.catatan_kasir);
      // Jawaban pelunasan tidak selalu memuat daftar bal; pakai yang terakhir diterima agar bisa diverifikasi
      if ((!dibayar.items || dibayar.items.length === 0) && terakhir.items && terakhir.items.length > 0 && terakhir !== newTx) {
        dibayar.items = terakhir.items;
      }
      terakhir = dibayar;
    }

    return { syncedTx: terakhir, fromBackend: true };
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

    return pulihkanStatusSampleLama({
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
    });
  }

  public static async getBarangList(): Promise<{ data: Barang[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any[]>('/barang');
        if (res.status === 'success' && Array.isArray(res.data)) {
          const dariServer = res.data.map((b) => this.mapBackendBarang(b));
          // Status bal yang diubah di perangkat ini dan belum sampai ke server tetap dipakai; bal milik kupon yang sedang dihapus disembunyikan
          // Bal yang baru disortir belum ada di server sampai kuponnya dibayar, tetapi sudah terkumpul dan harus tetap tampil
          const mapped = lengkapiBalDariKupon(overlayBarang(dariServer), loadTransaksiData());
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
          const mapped = overlayHargaBeli(res.data);
          saveHargaData(mapped);
          return { data: mapped, fromBackend: true };
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
          const mapped = overlayUser(res.data);
          saveUserData(mapped);
          return { data: mapped, fromBackend: true };
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
          const mapped = overlayHargaJual(res.data);
          saveHargaJualData(mapped);
          return { data: mapped, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil harga jual dari API:', err);
    }
    return { data: loadHargaJualData(), fromBackend: false };
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
      // Nama pengirim yang diketik di layar; kolom dikirim_oleh di server berisi ID akun pembuat
      dikirim_oleh: b.dikirim_oleh_nama || '',
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
    const nettoJualMap: Record<string, number> = {};
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
      // Netto jual hanya ada bila server menyimpannya; selain itu nilai memakai bruto kirim
      const nettoJual = Number(it.netto_jual_kg ?? 0);
      totalNilai += (nettoJual > 0 ? nettoJual : berat) * hargaDeal;

      if (barangId) {
        // Hanya berat kirim yang benar-benar disimpan server; tanpa itu tampilan memakai bruto bal (lihat beratKirim.ts)
        if (it.berat_kirim_kg !== null && it.berat_kirim_kg !== undefined) beratKirimMap[barangId] = Number(it.berat_kirim_kg);
        if (nettoJual > 0) nettoJualMap[barangId] = nettoJual;
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
      aturan_netto: Array.isArray(p.aturan_netto) && p.aturan_netto.length > 0 ? p.aturan_netto : undefined,
      barang_ids: barangIds,
      total_bal: Number(p.total_bal) || items.length,
      total_berat_kg: Number(p.total_berat_kg) || totalBerat,
      total_nilai_deal: Number(p.total_nilai_deal) || totalNilai,
      harga_deal_map: Object.keys(hargaDealMap).length ? hargaDealMap : undefined,
      kode_harga_jual_map: Object.keys(kodeHargaJualMap).length ? kodeHargaJualMap : undefined,
      berat_kirim_map: Object.keys(beratKirimMap).length ? beratKirimMap : undefined,
      netto_jual_map: Object.keys(nettoJualMap).length ? nettoJualMap : undefined,
    };
  }

  /**
   * Gabungkan data DO dari server ke data lokal. Server menjadi acuan untuk semua nilai yang dikirimnya, termasuk
   * null (dikosongkan di perangkat lain); rincian yang tidak disimpan server (petugas, rincian grade) tetap memakai
   * data lokal. Hanya string kosong, 0, dan daftar kosong dari server yang diabaikan.
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
        v === undefined || v === '' ||
        (typeof v === 'number' && v === 0) ||
        (Array.isArray(v) && v.length === 0);
      if (!kosong) (hasil as any)[k] = v;
    });
    // Berat kirim, netto jual, dan aturan potongan disimpan server (versi baru) dan menjadi acuan, supaya
    // Surat Jalan yang diubah di komputer lain terlihat sama di sini. Server lama yang belum menyimpannya
    // tidak mengirim nilai ini, dan hanya saat itulah salinan lokal dipakai.
    const punya = (m?: Record<string, number>) => Boolean(m && Object.keys(m).length > 0);
    if (!punya(server.berat_kirim_map) && punya(lokal.berat_kirim_map)) {
      hasil.berat_kirim_map = lokal.berat_kirim_map;
      if (lokal.total_berat_kg) hasil.total_berat_kg = lokal.total_berat_kg;
    }
    if (!punya(server.netto_jual_map) && punya(lokal.netto_jual_map)) {
      hasil.netto_jual_map = lokal.netto_jual_map;
      if (lokal.total_nilai_deal) hasil.total_nilai_deal = lokal.total_nilai_deal;
    }
    if (!server.aturan_netto && lokal.aturan_netto) hasil.aturan_netto = lokal.aturan_netto;
    return hasil;
  }

  /**
   * Gabungkan batch sample dari server ke data lokal. Semua kolom yang disimpan server menjadi acuan, termasuk yang
   * dikosongkan atau dicabut di perangkat lain (tanda sudah DO, alasan tolak, harga deal, catatan); dulu salinan
   * lokal menang bila nilai server kosong, sehingga tiap komputer menampilkan isinya sendiri dan simpanan berikutnya
   * menulis nilai basi itu balik ke server. Dari salinan lokal hanya rincian bal yang tidak dikirim server.
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
        status_item: sv.status_item,
        harga_tawaran_kg: sv.harga_tawaran_kg,
        harga_deal_kg: sv.harga_deal_kg,
        kode_harga_jual: sv.kode_harga_jual,
        alasan_tolak: sv.alasan_tolak,
        catatan_nego: sv.catatan_nego,
        tanggal_evaluasi: sv.tanggal_evaluasi,
        sudah_dikirim_do: sv.sudah_dikirim_do,
      };
    });
    const disetujui = items.filter((it) => it.status_item === 'disetujui');
    return {
      ...lokal,
      batch_id: server.batch_id || lokal.batch_id,
      // Server lama mengabaikan No. Surat Sample yang diketik dan membuat nomor sendiri (BATCH-YYYYMMDD-xxxx);
      // nomor otomatis itu tidak boleh menggantikan nomor yang diketik operator.
      kode_batch: /^BATCH-[0-9]{8}-[0-9a-f]+$/i.test(server.kode_batch || '') && lokal.kode_batch
        ? lokal.kode_batch
        : server.kode_batch || lokal.kode_batch,
      tujuan_buyer: server.tujuan_buyer || lokal.tujuan_buyer,
      permintaan_buyer: server.permintaan_buyer,
      tanggal_kirim: server.tanggal_kirim || lokal.tanggal_kirim,
      dikirim_oleh: server.dikirim_oleh || lokal.dikirim_oleh,
      status: statusSetelahSinkron(lokal.status, server.status),
      tanggal_respon: server.tanggal_respon,
      petugas_qc_pabrik: server.petugas_qc_pabrik,
      catatan: server.catatan,
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

  public static async getBatchSampleList(): Promise<{ data: BatchPengirimanSample[]; fromBackend: boolean }> {
    try {
      const isOnline = await this.isBackendOnline();
      if (isOnline) {
        const res = await api.get<any[]>('/sample-batch');
        if (res.status === 'success' && Array.isArray(res.data)) {
          // Ada batch berstatus Draft di server: server ini menyimpan Draft, jadi statusnya menjadi acuan
          if (res.data.some((b: any) => b?.status === 'draft')) tandaiServerKenalDraft(true);
          const lokal = loadBatchSampleData();
          const mapped = res.data.map((b: any) => {
            const server = this.mapBackendBatchSample(b);
            const cocok = lokal.find((l) => l.batch_id === server.batch_id || l.kode_batch === server.kode_batch);
            return this.gabungBatchServer(cocok, server);
          });
          // Batch yang dihapus atau diubah di perangkat ini dan belum sampai ke server tidak boleh muncul lagi / kembali ke isi lama
          const gabungan = overlayBatchSample(mapped);
          saveBatchSampleData(gabungan);
          return { data: gabungan, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil batch sample dari API, memakai fallback lokal:', err);
    }
    return { data: loadBatchSampleData(), fromBackend: false };
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
          const gabungan = overlayPengiriman(mapped);
          savePengirimanData(gabungan);
          return { data: gabungan, fromBackend: true };
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil data pengiriman dari API, memakai fallback lokal:', err);
    }
    return { data: loadPengirimanData(), fromBackend: false };
  }

}
