-- =============================================================================
-- ERP SEKAR MAJU SEJAHTERA — SKEMA DATABASE RELASIONAL (PostgreSQL 16+)
-- =============================================================================
-- Menggantikan persistensi in-memory di src/utils/storage.ts (saat ini SEMUA
-- data bisnis non-user hilang setiap refresh browser -- lihat catatan audit).
--
-- Perbaikan desain relatif terhadap model data frontend (types/index.ts),
-- berdasarkan audit alur kode aktual:
--   1. Header transaksi TIDAK lagi menyimpan angka agregat (berat_kg, harga_per_kg,
--      potongan, dll) sebagai kolom -- itu sumber bug SUM vs AVG vs "snapshot" yang
--      tercampur di kode React. Semua dihitung via view dari transaksi_item_bal.
--   2. barang.gudang_id dibuat NOT NULL + FK sungguhan ke gudang (di frontend saat
--      ini nyaris selalu kosong, cuma lokasi_gudang teks bebas yang kepakai).
--   3. Partial unique index dipakai untuk menegakkan aturan bisnis yang di frontend
--      cuma dicek longgar di UI (kupon aktif tidak boleh dobel, 1 barang tidak boleh
--      aktif di >1 batch sample / >1 pengiriman sekaligus).
--   4. ID bisnis (TRX-, PTN-, BAL-, dst) tetap dipakai sebagai primary key karena
--      dicetak di nota/label/surat jalan fisik -- tapi generasinya dipindah ke fungsi
--      next_seq() di server (atomic), bukan digenerate tersebar di berbagai
--      komponen React seperti sekarang (ditemukan pola beda-beda & 1 bug pemanggilan
--      generateBalId di TransaksiEditModal.tsx).
--   5. Ditambahkan audit_log -- di versi frontend saat ini fitur "Audit Trail" cuma
--      ada di teks deskripsi role, implementasinya sudah dikosongkan (lihat App.tsx).
--   6. role_code 'admin_utama' yang dicek di beberapa komponen FE (HargaManagement,
--      PengirimanManagement, KasirPageView) TIDAK pernah ada di 6 role resmi --
--      saat integrasi backend, ganti pengecekan itu ke 'superadmin'.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------
CREATE TYPE user_role              AS ENUM ('superadmin','admin_sortir','admin_timbang','admin_kasir','admin_pengiriman','kepala_gudang');
CREATE TYPE status_stok_barang     AS ENUM ('di_gudang','siap_kirim','keluar','terkirim_sample');
CREATE TYPE status_transaksi_enum AS ENUM ('lengkap','menunggu');
CREATE TYPE status_tahap_enum     AS ENUM ('proses_sortir','menunggu_timbang','lengkap');
CREATE TYPE status_pembayaran_enum AS ENUM ('lunas','belum_lunas');
CREATE TYPE metode_pembayaran_enum AS ENUM ('cash','kredit');
CREATE TYPE status_nota_enum      AS ENUM ('belum_cetak','sudah_cetak');
CREATE TYPE status_timbang_enum   AS ENUM ('menunggu_timbang','selesai_timbang');
CREATE TYPE status_harga_enum     AS ENUM ('aktif','nonaktif');
CREATE TYPE status_sample_enum    AS ENUM ('sample','dikirim','diterima','disetujui','ditolak','nego');
CREATE TYPE status_batch_sample_enum AS ENUM ('sample','diproses','dikirim','dibatalkan','selesai');
CREATE TYPE status_pengiriman_enum AS ENUM ('dimuat','dalam_perjalanan','diterima','dikirim','selesai');
CREATE TYPE audit_action_enum     AS ENUM ('INSERT','UPDATE','DELETE');

