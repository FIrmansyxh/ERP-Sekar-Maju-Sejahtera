export interface Petani {
  petani_id: string; // Auto generated: PTN-YYYY-XXX e.g., 'PTN-2026-001'
  nama_petani: string; // required
  no_hp: string; // numeric phone number
  alamat: string; // required address/area
  status_aktif: boolean; // default true
  alasan_nonaktif?: string;
  desa_kecamatan?: string; // optional area
  tanggal_daftar?: string; // YYYY-MM-DD
  catatan?: string;
  statistik?: {
    total_setoran_bal?: number;
    total_berat_kg?: number;
    kunjungan_terakhir?: string;
    grade_dominan?: string;
  };
}

export type UserRole = 
  | 'superadmin' 
  | 'admin_sortir'
  | 'admin_timbang' 
  | 'admin_kasir'
  | 'admin_pengiriman' 
  | 'kepala_gudang';

export interface User {
  user_id: string; // e.g. "USR-001"
  username: string; // e.g. "superadmin", "operator"
  password?: string; // stored for local desktop auth
  nama_lengkap: string; // e.g. "Bambang Sutrisno, S.T."
  role: UserRole;
  email?: string;
  no_hp?: string;
  unit_penugasan: string; // e.g. "Gudang Pusat Induk - Pamekasan"
  status_aktif: boolean;
  terakhir_login?: string;
  dibuat_pada: string;
}

export interface RolePermissionInfo {
  role: UserRole;
  label: string;
  deskripsi: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  allowedModules: string[];
  capabilities: {
    canManageUsers: boolean;
    canViewAuditLog: boolean;
    canManageMasterData: boolean;
    canCreatePetani: boolean;
    canInputTransaksi: boolean;
    canManageStok: boolean;
    canManageQC: boolean;
    canManagePengiriman: boolean;
    canViewAnalytics: boolean;
  };
}

// proses_sortir = bal sudah discan di Sortir tetapi belum ditimbang
export type StatusStokBarang = 'proses_sortir' | 'di_gudang' | 'siap_kirim' | 'keluar' | 'terkirim_sample';


export interface Barang {
  barang_id: string; // Unique ID, e.g. BAL-20260823-001
  kode_grade: string; // A, B, C, A1, A+, etc.
  no_bal: string;
  kode_bal_pembeli?: string; // Bal number
  berat_kg: number; // Netto weight in kg
  harga_per_kg?: number; // Unit price Rp / kg
  total_harga?: number; // Subtotal value = berat_kg * harga_per_kg
  berat_bruto_kg?: number; // Gross weight
  potongan_tara_kg?: number; // Tare deduction
  status_stok: StatusStokBarang;
  tanggal_masuk: string; // ISO string / YYYY-MM-DD
  tanggal_keluar?: string;
  petani_id: string;
  transaksi_pembelian_id?: string;
  nama_petani?: string;
  desa_kecamatan?: string;
  catatan?: string;
}

export interface MasterHargaJual {
  harga_jual_id: string; // e.g. "HJ-001"
  kode: string; // e.g. "HJ-45", "HJ-43", "HJ-A-SUPER"
  harga_jual: number; // e.g. 45000, 43000
  tanggal_berlaku: string; // YYYY-MM-DD
  status_aktif?: boolean;
}

export interface TabelHarga {
  harga_id: string;
  kode_grade: string; // e.g. A, B, C, A1, A+, AB (max 3 chars, 1st is letter)
  nama_grade: string; // e.g. "Grade A Super (Top Leaves)"
  warna_badge: string;
  harga_per_kg: number; // e.g. 140000
  harga_jual_per_kg?: number;
  rate_potongan_per_bal?: number; // Rp 2.000 / bal
  rate_potongan_per_10kg?: number; // legacy alias
  berat_standar_kg?: number;
  tanggal_berlaku: string; // YYYY-MM-DD
  tanggal_berakhir?: string;
  status: 'aktif' | 'nonaktif';
  dibuat_oleh: string;
  deskripsi?: string;
}

export interface KuponAntrian {
  kupon_id: string;
  nomor_kupon: string; // e.g. "KUP001" or "A-01"
  petani_id: string;
  nama_petani: string;
  waktu_kedatangan: string;
  status: 'menunggu' | 'dipanggil' | 'selesai' | 'batal';
}

