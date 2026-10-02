/**
 * Data yang dimuat per menu (permintaan pemilik 2026-10-02: perangkat hanya memuat data menu yang sedang dibuka).
 *
 * Saat login, saat pindah menu, dan berkala selama menu terbuka, hanya daftar di sini yang diminta ke server; daftar
 * menu lain tidak dimuat sampai menunya dibuka (layar memakai salinan terakhir di perangkat). Angka di menu samping
 * memakai `ringkasan` (jumlah saja, selalu ikut). Isi setiap menu harus mencakup SEMUA daftar yang dipakai komponennya
 * (lihat App.tsx), kalau tidak perangkat baru akan melihat daftar kosong.
 */
export type JenisData =
  | 'petani'
  | 'kupon'
  | 'bal'
  | 'hargaBeli'
  | 'hargaJual'
  | 'pengguna'
  | 'batchSample'
  | 'suratJalan'
  | 'riwayatNoBal'
  | 'ringkasan';

// Bal gudang yang dibentuk dari kupon memakai No Bal terakhir (riwayat Koreksi No Bal), dan Sortir menolak nomor lama
const PEMBELIAN: JenisData[] = ['petani', 'kupon', 'bal', 'hargaBeli', 'riwayatNoBal'];

export const DATA_MENU: Record<string, JenisData[]> = {
  'modul-home': [],
  'modul-6-dashboard-analytic': ['kupon', 'bal', 'hargaBeli', 'hargaJual', 'batchSample', 'suratJalan'],
  'modul-6-laporan-bal': ['petani', 'kupon', 'bal', 'hargaBeli', 'riwayatNoBal'],
  'modul-6-laporan-grade': ['kupon', 'bal', 'hargaBeli', 'hargaJual', 'suratJalan'],
  'modul-6-laporan-pembelian': ['petani', 'kupon'],
  'modul-6-laporan-petani': ['petani', 'kupon', 'bal'],
  'modul-6-laporan-pengiriman': ['bal', 'suratJalan'],
  'modul-6-laporan-sample': ['bal', 'batchSample'],
  'modul-1-petani': ['petani', 'kupon'],
  'modul-3-harga': ['hargaBeli'],
  'modul-3-harga-jual': ['hargaJual'],
  'modul-master-potongan': [],
  'modul-0-sortir': PEMBELIAN,
  'modul-0-timbangan': PEMBELIAN,
  'modul-0-kasir': PEMBELIAN,
  'modul-0-transaksi': PEMBELIAN,
  'modul-koreksi-no-bal': ['kupon', 'bal', 'batchSample', 'suratJalan', 'riwayatNoBal'],
  'modul-4-sample': [...PEMBELIAN, 'hargaJual', 'batchSample'],
  'modul-5-pengiriman': [...PEMBELIAN, 'hargaJual', 'batchSample', 'suratJalan'],
  // Kupon dipakai untuk menolak Surat Jalan Selesai bila ada kupon bal yang belum lunas
  'modul-status-batch': ['kupon', 'bal', 'hargaJual', 'batchSample', 'suratJalan'],
  'modul-users': ['pengguna'],
};

/**
 * Daftar yang ikut diubah di layar oleh tiap jenis perubahan antrean (services/antrianMutasi.ts). Bila server menolak
 * atau datanya sudah dihapus di perangkat lain, daftar ini dimuat ulang PAKSA (tanpa ETag): server tidak berubah
 * sehingga ETag akan menjawab "tidak berubah", padahal layar di perangkat ini sudah terlanjur berubah.
 */
export const DATA_ENTITAS: Record<string, JenisData[]> = {
  transaksi: ['kupon', 'bal'],
  barang: ['bal'],
  batch_sample: ['batchSample', 'bal'],
  pengiriman: ['suratJalan', 'bal', 'batchSample'],
  no_bal: ['bal', 'batchSample', 'riwayatNoBal', 'kupon'],
  petani: ['petani'],
  harga_beli: ['hargaBeli'],
  harga_jual: ['hargaJual'],
  user: ['pengguna'],
};

/** Daftar yang dimuat untuk satu menu, selalu ditambah ringkasan jumlah untuk menu samping. */
export const dataUntukMenu = (modul: string): JenisData[] => [...(DATA_MENU[modul] ?? []), 'ringkasan'];

/** Menu laporan hanya dimuat saat dibuka atau tombol muat ulang, tidak disegarkan berkala. */
export const menuLaporan = (modul: string): boolean => modul.startsWith('modul-6-');