-- -----------------------------------------------------------------------------
-- UTIL: auto-update kolom updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- UTIL: generator ID bisnis atomic (menggantikan generator tersebar di FE)
-- Pemakaian dari backend:  SELECT next_seq('TRX-08092026');
-- -----------------------------------------------------------------------------
CREATE TABLE sequence_counters (
  counter_key   VARCHAR(40) PRIMARY KEY,   -- contoh: 'TRX-08092026', 'PTN-2026', 'BAL-08092026'
  next_val      INT NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION next_seq(p_key VARCHAR) RETURNS INT AS $$
DECLARE v INT;
BEGIN
  INSERT INTO sequence_counters(counter_key, next_val) VALUES (p_key, 2)
  ON CONFLICT (counter_key) DO UPDATE SET next_val = sequence_counters.next_val + 1
  RETURNING next_val - 1 INTO v;
  RETURN v;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RBAC: ROLES, MODULES, HAK AKSES (menggantikan hardcode di rbac.ts/Sidebar.tsx)
-- =============================================================================
CREATE TABLE roles (
  role_code     user_role PRIMARY KEY,
  label         VARCHAR(50) NOT NULL,
  deskripsi     TEXT,
  badge_bg      VARCHAR(30),
  badge_text    VARCHAR(30),
  badge_border  VARCHAR(30)
);

CREATE TABLE modules (
  module_id     VARCHAR(40) PRIMARY KEY,      -- 'modul-0-sortir', dst (id dipertahankan sama dgn FE)
  group_name    VARCHAR(40) NOT NULL,         -- 'root' | 'report' | 'master-data' | 'pembelian' | 'pengiriman'
  title         VARCHAR(80) NOT NULL,
  subtitle      VARCHAR(120),
  icon          VARCHAR(40),
  sort_order    INT NOT NULL DEFAULT 0
);

CREATE TABLE role_module_access (
  role_code     user_role NOT NULL REFERENCES roles(role_code) ON DELETE CASCADE,
  module_id     VARCHAR(40) NOT NULL REFERENCES modules(module_id) ON DELETE CASCADE,
  PRIMARY KEY (role_code, module_id)
);

CREATE TABLE role_capabilities (
  role_code               user_role PRIMARY KEY REFERENCES roles(role_code) ON DELETE CASCADE,
  can_manage_users        BOOLEAN NOT NULL DEFAULT false,
  can_view_audit_log      BOOLEAN NOT NULL DEFAULT false,
  can_manage_master_data  BOOLEAN NOT NULL DEFAULT false,
  can_create_petani       BOOLEAN NOT NULL DEFAULT false,
  can_input_transaksi     BOOLEAN NOT NULL DEFAULT false,
  can_manage_stok         BOOLEAN NOT NULL DEFAULT false,
  can_manage_qc           BOOLEAN NOT NULL DEFAULT false,
  can_manage_pengiriman   BOOLEAN NOT NULL DEFAULT false,
  can_view_analytics      BOOLEAN NOT NULL DEFAULT false
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE users (
  user_id         VARCHAR(20) PRIMARY KEY,       -- USR-XXXXXX
  username        VARCHAR(50) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,         -- bcrypt/argon2 -- JANGAN plaintext
                                                  -- (versi FE saat ini bandingkan password polos, lihat storage.ts:220)
  nama_lengkap    VARCHAR(120) NOT NULL,
  role_code       user_role NOT NULL REFERENCES roles(role_code),
  email           VARCHAR(120),
  no_hp           VARCHAR(20),
  unit_penugasan  VARCHAR(120),
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  terakhir_login  TIMESTAMPTZ,
  dibuat_pada     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- MASTER PETANI
-- =============================================================================
CREATE TABLE petani (
  petani_id       VARCHAR(20) PRIMARY KEY,      -- PTN-YYYY-XXX
  nama_petani     VARCHAR(120) NOT NULL,
  no_hp           VARCHAR(20),
  alamat          TEXT NOT NULL,
  desa_kecamatan  VARCHAR(120),
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  alasan_nonaktif TEXT,
  tanggal_daftar  DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_petani_updated BEFORE UPDATE ON petani
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX ix_petani_status ON petani(status_aktif);
CREATE INDEX ix_petani_nama ON petani USING gin (to_tsvector('simple', nama_petani));
-- Catatan: kolom statistik (total_setoran_bal, total_berat_kg, kunjungan_terakhir,
-- grade_dominan) SENGAJA TIDAK disimpan di sini -- lihat mv_petani_statistik
-- di bagian VIEWS supaya tidak ada resiko data drift seperti di versi FE.

-- =============================================================================
-- MASTER GRADE & HARGA BELI (histori harga per grade, bertanggal berlaku)
-- =============================================================================
CREATE TABLE grade_master (
  kode_grade      VARCHAR(5) PRIMARY KEY,        -- A, B, C, A1, A+, dst (referensi tunggal semua tabel lain)
  nama_grade      VARCHAR(80) NOT NULL,
  warna_badge     VARCHAR(30)
);

CREATE TABLE tabel_harga (
  harga_id                VARCHAR(30) PRIMARY KEY,   -- HRG-YYYY-GRADE-XXXX
  kode_grade              VARCHAR(5) NOT NULL REFERENCES grade_master(kode_grade),
  harga_per_kg            NUMERIC(12,2) NOT NULL,
  rate_potongan_per_bal   NUMERIC(12,2) NOT NULL DEFAULT 0,
  berat_standar_kg        NUMERIC(8,2),
  tanggal_berlaku         DATE NOT NULL,
  tanggal_berakhir        DATE,
  status                  status_harga_enum NOT NULL DEFAULT 'aktif',
  dibuat_oleh             VARCHAR(20) REFERENCES users(user_id),
  deskripsi               TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Hanya boleh ada 1 baris 'aktif' per kode_grade pada satu waktu.
CREATE UNIQUE INDEX uq_tabel_harga_aktif ON tabel_harga(kode_grade) WHERE status = 'aktif';
CREATE INDEX ix_tabel_harga_grade ON tabel_harga(kode_grade);
-- Catatan: field TabelHarga.harga_jual_per_kg di tipe FE terkonfirmasi TIDAK PERNAH
-- dibaca di manapun (dead field) -- sengaja tidak dibawa ke skema ini.

-- =============================================================================
-- MASTER HARGA JUAL (harga tawar/deal ke pabrik & buyer)
-- =============================================================================
CREATE TABLE master_harga_jual (
  harga_jual_id   VARCHAR(20) PRIMARY KEY,      -- HJ-XXX
  kode            VARCHAR(30) UNIQUE NOT NULL,  -- kode inilah yg direferensikan tabel lain (kode_harga_jual)
  harga_jual      NUMERIC(12,2) NOT NULL,
  tanggal_berlaku DATE NOT NULL,
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- MASTER GUDANG
-- =============================================================================
CREATE TABLE gudang (
  gudang_id       VARCHAR(20) PRIMARY KEY,      -- GDG-PMK-01
  kode_gudang     VARCHAR(20) UNIQUE NOT NULL,
  nama_gudang     VARCHAR(120) NOT NULL,
  alamat          TEXT,
  kapasitas_bal   INT,
  kepala_gudang   VARCHAR(120),
  kontak          VARCHAR(20),
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  deskripsi       TEXT
);

-- =============================================================================
-- TRANSAKSI PEMBELIAN -- HEADER (kupon, petani, status alur sortir->timbang->kasir)
-- =============================================================================
CREATE TABLE transaksi_pembelian (
  transaksi_id            VARCHAR(30) PRIMARY KEY,   -- TRX-DDMMYYYY-XXX
  no_kupon                VARCHAR(20) NOT NULL,
  petani_id               VARCHAR(20) NOT NULL REFERENCES petani(petani_id),
  tanggal_transaksi       DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis_timbang           VARCHAR(10) NOT NULL DEFAULT 'netto' CHECK (jenis_timbang IN ('bruto','netto')),
  status_transaksi        status_transaksi_enum NOT NULL DEFAULT 'menunggu',
  status_tahap            status_tahap_enum NOT NULL DEFAULT 'proses_sortir',
  status_pembayaran       status_pembayaran_enum NOT NULL DEFAULT 'belum_lunas',
  metode_pembayaran       metode_pembayaran_enum,
  status_nota             status_nota_enum NOT NULL DEFAULT 'belum_cetak',
  dicetak_pada            TIMESTAMPTZ,
  dicetak_oleh            VARCHAR(20) REFERENCES users(user_id),
  unduh_nota_count        INT NOT NULL DEFAULT 0,
  dibayar_pada            TIMESTAMPTZ,
  dibayar_oleh            VARCHAR(20) REFERENCES users(user_id),
  operator_user_id        VARCHAR(20) REFERENCES users(user_id),
  petugas_sortir_user_id  VARCHAR(20) REFERENCES users(user_id),
  petugas_timbang_user_id VARCHAR(20) REFERENCES users(user_id),
  catatan_kasir           TEXT,
  catatan_qc              TEXT,
  catatan                 TEXT,
  terakhir_diubah_oleh    VARCHAR(20) REFERENCES users(user_id),
  terakhir_diubah_pada    TIMESTAMPTZ,
  alasan_perubahan_terakhir TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_trx_updated BEFORE UPDATE ON transaksi_pembelian
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Fix temuan audit: kupon dobel di tahap sortir/timbang saat ini cuma diwarning,
-- tombol simpan tetap bisa ditekan. Di DB, kupon yang belum 'lengkap' wajib unik.
CREATE UNIQUE INDEX uq_kupon_aktif ON transaksi_pembelian(no_kupon) WHERE status_tahap <> 'lengkap';
CREATE INDEX ix_trx_petani ON transaksi_pembelian(petani_id);
CREATE INDEX ix_trx_tanggal ON transaksi_pembelian(tanggal_transaksi);
CREATE INDEX ix_trx_status ON transaksi_pembelian(status_tahap, status_pembayaran);

-- =============================================================================
-- TRANSAKSI ITEM BAL -- DETAIL (satu baris = satu bal, sumber kebenaran harga/berat)
-- =============================================================================
CREATE TABLE transaksi_item_bal (
  item_id             VARCHAR(30) PRIMARY KEY,
  transaksi_id        VARCHAR(30) NOT NULL REFERENCES transaksi_pembelian(transaksi_id) ON DELETE CASCADE,
  no_bal              VARCHAR(30) NOT NULL,
  kode_bal_pembeli    VARCHAR(30),
  barcode             VARCHAR(50) UNIQUE,
  kode_grade          VARCHAR(5) NOT NULL REFERENCES grade_master(kode_grade),
  harga_per_kg        NUMERIC(12,2) NOT NULL,          -- snapshot harga beli saat sortir (bukan agregat)
  ganti_tikar         BOOLEAN NOT NULL DEFAULT false,
  berat_bruto_kg      NUMERIC(8,2),
  potongan_tara_kg    NUMERIC(8,2) NOT NULL DEFAULT 0,
  is_netto_manual     BOOLEAN NOT NULL DEFAULT false,
  berat_kg            NUMERIC(8,2) NOT NULL DEFAULT 0, -- 0 = belum ditimbang (proses 2)
  potongan_kuli       NUMERIC(12,2) NOT NULL DEFAULT 7000,
  potongan_tali       NUMERIC(12,2) NOT NULL DEFAULT 3000,
  potongan_tikar      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- 75000 jika ganti_tikar = true
  potongan            NUMERIC(12,2) GENERATED ALWAYS AS (potongan_kuli + potongan_tali + potongan_tikar) STORED,
  total_kotor         NUMERIC(14,2) GENERATED ALWAYS AS (berat_kg * harga_per_kg) STORED,
  subtotal_bersih     NUMERIC(14,2) GENERATED ALWAYS AS
                        (berat_kg * harga_per_kg - (potongan_kuli + potongan_tali + potongan_tikar)) STORED,
  status_timbang      status_timbang_enum NOT NULL DEFAULT 'menunggu_timbang',
  lokasi_simpan       VARCHAR(40),
  sample_label_code   VARCHAR(30),
  sample_label_printed BOOLEAN NOT NULL DEFAULT false,
  catatan             TEXT
);
CREATE INDEX ix_item_transaksi ON transaksi_item_bal(transaksi_id);
CREATE INDEX ix_item_grade ON transaksi_item_bal(kode_grade);
CREATE INDEX ix_item_status_timbang ON transaksi_item_bal(status_timbang);

-- =============================================================================
-- BARANG / INVENTARIS GUDANG -- state saat ini, 1:1 dengan transaksi_item_bal
-- =============================================================================
CREATE TABLE barang (
  barang_id             VARCHAR(30) PRIMARY KEY,       -- BAL-DDMMYYYY-XXX-NN
  transaksi_item_id     VARCHAR(30) UNIQUE NOT NULL REFERENCES transaksi_item_bal(item_id),
  transaksi_id          VARCHAR(30) NOT NULL REFERENCES transaksi_pembelian(transaksi_id),
  petani_id             VARCHAR(20) NOT NULL REFERENCES petani(petani_id),
  kode_grade            VARCHAR(5) NOT NULL REFERENCES grade_master(kode_grade),
  no_bal                VARCHAR(30) NOT NULL,
  status_stok           status_stok_barang NOT NULL DEFAULT 'di_gudang',
  gudang_id             VARCHAR(20) NOT NULL REFERENCES gudang(gudang_id),  -- FK sungguhan, bukan teks bebas
  lokasi_blok           VARCHAR(40),                    -- mis. "Blok A", "Rak 3"
  tanggal_masuk         DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_keluar        DATE,
  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_barang_updated BEFORE UPDATE ON barang
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX ix_barang_status ON barang(status_stok);
CREATE INDEX ix_barang_gudang ON barang(gudang_id);
CREATE INDEX ix_barang_grade ON barang(kode_grade);
CREATE INDEX ix_barang_petani ON barang(petani_id);
CREATE INDEX ix_barang_no_bal ON barang(no_bal);
-- Catatan: berat_kg/harga_per_kg/total_harga TIDAK diduplikasi di sini -- selalu
-- JOIN ke transaksi_item_bal via transaksi_item_id (satu sumber kebenaran harga beli).

-- =============================================================================
-- SAMPLE BATCH -- pengiriman sample ke buyer / lab QC pabrik
-- =============================================================================
CREATE TABLE sample_batch (
  batch_id            VARCHAR(20) PRIMARY KEY,     -- SPL####
  kode_batch          VARCHAR(40) UNIQUE NOT NULL,
  tujuan_buyer        VARCHAR(120) NOT NULL,
  is_locked           BOOLEAN NOT NULL DEFAULT false,
  permintaan_buyer    TEXT,
  sumber_gudang_id    VARCHAR(20) REFERENCES gudang(gudang_id),
  tanggal_kirim       DATE NOT NULL,
  tanggal_respon      DATE,
  status              status_batch_sample_enum NOT NULL DEFAULT 'sample',
  dikirim_oleh        VARCHAR(20) REFERENCES users(user_id),
  petugas_qc_pabrik   VARCHAR(120),
  catatan             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sample_batch_status ON sample_batch(status);

CREATE TABLE sample_batch_item (
  sample_item_id    VARCHAR(20) PRIMARY KEY,        -- SMP-XXX
  batch_id          VARCHAR(20) NOT NULL REFERENCES sample_batch(batch_id) ON DELETE CASCADE,
  barang_id         VARCHAR(30) NOT NULL REFERENCES barang(barang_id),
  kode_harga_jual   VARCHAR(30) REFERENCES master_harga_jual(kode),
  berat_sample_gram NUMERIC(8,2),
  harga_tawaran_kg  NUMERIC(12,2),
  harga_deal_kg     NUMERIC(12,2),
  status_item       status_sample_enum NOT NULL DEFAULT 'sample',
  alasan_tolak      TEXT,
  catatan_nego      TEXT,
  tanggal_evaluasi  DATE,
  sudah_dikirim_do  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX ix_sample_item_batch ON sample_batch_item(batch_id);
-- Fix temuan audit §2: 1 barang cuma boleh "aktif" (belum ditolak) di 1 batch
-- sample sekaligus -- item berstatus 'ditolak' boleh dipakai ulang di batch lain
-- (mencerminkan persis logic checkBalUsage() di SampleManagement.tsx).
CREATE UNIQUE INDEX uq_sample_barang_aktif ON sample_batch_item(barang_id) WHERE status_item <> 'ditolak';

-- =============================================================================
-- PENGIRIMAN BARANG -- Surat Jalan / DO ke pabrik
-- =============================================================================
CREATE TABLE pengiriman_barang (
  pengiriman_id       VARCHAR(20) PRIMARY KEY,
  no_surat_jalan      VARCHAR(30) UNIQUE NOT NULL,
  tujuan              VARCHAR(120) NOT NULL,
  jenis_pengeluaran   VARCHAR(40),
  unit_produksi       VARCHAR(80),
  mandor_produksi     VARCHAR(80),
  driver_nama         VARCHAR(80) NOT NULL,
  plat_nomor          VARCHAR(20) NOT NULL,
  tanggal_kirim       DATE NOT NULL,
  tanggal_diterima    DATE,
  status              status_pengiriman_enum NOT NULL DEFAULT 'dimuat',
  batch_sample_id_ref VARCHAR(20) REFERENCES sample_batch(batch_id),
  nomor_kontrak       VARCHAR(40),
  catatan             TEXT,
  petugas             VARCHAR(80),
  dibuat_oleh         VARCHAR(20) REFERENCES users(user_id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_pengiriman_status ON pengiriman_barang(status);
CREATE INDEX ix_pengiriman_tanggal ON pengiriman_barang(tanggal_kirim);

CREATE TABLE pengiriman_barang_item (
  pengiriman_id     VARCHAR(20) NOT NULL REFERENCES pengiriman_barang(pengiriman_id) ON DELETE CASCADE,
  barang_id         VARCHAR(30) NOT NULL REFERENCES barang(barang_id),
  kode_harga_jual   VARCHAR(30) REFERENCES master_harga_jual(kode),
  harga_deal_per_kg NUMERIC(12,2),
  PRIMARY KEY (pengiriman_id, barang_id)
);
-- Fix temuan audit §2: PengirimanManagement.tsx saat ini TIDAK mencegah barang
-- berstatus 'terkirim_sample' ikut dipilih ke surat jalan reguler lain. Di DB,
-- satu barang_id cuma boleh nempel di SATU pengiriman aktif sepanjang waktu.
CREATE UNIQUE INDEX uq_pengiriman_barang_aktif ON pengiriman_barang_item(barang_id);
-- Catatan: total_bal/total_berat_kg/total_nilai_deal/rincian_grade (dulu Record<>
-- di FE) TIDAK disimpan sebagai kolom -- lihat v_pengiriman_summary &
-- v_pengiriman_rincian_grade di bagian VIEWS.

-- =============================================================================
-- AUDIT LOG -- belum ada implementasi nyata di FE saat ini meski disebut di RBAC
-- =============================================================================
CREATE TABLE audit_log (
  audit_id      BIGSERIAL PRIMARY KEY,
  table_name    VARCHAR(50) NOT NULL,
  record_id     VARCHAR(50) NOT NULL,
  action        audit_action_enum NOT NULL,
  changed_by    VARCHAR(20) REFERENCES users(user_id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values    JSONB,
  new_values    JSONB
);
CREATE INDEX ix_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX ix_audit_changed_at ON audit_log(changed_at);

-- =============================================================================
-- FILE ATTACHMENTS -- opsional, memanfaatkan kapasitas disk VPS (10TB) untuk
-- scan KTP petani, foto kondisi bal, PDF nota/surat jalan hasil cetak, dst.
-- File fisik disimpan di disk VPS (mis. /var/erp/uploads/...), DB hanya path.
-- =============================================================================
CREATE TABLE file_attachments (
  file_id       BIGSERIAL PRIMARY KEY,
  related_table VARCHAR(50) NOT NULL,
  related_id    VARCHAR(50) NOT NULL,
  file_path     TEXT NOT NULL,
  file_type     VARCHAR(30),
  file_size_kb  INT,
  uploaded_by   VARCHAR(20) REFERENCES users(user_id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_attachment_related ON file_attachments(related_table, related_id);

-- =============================================================================
-- STOCK OPNAME -- fungsi load/save sudah disiapkan di storage.ts tapi belum ada
-- UI yang memakainya di versi FE saat ini. Tabel disiapkan untuk fitur lanjutan.
-- =============================================================================
CREATE TABLE stock_opname_session (
  opname_id           VARCHAR(30) PRIMARY KEY,
  judul_opname        VARCHAR(120) NOT NULL,
  tanggal_opname      DATE NOT NULL,
  petugas_opname      VARCHAR(20) REFERENCES users(user_id),
  gudang_id           VARCHAR(20) REFERENCES gudang(gudang_id),
  target_grade        VARCHAR(5) REFERENCES grade_master(kode_grade),
  status              VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','proses','selesai')),
  catatan             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_opname_item (
  opname_id       VARCHAR(30) NOT NULL REFERENCES stock_opname_session(opname_id) ON DELETE CASCADE,
  barang_id       VARCHAR(30) NOT NULL REFERENCES barang(barang_id),
  status_fisik    VARCHAR(20) NOT NULL CHECK (status_fisik IN ('ditemukan','tidak_ditemukan','tambahan_baru')),
  waktu_scan      TIMESTAMPTZ,
  PRIMARY KEY (opname_id, barang_id)
);

-- =============================================================================
-- VIEWS -- semua angka agregat yang dulu rawan drift di FE dihitung live di sini
-- =============================================================================

-- Ringkasan transaksi (menggantikan kolom agregat header yang dihapus)
CREATE VIEW v_transaksi_summary AS
SELECT
  t.transaksi_id, t.petani_id, t.no_kupon, t.tanggal_transaksi,
  t.status_tahap, t.status_pembayaran, t.metode_pembayaran,
  COUNT(i.item_id)                              AS total_bal,
  COUNT(i.item_id) FILTER (WHERE i.status_timbang = 'selesai_timbang') AS bal_selesai_timbang,
  COALESCE(SUM(i.berat_kg), 0)                  AS berat_kg,
  COALESCE(SUM(i.total_kotor), 0)               AS total_harga_beli,
  COALESCE(SUM(i.potongan), 0)                  AS total_potongan,
  COALESCE(SUM(i.subtotal_bersih), 0)           AS harga_final
FROM transaksi_pembelian t
LEFT JOIN transaksi_item_bal i ON i.transaksi_id = t.transaksi_id
GROUP BY t.transaksi_id;

-- Statistik petani (menggantikan Petani.statistik yang dulu disimpan manual di FE)
CREATE MATERIALIZED VIEW mv_petani_statistik AS
SELECT
  p.petani_id,
  COUNT(DISTINCT b.barang_id)             AS total_setoran_bal,
  COALESCE(SUM(i.berat_kg), 0)            AS total_berat_kg,
  MAX(t.tanggal_transaksi)                AS kunjungan_terakhir,
  MODE() WITHIN GROUP (ORDER BY b.kode_grade) AS grade_dominan
FROM petani p
LEFT JOIN barang b ON b.petani_id = p.petani_id
LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
LEFT JOIN transaksi_pembelian t ON t.transaksi_id = b.transaksi_id
GROUP BY p.petani_id;
-- Refresh terjadwal (mis. tiap 5-10 menit via cron/pg_cron):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_petani_statistik;
-- (butuh UNIQUE INDEX di petani_id agar bisa CONCURRENTLY)
CREATE UNIQUE INDEX uq_mv_petani_statistik ON mv_petani_statistik(petani_id);

-- Ringkasan pengiriman (menggantikan total_bal/total_berat_kg/total_nilai_deal)
CREATE VIEW v_pengiriman_summary AS
SELECT
  pb.pengiriman_id,
  COUNT(pbi.barang_id)                                     AS total_bal,
  COALESCE(SUM(i.berat_kg), 0)                             AS total_berat_kg,
  COALESCE(SUM(COALESCE(pbi.harga_deal_per_kg,0) * i.berat_kg), 0) AS total_nilai_deal
FROM pengiriman_barang pb
LEFT JOIN pengiriman_barang_item pbi ON pbi.pengiriman_id = pb.pengiriman_id
LEFT JOIN barang b ON b.barang_id = pbi.barang_id
LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
GROUP BY pb.pengiriman_id;

-- Rincian per grade dalam satu pengiriman (menggantikan Record<grade,{bal,kg}>)
CREATE VIEW v_pengiriman_rincian_grade AS
SELECT
  pb.pengiriman_id, b.kode_grade,
  COUNT(*)                     AS bal,
  COALESCE(SUM(i.berat_kg), 0) AS kg
FROM pengiriman_barang pb
JOIN pengiriman_barang_item pbi ON pbi.pengiriman_id = pb.pengiriman_id
JOIN barang b                    ON b.barang_id = pbi.barang_id
JOIN transaksi_item_bal i        ON i.item_id = b.transaksi_item_id
GROUP BY pb.pengiriman_id, b.kode_grade;

-- Valuasi stok gudang saat ini per grade (dipakai Dashboard Analytic & Laporan Grade)
CREATE VIEW v_stok_valuasi_grade AS
SELECT
  b.gudang_id, b.kode_grade,
  COUNT(*) FILTER (WHERE b.status_stok = 'di_gudang')               AS bal_di_gudang,
  COALESCE(SUM(i.berat_kg) FILTER (WHERE b.status_stok = 'di_gudang'), 0) AS kg_di_gudang,
  COALESCE(SUM(i.total_kotor) FILTER (WHERE b.status_stok = 'di_gudang'), 0) AS valuasi_beli
FROM barang b
JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
GROUP BY b.gudang_id, b.kode_grade;

COMMIT;

-- =============================================================================
-- CATATAN OPERASIONAL VPS (2 vCPU / 8 GB RAM / 10 TB disk)
-- =============================================================================
-- - postgresql.conf disarankan mulai dari:
--     shared_buffers = 2GB, effective_cache_size = 6GB, work_mem = 32MB,
--     maintenance_work_mem = 256MB, max_connections = 60 (gunakan PgBouncer
--     di depan Postgres jika backend Node dijalankan dgn banyak instance/PM2 cluster).
-- - 10 TB disk jauh melebihi kebutuhan data relasional murni (ERP skala ini
--   biasanya <5-10 GB/tahun) -- alokasi sebesar ini masuk akal HANYA jika juga
--   dipakai menyimpan file_attachments (scan dokumen, foto bal, arsip PDF nota/
--   surat jalan) dan backup harian jangka panjang. Simpan file di filesystem
--   VPS (mis. /var/erp/uploads), bukan sebagai BLOB di kolom Postgres.
-- - Backup: pg_dump terjadwal (cron, harian) + salin off-site (rclone/rsync ke
--   storage terpisah) -- disk 10TB di VPS yang sama BUKAN backup yang aman.
-- =============================================================================