export interface TransaksiItemBal {
  item_id: string;
  no_bal: string;
  kode_bal_pembeli?: string;
  barcode?: string; // Barcode fisik unik hasil scan
  kode_grade: string;
  harga_per_kg: number;
  ganti_tikar?: boolean; // true = potongan nominal rupiah diaktifkan; tidak mengubah potongan tara berat
  berat_bruto_kg?: number; // Berat kotor timbangan saat proses 2
  potongan_tara_kg?: number; // SB = 2kg rata; selain SB: <=49kg=3kg, 50-59kg=5kg, >=60kg=6kg
  is_netto_manual?: boolean; // True jika berat netto diinput/diedit secara manual
  berat_kg: number; // Berat netto final (0 jika belum ditimbang di proses 2)
  potongan_kuli?: number; // Rp 7.000 per bal
  potongan_tali?: number; // Rp 3.000 per bal
  potongan_tikar?: number; // Rp 75.000 jika ganti tikar, 0 jika tidak
  potongan: number; // Total potongan per bal
  total_kotor: number; // berat_kg * harga_per_kg
  subtotal_bersih: number; // total_kotor - potongan
  status_timbang?: 'menunggu_timbang' | 'selesai_timbang';
  lokasi_simpan?: string;
  sample_label_code?: string; // Kode barcode sample identik
  sample_label_printed?: boolean;
  barang_id?: string;
  catatan?: string;
}

export interface TransaksiPembelian {
  transaksi_id: string; // e.g. TRX-20260823-001
  no_kupon: string; // No Kupon antrian (e.g. KUP001)
  petani_id: string;
  nama_petani: string;
  no_hp?: string;
  desa_kecamatan?: string;
  no_bal: string;
  kode_bal_pembeli?: string; // summary of bal numbers or single bal
  kode_grade: string; // primary grade or 'Multi-Grade'
  total_bal?: number; // total bal count in transaction
  bal_selesai_timbang?: number; // total bal yang sudah ditimbang
  items?: TransaksiItemBal[]; // batch intake items
  barang_ids?: string[];
  jenis_timbang: 'bruto' | 'netto';
  berat_terukur_kg: number;
  potongan_tara_kg: number; // total tara berat kg
  berat_kg: number; // Berat Netto Final (calculated)
  harga_per_kg: number; // Snapshot harga saat transaksi
  rate_potongan_per_10kg?: number;
  total_kotor?: number;
  potongan_kuli: number; // Rp 7.000 per bal
  potongan_tali?: number; // Rp 3.000 per bal
  potongan_tikar: number; // Rp 75.000 per bal jika ganti tikar
  total_potongan: number; // potongan_kuli + potongan_tali + potongan_tikar
  pajak?: number; // PPH 22 / potongan pajak jika ada
  total_harga_beli: number; // berat_kg * harga_per_kg
  harga_final: number; // Jumlah Bayar = total_harga_beli - total_potongan
  status_transaksi: 'lengkap' | 'menunggu';
  status_tahap?: 'proses_sortir' | 'menunggu_timbang' | 'lengkap';
  status_pembayaran?: 'lunas' | 'belum_lunas';
  metode_pembayaran?: 'cash' | 'kredit';
  no_bukti_kas?: string;
  catatan_kasir?: string;
  dibayar_pada?: string;
  dibayar_oleh?: string;
  status_nota?: 'belum_cetak' | 'sudah_cetak';
  dicetak_pada?: string;
  dicetak_oleh?: string;
  unduh_nota_count?: number;
  tanggal_transaksi: string; // YYYY-MM-DD
  operator_nama: string;
  petugas_sortir?: string;
  petugas_timbang?: string;
  barang_id_terkait?: string;
  barcode_terkait?: string;
  catatan_qc?: string;
  catatan?: string;
  terakhir_diubah_oleh?: string;
  terakhir_diubah_pada?: string;
  alasan_perubahan_terakhir?: string;
}

/** Opsi tambahan saat menyimpan transaksi pembelian */
export interface SaveTransaksiMeta {
  /** Tanpa notifikasi toast, mis. simpan otomatis per bal di Sortir */
  silent?: boolean;
  /** Catatan audit khusus yang menggantikan catatan audit umum */
  audit?: { aksi: string; deskripsi: string; rincian_perubahan?: string[] };
  /** Audit sudah dicatat sendiri oleh pemanggil */
  skipAudit?: boolean;
  /** Simpan via PUT /transaksi/{id}/koreksi (Kasir Edit Modal) */
  koreksi?: boolean;
}

export type StatusSample ='sample' | 'dikirim' | 'diterima' | 'disetujui' | 'ditolak' | 'nego';

export type StatusBatchSample = 'sample' | 'diproses' | 'dikirim' | 'dibatalkan' | 'selesai';

