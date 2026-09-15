-- =============================================================================
-- SEED DATA -- mencerminkan konfigurasi RBAC & master data yang sudah ada
-- di kode frontend (Sidebar.tsx MODULES_CONFIG, rbac.ts ROLE_DEFINITIONS,
-- data/initialGudangData.ts, data/initialHargaData.ts).
-- Jalankan setelah schema.sql.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- ROLES (persis 6 role di rbac.ts -- 'admin_utama' yang muncul di sebagian kode
-- FE bukan role resmi, jangan dibuatkan baris di sini)
-- -----------------------------------------------------------------------------
INSERT INTO roles (role_code, label, deskripsi, badge_bg, badge_text, badge_border) VALUES
('superadmin','Super Admin','Akses penuh ke seluruh sistem: User management, semua master data, semua alur transaksi, pengiriman, dan seluruh laporan.','bg-red-50','text-[#b81d24]','border-red-300'),
('admin_sortir','Admin Sortir','Akses proses sortir kupon & grade mutu, master data (Petani, Harga/Kualitas, Inventaris Bal), serta modul laporan.','bg-blue-50','text-blue-800','border-blue-300'),
('admin_timbang','Admin Timbang','Akses khusus modul timbangan (input berat bruto/netto).','bg-amber-50','text-amber-800','border-amber-300'),
('admin_kasir','Admin Kasir','Akses khusus proses Pembelian (Kasir/Nota, Timbangan, Sortir) dan seluruh Laporan & Analitik.','bg-teal-50','text-teal-800','border-teal-300'),
('admin_pengiriman','Admin Pengiriman','Akses seluruh modul operasional terkait pengiriman: Pengiriman Reguler (DO), Pengiriman Sample, serta Laporan Pengiriman & DO Pabrik.','bg-emerald-50','text-emerald-800','border-emerald-300'),
('kepala_gudang','Kepala Gudang','Akses pimpinan operasional: membuka semua modul laporan dan dashboard analitik eksekutif.','bg-purple-50','text-purple-800','border-purple-300');

-- -----------------------------------------------------------------------------
-- MODULES (id dipertahankan sama persis dengan Sidebar.tsx MODULES_CONFIG)
-- -----------------------------------------------------------------------------
INSERT INTO modules (module_id, group_name, title, subtitle, icon, sort_order) VALUES
('modul-home','root','Home','Dasbor Menu Utama','Home',0),
('modul-6-dashboard-analytic','report','Dashboard Laporan & Analytic ERP','Executive Summary & Audit','BarChart3',1),
('modul-6-laporan-bal','report','Laporan Bal','Detail Bal, Berat, Harga & Status','Package',2),
('modul-6-laporan-kode-bal','report','Laporan Kode Bal','Analisa Kode Bal','PackageSearch',3),
('modul-6-laporan-grade','report','Laporan Mutu Grade','Stok, Intake & Valuasi per Grade','Award',4),
('modul-6-laporan-pembelian','report','Laporan Pembelian Barang','Filter Dinamis & Unduh Rekap','FileSpreadsheet',5),
('modul-6-laporan-petani','report','Laporan Petani & Setoran','Rekapitulasi Penyetor & Nilai Pembelian','Users',6),
('modul-6-laporan-pengiriman','report','Laporan Pengiriman & DO','Distribusi Pabrik & Realisasi Tonase','Truck',7),
('modul-1-petani','master-data','Master Petani','Registrasi & Kartu Petani','Users',8),
('modul-3-harga','master-data','Master Harga Beli','Kode & Harga Beli','Tag',9),
('modul-3-harga-jual','master-data','Master Harga Jual','Kode, Harga Jual & Tgl Berlaku','DollarSign',10),
('modul-2-barang','master-data','Inventaris Bal Gudang','Stok Fisik & Label Thermal','Package',11),
('modul-0-sortir','pembelian','Sortir','Input Kupon & Mutu Grade','Layers',12),
('modul-0-timbangan','pembelian','Timbangan','Input Berat Bruto & Netto','Scale',13),
('modul-0-kasir','pembelian','Kasir','Data Pembelian & Cetak Nota','DollarSign',14),
('modul-0-transaksi','pembelian','Transaksi Pembelian','Timbang Bal & Kupon','Scale',15),
('modul-5-pengiriman','pengiriman','Pengiriman Reguler (DO)','Surat Jalan ke Pabrik','Truck',16),
('modul-4-sample','pengiriman','Pengiriman Sample','Uji Mutu Laboratorium','FlaskConical',17),
('modul-status-batch','pengiriman','Status & Detail Batch','Sortir Pembeli & Status DO','Layers',18),
('modul-users','root','Manajemen Pengguna','Hak Akses & Otorisasi RBAC','UserCheck',19);