export interface SampleItemDetail {
  sample_item_id: string; // e.g. SMP-001
  barang_id: string;
  no_bal: string;
  kode_bal_pembeli?: string;
  kode_grade: string;
  kode_harga_jual?: string; // Dropdown sumber Master Harga Jual
  berat_bal_kg: number; // Netto weight in kg
  berat_bruto_kg?: number; // Bruto weight in kg
  potongan_tara_kg?: number; // Tara weight in kg
  berat_sample_gram?: number;
  harga_beli_kg?: number; // Harga beli per kg
  harga_tawaran_kg: number; // Unit price offered (Rp/kg)
  harga_deal_kg?: number; // Final agreed price (Rp/kg)
  status_item: StatusSample;
  alasan_tolak?: string; // Reason if rejected
  catatan_nego?: string; // Notes for price negotiation / counter offer
  tanggal_evaluasi?: string;
  nama_petani?: string;
  sudah_dikirim_do?: boolean; // True if DO / Delivery Order has been created
  no_surat_jalan_do?: string; // SJ reference
}

export interface BatchPengirimanSample {
  batch_id: string; // e.g. SMP-BATCH-20260901-001
  kode_batch: string;
  tujuan_buyer: string;
  is_locked?: boolean; // e.g. PT Djarum Kudus - Lab QC & R&D
  permintaan_buyer?: string; // Description of requested grade / price range
  sumber_gudang: string; // Warehouse source
  tanggal_kirim: string;
  tanggal_respon?: string;
  status: StatusBatchSample;
  dikirim_oleh: string;
  petugas_qc_pabrik?: string;
  catatan?: string;
  items: SampleItemDetail[];
  total_sample_bal: number;
  total_bal_disetujui: number;
  total_bal_ditolak: number;
  total_bal_nego: number;
  total_estimasi_nilai: number; // Estimated value of offered items
  total_nilai_deal: number; // Final value of approved/deal items
}

export interface PengirimanSample {
  sample_id: string;
  batch_id?: string;
  barang_id?: string;
  barcode_sumber?: string;
  no_bal?: string;
  kode_grade: string;
  sumber: string; // e.g. Gudang Utama Pamekasan
  tujuan: string; // e.g. PT Djarum Kudus - Lab QC
  berat_sample_gram: number;
  berat_bal_kg?: number;
  berat_bruto_kg?: number;
  potongan_tara_kg?: number;
  harga_beli_kg?: number;
  harga_tawaran_kg?: number;
  harga_deal_kg?: number;
  tanggal_kirim: string;
  tanggal_respon?: string;
  status: StatusSample;
  alasan_tolak?: string;
  catatan_nego?: string;
  catatan?: string;
  dikirim_oleh: string;
  nama_petani?: string;
  sudah_dikirim_do?: boolean;
  no_surat_jalan_do?: string;
  permintaan_buyer?: string;
}

export type StatusPengiriman = 'dimuat' | 'dalam_perjalanan' | 'diterima' | 'dikirim' | 'selesai';

export interface PengirimanBarang {
  pengiriman_id: string;
  no_surat_jalan: string; // e.g. SJ-20260823-001
  tujuan: string; // Pabrik Tujuan (e.g. PT Gudang Garam Tbk, Kediri)
  jenis_pengeluaran?: string;
  unit_produksi?: string;
  mandor_produksi?: string;
  driver_nama: string; // Nama Sopir
  plat_nomor: string; // Nomor Kendaraan
  tanggal_kirim: string;
  tanggal_diterima?: string;
  barang_ids: string[];
  barcode_list?: string[];
  total_bal: number;
  total_berat_kg: number;
  status: StatusPengiriman;
  sample_id_ref?: string;
  batch_sample_id_ref?: string;
  nomor_kontrak?: string;
  total_nilai_deal?: number;
  harga_deal_map?: Record<string, number>; // barang_id -> harga_deal_per_kg
  kode_harga_jual_map?: Record<string, string>; // barang_id -> kode_harga_jual
  berat_kirim_map?: Record<string, number>; // barang_id -> berat netto saat dikirim (kg), boleh beda dari data bal karena susut
  catatan?: string;
  petugas?: string;
  dibuat_oleh?: string;
  rincian_grade?: Record<string, { bal: number; kg: number }>;
}

export interface ModuleNav {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  prdStatus: 'active' | 'next' | 'planned';
  icon: string;
  description: string;
}

export interface AuditLogEntry {
  log_id: string;
  timestamp: string; // ISO string
  user_nama: string;
  user_role: string;
  modul: string;
  aksi: string; // e.g. 'TAMBAH_TRANSAKSI', 'UBAH_TRANSAKSI', 'HAPUS_TRANSAKSI', 'TIMBANG_BAL'
  target_id: string;
  deskripsi: string;
  rincian_perubahan?: string[];
}