-- -----------------------------------------------------------------------------
-- ROLE_MODULE_ACCESS (persis allowedModules per role di rbac.ts)
-- -----------------------------------------------------------------------------
INSERT INTO role_module_access (role_code, module_id) VALUES
-- superadmin: semua modul
('superadmin','modul-home'),('superadmin','modul-6-dashboard-analytic'),('superadmin','modul-6-laporan-bal'),
('superadmin','modul-6-laporan-kode-bal'),('superadmin','modul-6-laporan-grade'),('superadmin','modul-6-laporan-pembelian'),
('superadmin','modul-6-laporan-petani'),('superadmin','modul-6-laporan-pengiriman'),('superadmin','modul-1-petani'),
('superadmin','modul-3-harga'),('superadmin','modul-3-harga-jual'),('superadmin','modul-2-barang'),
('superadmin','modul-0-sortir'),('superadmin','modul-0-timbangan'),('superadmin','modul-0-kasir'),
('superadmin','modul-0-transaksi'),('superadmin','modul-5-pengiriman'),('superadmin','modul-4-sample'),
('superadmin','modul-status-batch'),('superadmin','modul-users'),
-- admin_sortir
('admin_sortir','modul-home'),('admin_sortir','modul-0-sortir'),('admin_sortir','modul-1-petani'),
('admin_sortir','modul-3-harga'),('admin_sortir','modul-3-harga-jual'),('admin_sortir','modul-2-barang'),
('admin_sortir','modul-6-dashboard-analytic'),('admin_sortir','modul-6-laporan-bal'),('admin_sortir','modul-6-laporan-kode-bal'),
('admin_sortir','modul-6-laporan-grade'),('admin_sortir','modul-6-laporan-pembelian'),('admin_sortir','modul-6-laporan-petani'),
('admin_sortir','modul-6-laporan-pengiriman'),
-- admin_timbang
('admin_timbang','modul-home'),('admin_timbang','modul-0-timbangan'),
-- admin_kasir
('admin_kasir','modul-home'),('admin_kasir','modul-0-kasir'),('admin_kasir','modul-0-transaksi'),
('admin_kasir','modul-0-timbangan'),('admin_kasir','modul-0-sortir'),('admin_kasir','modul-6-dashboard-analytic'),
('admin_kasir','modul-6-laporan-bal'),('admin_kasir','modul-6-laporan-kode-bal'),('admin_kasir','modul-6-laporan-grade'),
('admin_kasir','modul-6-laporan-pembelian'),('admin_kasir','modul-6-laporan-petani'),('admin_kasir','modul-6-laporan-pengiriman'),
-- admin_pengiriman
('admin_pengiriman','modul-home'),('admin_pengiriman','modul-5-pengiriman'),('admin_pengiriman','modul-4-sample'),
('admin_pengiriman','modul-status-batch'),('admin_pengiriman','modul-3-harga-jual'),('admin_pengiriman','modul-6-laporan-pengiriman'),
-- kepala_gudang
('kepala_gudang','modul-home'),('kepala_gudang','modul-status-batch'),('kepala_gudang','modul-6-dashboard-analytic'),
('kepala_gudang','modul-6-laporan-bal'),('kepala_gudang','modul-6-laporan-kode-bal'),('kepala_gudang','modul-6-laporan-grade'),
('kepala_gudang','modul-6-laporan-pembelian'),('kepala_gudang','modul-6-laporan-petani'),('kepala_gudang','modul-6-laporan-pengiriman');

-- -----------------------------------------------------------------------------
-- ROLE_CAPABILITIES (persis capabilities{} per role di rbac.ts)
-- -----------------------------------------------------------------------------
INSERT INTO role_capabilities (role_code, can_manage_users, can_view_audit_log, can_manage_master_data, can_create_petani, can_input_transaksi, can_manage_stok, can_manage_qc, can_manage_pengiriman, can_view_analytics) VALUES
('superadmin',      true,  true,  true,  true,  true,  true,  true,  true,  true),
('admin_sortir',     false, false, true,  true,  true,  true,  true,  false, true),
('admin_timbang',    false, false, false, false, true,  false, false, false, false),
('admin_kasir',      false, false, false, false, true,  false, false, false, true),
('admin_pengiriman', false, false, false, false, false, false, false, true,  false),
('kepala_gudang',    false, false, false, false, false, false, false, false, true);

-- -----------------------------------------------------------------------------
-- MASTER GUDANG (persis data/initialGudangData.ts)
-- -----------------------------------------------------------------------------
INSERT INTO gudang (gudang_id, kode_gudang, nama_gudang, alamat, kapasitas_bal, kepala_gudang, kontak, status_aktif, deskripsi) VALUES
('PMK-01','PMK-01','Gudang Utama Pamekasan','Jl. Raya Pamekasan - Sumenep KM 4, Pamekasan, Madura',10000,'Ahmad Fauzi, S.P.','0812-3456-7801',true,'Gudang Penerimaan Utama & Sortir Tembakau Pamekasan'),
('PMK-02','PMK-02','Gudang Produksi Rokok','Kawasan Industri Tembakau Pamekasan Blok C, Madura',5000,'Bambang Supriyanto','0812-3456-7802',true,'Gudang Pengolahan & Bahan Baku Produksi Rokok'),
('SMP-01','SMP-01','Gudang Sumenep','Jl. Trunojoyo No. 88, Sumenep, Madura',6000,'H. Subhan','0812-3456-7803',true,'Gudang Penyangga & Penampungan Wilayah Sumenep');

-- -----------------------------------------------------------------------------
-- GRADE MASTER + HARGA BELI AWAL (persis data/initialHargaData.ts: grade 30-70,
-- Rp 1.000/kg naik per grade, semua aktif sejak 2022-06-01)
-- -----------------------------------------------------------------------------
INSERT INTO grade_master (kode_grade, nama_grade, warna_badge)
SELECT g::text, 'Grade ' || g, 'zinc'
FROM generate_series(30, 70) AS g;

INSERT INTO tabel_harga (harga_id, kode_grade, harga_per_kg, tanggal_berlaku, status, dibuat_oleh, deskripsi)
SELECT 'HB-' || g::text, g::text, (g * 1000)::numeric, DATE '2022-06-01', 'aktif', NULL, 'Seed awal migrasi dari data demo frontend'
FROM generate_series(30, 70) AS g;

COMMIT;

-- Catatan: user default (superadmin dkk.) SENGAJA TIDAK di-seed di sini karena
-- password harus di-hash (bcrypt/argon2) oleh aplikasi backend saat pembuatan
-- akun pertama kali (jangan taruh hash password statis di file SQL yang di-commit
-- ke git). Buat superadmin pertama lewat script/endpoint setup terpisah.
